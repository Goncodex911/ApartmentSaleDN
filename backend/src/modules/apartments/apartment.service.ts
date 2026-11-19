import { Apartment, IApartment, buildStatusFilter, isPrivilegedRole } from './apartment.model.js';
import { CreateApartmentInput, UpdateApartmentInput, UpdateStatusInput, AddSubListingInput } from './apartment.validation.js';
import { uploadBufferToCloudinary } from '../../config/cloudinary.js';
import { prepareLocation, withStreet } from './apartment-location.js';
import { Types } from 'mongoose';
import { maskPhonesInText, escapeRegex } from '../../utils/phone-text.js';
import { LeadMatchingService } from '../leads/lead-matching.service.js';
import { publishApartmentEvent } from '../realtime/realtime.bus.js';
import { buildLease, extendLease } from './apartment-lease.js';
import { AuditActor, AuditService } from '../audit/audit.service.js';
import { closeOpenReports } from '../reports/report-closing.js';

// Story 13.3: đối tượng ghi nhật ký
const auditTarget = (apartment: IApartment) => ({ type: 'APARTMENT' as const, id: apartment._id, title: apartment.title });


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
      contact && { ...contact, phone: contact.phone?.replace(/(\d{4})\d{3}(\d{3})/, '$1***$2'), note: undefined };
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
    const apartment = await Apartment.findById(id);
    if (!apartment) throw { status: 404, message: 'Không tìm thấy căn hộ' };
    if (user.role !== 'ADMIN' && apartment.managerId.toString() !== user.id) {
      throw { status: 403, message: 'Bạn không có quyền chỉnh sửa căn hộ này' };
    }
    if (data.location) await prepareLocation(data.location, apartment.location);
    const before = { status: apartment.status, price: apartment.price, flagged: Boolean(apartment.verification) };
    // Gán từng trường con (VD: attributes.elevator) thay vì ghi đè cả object (Object.assign)
    // → gửi một phần attributes/location/ownerContact không làm mất các trường còn lại
    // null = Quản lý xóa trắng ô trên form → gán undefined để Mongoose xóa hẳn trường ($unset) (Story 8.1)
    const assign = (path: string, value: unknown) => apartment.set(path, value === null ? undefined : value);
    for (const [key, value] of Object.entries(data)) {
      const isNestedObject = value !== null && typeof value === 'object' && !Array.isArray(value);
      if (!isNestedObject) {
        assign(key, value);
        continue;
      }
      for (const [subKey, subValue] of Object.entries(value)) assign(`${key}.${subKey}`, subValue);
    }
    // Quản lý đã mở form và lưu lại → coi như đã kiểm tra tin AI và báo lỗi của CTV (Story 13.6)
    apartment.set({ needsReview: false, reviewReason: undefined, verification: undefined });
    await apartment.save();
    await closeOpenReports(apartment._id, user.id, 'RESOLVED');
    // Story 11.4: báo CTV đang mở app khi đổi trạng thái hoặc giảm giá (tăng giá không báo)
    if (apartment.status !== before.status) {
      publishApartmentEvent('apartment.status', apartment, user.id);
      if (apartment.status === 'AVAILABLE') LeadMatchingService.runInBackground(apartment); // Story 11.1
    } else if (apartment.price < before.price) publishApartmentEvent('apartment.price', apartment, user.id);
    // Story 13.6: lưu sửa căn đã gỡ cờ "Chờ xác minh" mà chưa có sự kiện nào ở trên (VD tăng giá) → báo riêng để thẻ CTV bỏ nhãn
    else if (before.flagged) publishApartmentEvent('apartment.flagged', apartment, user.id);
    if (apartment.status !== before.status) AuditService.log(user, 'CHANGE_STATUS', auditTarget(apartment), { from: before.status, to: apartment.status });
    if (apartment.price !== before.price) AuditService.log(user, 'UPDATE_PRICE', auditTarget(apartment), { from: before.price, to: apartment.price });
    return this.maskApartment(apartment, user.role);
  }

  // Cập nhật nhanh 1-Click trạng thái phòng
  static async updateStatus(id: string, input: UpdateStatusInput, user: AuditActor) {
    const apartment = await Apartment.findById(id);
    if (!apartment) throw { status: 404, message: 'Không tìm thấy căn hộ' };
    if (user.role !== 'ADMIN' && apartment.managerId.toString() !== user.id) {
      throw { status: 403, message: 'Bạn không có quyền thay đổi trạng thái căn hộ này' };
    }
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
    if (closesReports) await closeOpenReports(apartment._id, user.id, 'RESOLVED');
    if (statusChanged) {
      publishApartmentEvent('apartment.status', apartment, user.id); // Story 11.4
      AuditService.log(user, 'CHANGE_STATUS', auditTarget(apartment), { from: previousStatus, to: apartment.status });
    }
    // Story 11.1: căn trống lại (VD Sắp trống → Trống, mở bán lại) cũng ghép với khách đang tìm
    if (statusChanged && apartment.status === 'AVAILABLE') LeadMatchingService.runInBackground(apartment);
    return this.maskApartment(apartment, user.role);
  }

  // Gia hạn hợp đồng thuê thêm 1 / 3 / 6 / 12 tháng (Story 11.5)
  static async renewLease(id: string, months: number, user: { id: string; role: string }) {
    const apartment = await Apartment.findById(id);
    if (!apartment) throw { status: 404, message: 'Không tìm thấy căn hộ' };
    if (user.role !== 'ADMIN' && apartment.managerId.toString() !== user.id) {
      throw { status: 403, message: 'Bạn không có quyền gia hạn hợp đồng căn hộ này' };
    }
    extendLease(apartment, months);
    await apartment.save();
    return this.maskApartment(apartment, user.role);
  }

  // Đính kèm Nguồn tham chiếu vào Căn Master
  static async addSubListing(id: string, input: AddSubListingInput, user: AuditActor) {
    const apartment = await Apartment.findById(id);
    if (!apartment) throw { status: 404, message: 'Không tìm thấy căn hộ' };
    if (user.role !== 'ADMIN' && apartment.managerId.toString() !== user.id) {
      throw { status: 403, message: 'Bạn không có quyền thêm nguồn tham chiếu cho căn hộ này' };
    }
    const { setAsMasterPrice, ...subListingData } = input;
    const previousPrice = apartment.price;
    if (setAsMasterPrice && subListingData.price) {
      apartment.price = subListingData.price;
    }
    apartment.subListings.push(subListingData as any);
    await apartment.save();
    if (apartment.price < previousPrice) publishApartmentEvent('apartment.price', apartment, user.id); // Story 11.4
    if (apartment.price !== previousPrice) AuditService.log(user, 'UPDATE_PRICE', auditTarget(apartment), { from: previousPrice, to: apartment.price });
    return this.maskApartment(apartment, user.role);
  }

  // Gỡ bỏ Nguồn tham chiếu khỏi Căn Master
  static async removeSubListing(id: string, subListingId: string, user: { id: string; role: string }) {
    const apartment = await Apartment.findById(id);
    if (!apartment) throw { status: 404, message: 'Không tìm thấy căn hộ' };
    if (user.role !== 'ADMIN' && apartment.managerId.toString() !== user.id) {
      throw { status: 403, message: 'Bạn không có quyền xóa nguồn tham chiếu này' };
    }
    apartment.subListings = apartment.subListings.filter(
      (sub: any) => sub._id.toString() !== subListingId
    );
    await apartment.save();
    return this.maskApartment(apartment, user.role);
  }

  // Xóa căn hộ
  static async delete(id: string, user: AuditActor) {
    const apartment = await Apartment.findById(id);
    if (!apartment) throw { status: 404, message: 'Không tìm thấy căn hộ' };
    if (user.role !== 'ADMIN' && apartment.managerId.toString() !== user.id) {
      throw { status: 403, message: 'Bạn không có quyền xóa căn hộ này' };
    }
    await apartment.deleteOne();
    AuditService.log(user, 'DELETE_APARTMENT', auditTarget(apartment), { price: apartment.price, status: apartment.status });
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
    const item = await Apartment.findById(id);
    if (!item) throw { status: 404, message: 'Không tìm thấy căn hộ' };
    return this.maskApartment(item, role);
  }
}
