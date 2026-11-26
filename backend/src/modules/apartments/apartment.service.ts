import { Apartment, IApartment, buildStatusFilter, isPrivilegedRole } from './apartment.model.js';
import { CreateApartmentInput, UpdateApartmentInput, UpdateStatusInput, AddSubListingInput } from './apartment.validation.js';
import { uploadBufferToCloudinary } from '../../config/cloudinary.js';
import { prepareLocation, withStreet } from './apartment-location.js';
import { Types } from 'mongoose';
import { maskPhone, maskPhonesInText, escapeRegex } from '../../utils/phone-text.js';
import { LeadMatchingService } from '../leads/lead-matching.service.js';
import { publishApartmentEvent } from '../realtime/realtime.bus.js';
import { buildLease, extendLease } from './apartment-lease.js';
import { AuditActor, AuditService } from '../audit/audit.service.js';
import { diffFields, snapshotFields } from '../audit/audit-diff.js';
import { closeOpenReports, refreshVerification, TRUST_STEP } from '../reports/report-closing.js';
import type { ReportReason } from '../reports/listing-report.model.js';
import { isValidDanangCoordinates } from '../../utils/google-maps.js';

// Story 13.3: đối tượng ghi nhật ký
const auditTarget = (apartment: IApartment) => ({ type: 'APARTMENT' as const, id: apartment._id, title: apartment.title });

// Story 14.3 — chung kho: mọi Quản lý / ADMIN thao tác được mọi căn (route đã chặn CTV bằng requireRoles)
async function findOr404(id: string) {
  const apartment = await Apartment.findById(id);
  if (!apartment) throw { status: 404, message: 'Không tìm thấy căn hộ' };
  return apartment;
}

// Chỉ nhận giá trị chuỗi: qs cho phép ?status[$ne]=X tạo object → chèn toán tử MongoDB vào filter
const queryText = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);

export interface ApartmentFilterQuery {
  page?: number | string;
  limit?: number | string;
  district?: string;
  minPrice?: number | string;
  maxPrice?: number | string;
  furnishing?: string;
  status?: string;
  elevator?: boolean | string;
  allowPets?: boolean | string;
}

export class ApartmentService {
  /**
   * Data Masking: Che giấu SĐT và xóa ghi chú mật của chủ nhà nếu không phải Admin/Manager (Story 1.2).
   * Che cả SĐT nằm trong văn bản tự do (title, description, rawContent): tin nhập từ Telegram/Zalo
   * lưu nguyên văn bài đăng gốc nên luôn chứa SĐT chủ nhà.
   */
  static maskApartment(doc: IApartment | any, role?: string): any {
    if (!doc) return null;
    const item = doc.toObject ? doc.toObject() : { ...doc };
    // Story 8.2: cọc & hoa hồng đã bỏ — căn cũ trong DB vẫn còn 2 trường này (query .lean()) nên lọc ở đây cho mọi vai trò
    delete item.deposit;
    delete item.commission;
    item.location = withStreet(item.location);
    if (isPrivilegedRole(role)) return item;

    const maskContact = (contact?: { phone?: string; note?: string }) =>
      contact && { ...contact, phone: maskPhone(contact.phone), note: undefined };
    const maskText = (text?: string) => (text ? maskPhonesInText(text) : text);

    item.title = maskText(item.title);
    item.description = maskText(item.description);
    item.ownerContact = maskContact(item.ownerContact);
    delete item.imageHashes; // Dữ liệu nội bộ của bộ khử trùng, không cần gửi ra ngoài
    delete item.needsReview; // Cờ kiểm duyệt nội bộ của Quản lý
    delete item.submittedBy;
    delete item.lease; // Hợp đồng + thông tin khách thuê chỉ Quản lý xem (Story 11.5)
    delete item.reviewReason;
    item.subListings = (item.subListings || []).map((sub: any) => ({
      ...sub,
      ownerContact: maskContact(sub.ownerContact),
      rawContent: maskText(sub.rawContent),
    }));
    return item;
  }

  // Tải nhiều ảnh/video lên Cloudinary
  // folder: ảnh CTV đăng tin để riêng (Story 8.6) → dọn ảnh tin bị từ chối / rút mà không đụng ảnh căn trong kho
  static async uploadMedia(files: Express.Multer.File[], folder = 'apartment_sale/apartments') {
    if (!files || files.length === 0) {
      throw { status: 400, message: 'Vui lòng chọn ít nhất một file ảnh hoặc video' };
    }
    const uploadPromises = files.map((file) => {
      const resourceType = file.mimetype.startsWith('video/') ? 'video' : 'image';
      return uploadBufferToCloudinary(file.buffer, folder, resourceType);
    });
    const results = await Promise.all(uploadPromises);
    return results.map((r) => ({
      url: r.secure_url,
      publicId: r.public_id,
      format: r.format,
      resourceType: r.resource_type,
    }));
  }

  // Thêm mới căn hộ (chuẩn hóa vị trí, lấy tọa độ từ link map hoặc ước lượng)
  // extra: dữ liệu nội bộ khi duyệt tin CTV (Story 8.6) — không nhận từ request
  static async create(data: CreateApartmentInput, managerId: string, extra: { submittedBy?: string; imageHashes?: string[] } = {}) {
    await prepareLocation(data.location);
    const apartment = await Apartment.create({
      ...data,
      ...extra,
      managerId: new Types.ObjectId(managerId),
    });
    LeadMatchingService.runInBackground(apartment); // Story 6.3: báo CTV có khách phù hợp
    // Story 11.4: báo CTV đang mở app có căn mới (bỏ qua căn nhập thẳng trạng thái Đã cọc / Đã thuê)
    if (apartment.status === 'AVAILABLE' || apartment.status === 'UPCOMING') publishApartmentEvent('apartment.created', apartment, managerId);
    return apartment;
  }

  // Cập nhật căn hộ (Chỉ chủ căn hộ hoặc Admin)
  static async update(id: string, data: UpdateApartmentInput, user: AuditActor) {
    const apartment = await findOr404(id);
    if (data.location) await prepareLocation(data.location, apartment.location);
    const before = {
      status: apartment.status,
      price: apartment.price,
      images: JSON.stringify(apartment.images),
      owner: JSON.stringify([apartment.ownerContact?.phone, apartment.ownerContact?.name]),
    };
    // Gán từng trường con (VD: attributes.elevator) thay vì ghi đè cả object (Object.assign)
    // → gửi một phần attributes/location/ownerContact không làm mất các trường còn lại
    // null = Quản lý xóa trắng ô trên form → gán undefined để Mongoose xóa hẳn trường ($unset) (Story 8.1)
    const updates: [string, unknown][] = [];
    for (const [key, value] of Object.entries(data)) {
      const isNestedObject = value !== null && typeof value === 'object' && !Array.isArray(value);
      if (!isNestedObject) updates.push([key, value]);
      else for (const [subKey, subValue] of Object.entries(value)) updates.push([`${key}.${subKey}`, subValue]);
    }
    const fieldsBefore = snapshotFields(apartment, updates.map(([path]) => path)); // Story 16.2: nhật ký trường đã đổi
    for (const [path, value] of updates) apartment.set(path, value === null ? undefined : value);
    // Quản lý đã mở form và lưu lại → coi như đã kiểm tra tin AI (Story 13.6)
    apartment.set({ needsReview: false, reviewReason: undefined });
    await apartment.save();
    await this.closeFixedReports(apartment, user.id, before);
    // Story 11.4: báo CTV đang mở app khi đổi trạng thái hoặc giảm giá (tăng giá không báo)
    if (apartment.status !== before.status) {
      publishApartmentEvent('apartment.status', apartment, user.id);
      if (apartment.status === 'AVAILABLE') LeadMatchingService.runInBackground(apartment); // Story 11.1
    } else if (apartment.price < before.price) publishApartmentEvent('apartment.price', apartment, user.id);
    if (apartment.status !== before.status) AuditService.log(user, 'CHANGE_STATUS', auditTarget(apartment), { from: before.status, to: apartment.status });
    if (apartment.price !== before.price) AuditService.log(user, 'UPDATE_PRICE', auditTarget(apartment), { from: before.price, to: apartment.price });
    AuditService.logApartmentUpdate(user, auditTarget(apartment), diffFields(apartment, fieldsBefore));
    return this.maskApartment(apartment, user.role);
  }

  /**
   * Story 14.6: lưu form chỉ đóng báo lỗi đúng phần đã sửa (giá → "Chủ tăng giá", ảnh → "Ảnh không đúng",
   * SĐT / tên chủ → "Không liên lạc được"); chuyển Đã cọc / Đã thuê → đóng tất cả. Người báo đúng +5, nhãn "Chờ xác minh" tính lại.
   */
  private static async closeFixedReports(apartment: IApartment, actorId: string, before: { price: number; images: string; owner: string }) {
    const taken = apartment.status === 'DEPOSITED' || apartment.status === 'RENTED';
    const fixed: ReportReason[] = [];
    if (apartment.price !== before.price) fixed.push('PRICE_CHANGED');
    if (JSON.stringify(apartment.images) !== before.images) fixed.push('WRONG_PHOTOS');
    if (JSON.stringify([apartment.ownerContact?.phone, apartment.ownerContact?.name]) !== before.owner) fixed.push('UNREACHABLE');
    if (!taken && !fixed.length) return;
    const closed = await closeOpenReports(apartment._id, actorId, 'RESOLVED', { reasons: taken ? undefined : fixed, trustDelta: TRUST_STEP });
    if (closed) apartment.verification = (await refreshVerification(apartment)).verification; // Đồng bộ bản trong bộ nhớ (đã ghi DB)
  }

  // Cập nhật nhanh 1-Click trạng thái phòng
  static async updateStatus(id: string, input: UpdateStatusInput, user: AuditActor) {
    const apartment = await findOr404(id);
    const previousStatus = apartment.status;
    apartment.status = input.status;
    if (input.availableDate !== undefined) {
      apartment.availableDate = input.availableDate ? new Date(input.availableDate) : undefined;
    } else if (input.status === 'AVAILABLE') {
      apartment.availableDate = undefined;
    }
    if (input.lease) apartment.lease = buildLease(input.lease); // Story 11.5 (cũng dùng để bổ sung hợp đồng cho căn cũ)
    const statusChanged = apartment.isModified('status');
    const closesReports = input.status === 'DEPOSITED' || input.status === 'RENTED'; // Story 13.6: căn hết trống → báo lỗi tự đóng
    if (closesReports) apartment.verification = undefined;
    await apartment.save();
    if (closesReports) await closeOpenReports(apartment._id, user.id, 'RESOLVED', { trustDelta: TRUST_STEP }); // Story 14.6: người báo đúng +5
    if (statusChanged) {
      publishApartmentEvent('apartment.status', apartment, user.id); // Story 11.4
      AuditService.log(user, 'CHANGE_STATUS', auditTarget(apartment), { from: previousStatus, to: apartment.status });
    }
    // Story 11.1: căn trống lại (VD Sắp trống → Trống, mở bán lại) cũng ghép với khách đang tìm
    if (statusChanged && apartment.status === 'AVAILABLE') LeadMatchingService.runInBackground(apartment);
    return this.maskApartment(apartment, user.role);
  }

  // Gia hạn hợp đồng thuê thêm 1 / 3 / 6 / 12 tháng (Story 11.5)
  static async renewLease(id: string, months: number, user: AuditActor) {
    const apartment = await findOr404(id);
    extendLease(apartment, months);
    await apartment.save();
    AuditService.log(user, 'RENEW_LEASE', auditTarget(apartment), { months });
    return this.maskApartment(apartment, user.role);
  }

  // Đính kèm Nguồn tham chiếu vào Căn Master
  static async addSubListing(id: string, input: AddSubListingInput, user: AuditActor) {
    const apartment = await findOr404(id);
    const { setAsMasterPrice, ...subListingData } = input;
    const previousPrice = apartment.price;
    if (setAsMasterPrice && subListingData.price) {
      apartment.price = subListingData.price;
    }
    apartment.subListings.push(subListingData as any);
    await apartment.save();
    AuditService.log(user, 'ADD_SUBLISTING', auditTarget(apartment), { sourceType: subListingData.sourceType, sourceName: subListingData.sourceName });
    if (apartment.price < previousPrice) publishApartmentEvent('apartment.price', apartment, user.id); // Story 11.4
    if (apartment.price !== previousPrice) AuditService.log(user, 'UPDATE_PRICE', auditTarget(apartment), { from: previousPrice, to: apartment.price });
    return this.maskApartment(apartment, user.role);
  }

  // Gỡ bỏ Nguồn tham chiếu khỏi Căn Master
  static async removeSubListing(id: string, subListingId: string, user: AuditActor) {
    const apartment = await findOr404(id);
    apartment.subListings = apartment.subListings.filter(
      (sub: any) => sub._id.toString() !== subListingId
    );
    await apartment.save();
    AuditService.log(user, 'REMOVE_SUBLISTING', auditTarget(apartment), { subListingId });
    return this.maskApartment(apartment, user.role);
  }

  // Story 16.7: xóa = chuyển vào Thùng rác (Admin khôi phục được trong 30 ngày); `bulk` = xóa hàng loạt từ trang Kho tồn
  static async delete(id: string, user: AuditActor, bulk = false) {
    const apartment = await findOr404(id);
    await closeOpenReports(apartment._id, user.id, 'DISMISSED'); // Story 14.6: không để báo lỗi mồ côi, không đổi điểm
    await Apartment.updateOne({ _id: apartment._id }, { $set: { deletedAt: new Date(), deletedBy: user.id } }, { timestamps: false });
    AuditService.log(user, 'DELETE_APARTMENT', auditTarget(apartment), { price: apartment.price, status: apartment.status, ...(bulk && { bulk: true }) });
    return true;
  }

  // Tìm kiếm, phân trang và lọc danh sách căn hộ
  static async findAll(query: ApartmentFilterQuery, role?: string) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: any = {};
    const status = queryText(query.status);
    const district = queryText(query.district);
    const furnishing = queryText(query.furnishing);
    const minPrice = Number(queryText(query.minPrice));
    const maxPrice = Number(queryText(query.maxPrice));

    // CTV/khách không bao giờ thấy căn đã cho thuê (kể cả khi tự truyền status=RENTED)
    const statusFilter = buildStatusFilter(status, role);
    if (statusFilter) filter.status = statusFilter;

    if (district) filter['location.district'] = { $regex: escapeRegex(district), $options: 'i' };
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = minPrice;
      if (maxPrice) filter.price.$lte = maxPrice;
    }
    if (furnishing) filter['attributes.furnishing'] = furnishing;
    if (query.elevator !== undefined) filter['attributes.elevator'] = String(query.elevator) === 'true';
    if (query.allowPets !== undefined) filter['attributes.allowPets'] = String(query.allowPets) === 'true';

    const [items, total] = await Promise.all([
      Apartment.find(filter).select('-imageHashes').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Apartment.countDocuments(filter),
    ]);

    const maskedItems = items.map((item) => this.maskApartment(item, role));
    return {
      items: maskedItems,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  // Lấy chi tiết căn hộ
  static async findById(id: string, role?: string) {
    return this.maskApartment(await findOr404(id), role);
  }

  // Story 17.6: Danh sách căn cần rà soát vị trí (geoPrecision !== 'EXACT')
  static async getMapQAPending(params: { zone?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 30));
    const skip = (page - 1) * limit;

    const baseFilter: any = { deletedAt: null };
    if (params.zone) baseFilter['location.zone'] = params.zone;

    const pendingFilter = {
      ...baseFilter,
      $or: [
        { 'location.geoPrecision': { $ne: 'EXACT' } },
        { 'location.geoPrecision': { $exists: false } },
        // Mảng tọa độ mặc định là [] (không phải thiếu trường) → kiểm tra phần tử thứ 2 (Story 19.3)
        { 'location.coordinates.1': { $exists: false } },
      ],
    };

    const [apartments, pendingCount, totalCount, exactCount] = await Promise.all([
      Apartment.find(pendingFilter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('_id title price location attributes images hiddenImages status updatedAt'), // Story 19.3: trường ảnh là images (không phải media)
      Apartment.countDocuments(pendingFilter),
      // Tiến độ theo đúng khu vực đang lọc
      Apartment.countDocuments(baseFilter),
      Apartment.countDocuments({ ...baseFilter, 'location.geoPrecision': 'EXACT' }),
    ]);

    return {
      apartments,
      totalCount,
      exactCount,
      pendingCount,
      page,
      limit,
    };
  }

  // Story 17.6: Hiệu chỉnh nhanh vị trí chính xác của căn
  static async calibrateLocation(id: string, coordinates: [number, number], user: AuditActor) {
    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
      throw { status: 400, message: 'Tọa độ không hợp lệ' };
    }
    const [lng, lat] = coordinates;
    if (!isValidDanangCoordinates(lng, lat)) {
      throw { status: 400, message: 'Vị trí phải nằm trong khu vực Đà Nẵng' };
    }

    const apartment = await findOr404(id);
    const oldCoords = apartment.location?.coordinates;
    apartment.location.coordinates = [Number(lng.toFixed(6)), Number(lat.toFixed(6))];
    apartment.location.geoPrecision = 'EXACT';
    await apartment.save();

    AuditService.log(user, 'UPDATE_APARTMENT', auditTarget(apartment), {
      action: 'CALIBRATE_LOCATION',
      from: oldCoords,
      to: apartment.location.coordinates,
    });

    return apartment;
  }
}
