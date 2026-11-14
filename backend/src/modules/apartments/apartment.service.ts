import { Apartment, IApartment, buildStatusFilter, isPrivilegedRole } from './apartment.model.js';
import { CreateApartmentInput, UpdateApartmentInput, UpdateStatusInput, AddSubListingInput } from './apartment.validation.js';
import { uploadBufferToCloudinary } from '../../config/cloudinary.js';
import { GeocodingService } from '../search/geocoding.service.js';
import { Types } from 'mongoose';
import { maskPhonesInText, escapeRegex } from '../../utils/phone-text.js';
import { LeadMatchingService } from '../leads/lead-matching.service.js';

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
    if (isPrivilegedRole(role)) return item;

    const maskContact = (contact?: { phone?: string; note?: string }) =>
      contact && { ...contact, phone: contact.phone?.replace(/(\d{4})\d{3}(\d{3})/, '$1***$2'), note: undefined };
    const maskText = (text?: string) => (text ? maskPhonesInText(text) : text);

    item.title = maskText(item.title);
    item.description = maskText(item.description);
    item.ownerContact = maskContact(item.ownerContact);
    delete item.imageHashes; // Dữ liệu nội bộ của bộ khử trùng, không cần gửi ra ngoài
    item.subListings = (item.subListings || []).map((sub: any) => ({
      ...sub,
      ownerContact: maskContact(sub.ownerContact),
      rawContent: maskText(sub.rawContent),
    }));
    return item;
  }

  // Tải nhiều ảnh/video lên Cloudinary
  static async uploadMedia(files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw { status: 400, message: 'Vui lòng chọn ít nhất một file ảnh hoặc video' };
    }
    const uploadPromises = files.map((file) => {
      const resourceType = file.mimetype.startsWith('video/') ? 'video' : 'image';
      return uploadBufferToCloudinary(file.buffer, 'apartment_sale/apartments', resourceType);
    });
    const results = await Promise.all(uploadPromises);
    return results.map((r) => ({
      url: r.secure_url,
      publicId: r.public_id,
      format: r.format,
      resourceType: r.resource_type,
    }));
  }

  // Thêm mới căn hộ (Tự động Geocoding tọa độ nếu chưa có)
  static async create(data: CreateApartmentInput, managerId: string) {
    if (!data.location.coordinates || data.location.coordinates.length < 2) {
      const geo =
        GeocodingService.resolveCoordinates(data.location.address) ||
        GeocodingService.resolveCoordinates(data.location.district);
      if (geo) data.location.coordinates = geo.coordinates;
    }
    const apartment = await Apartment.create({
      ...data,
      managerId: new Types.ObjectId(managerId),
    });
    LeadMatchingService.runInBackground(apartment); // Story 6.3: báo CTV có khách phù hợp
    return apartment;
  }

  // Cập nhật căn hộ (Chỉ chủ căn hộ hoặc Admin)
  static async update(id: string, data: UpdateApartmentInput, user: { id: string; role: string }) {
    const apartment = await Apartment.findById(id);
    if (!apartment) throw { status: 404, message: 'Không tìm thấy căn hộ' };
    if (user.role !== 'ADMIN' && apartment.managerId.toString() !== user.id) {
      throw { status: 403, message: 'Bạn không có quyền chỉnh sửa căn hộ này' };
    }
    // Chỉ geocode lại khi địa chỉ/quận thực sự đổi — tránh ghi đè tọa độ chính xác bằng tọa độ ước lượng
    const addressChanged =
      (data.location?.address && data.location.address !== apartment.location.address) ||
      (data.location?.district && data.location.district !== apartment.location.district);
    if (data.location && addressChanged && !data.location.coordinates) {
      const geo =
        GeocodingService.resolveCoordinates(data.location.address || apartment.location.address) ||
        GeocodingService.resolveCoordinates(data.location.district || apartment.location.district);
      if (geo) data.location.coordinates = geo.coordinates;
    }
    // Gán từng trường con (VD: attributes.elevator) thay vì ghi đè cả object (Object.assign)
    // → gửi một phần attributes/location/ownerContact không làm mất các trường còn lại
    for (const [key, value] of Object.entries(data)) {
      const isNestedObject = value !== null && typeof value === 'object' && !Array.isArray(value);
      if (!isNestedObject) {
        apartment.set(key, value);
        continue;
      }
      for (const [subKey, subValue] of Object.entries(value)) apartment.set(`${key}.${subKey}`, subValue);
    }
    await apartment.save();
    return apartment;
  }

  // Cập nhật nhanh 1-Click trạng thái phòng
  static async updateStatus(id: string, input: UpdateStatusInput, user: { id: string; role: string }) {
    const apartment = await Apartment.findById(id);
    if (!apartment) throw { status: 404, message: 'Không tìm thấy căn hộ' };
    if (user.role !== 'ADMIN' && apartment.managerId.toString() !== user.id) {
      throw { status: 403, message: 'Bạn không có quyền thay đổi trạng thái căn hộ này' };
    }
    apartment.status = input.status;
    if (input.availableDate !== undefined) {
      apartment.availableDate = input.availableDate ? new Date(input.availableDate) : undefined;
    } else if (input.status === 'AVAILABLE') {
      apartment.availableDate = undefined;
    }
    await apartment.save();
    return apartment;
  }

  // Đính kèm Nguồn tham chiếu vào Căn Master
  static async addSubListing(id: string, input: AddSubListingInput, user: { id: string; role: string }) {
    const apartment = await Apartment.findById(id);
    if (!apartment) throw { status: 404, message: 'Không tìm thấy căn hộ' };
    if (user.role !== 'ADMIN' && apartment.managerId.toString() !== user.id) {
      throw { status: 403, message: 'Bạn không có quyền thêm nguồn tham chiếu cho căn hộ này' };
    }
    const { setAsMasterPrice, ...subListingData } = input;
    if (setAsMasterPrice && subListingData.price) {
      apartment.price = subListingData.price;
    }
    apartment.subListings.push(subListingData as any);
    await apartment.save();
    return apartment;
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
    return apartment;
  }

  // Xóa căn hộ
  static async delete(id: string, user: { id: string; role: string }) {
    const apartment = await Apartment.findById(id);
    if (!apartment) throw { status: 404, message: 'Không tìm thấy căn hộ' };
    if (user.role !== 'ADMIN' && apartment.managerId.toString() !== user.id) {
      throw { status: 403, message: 'Bạn không có quyền xóa căn hộ này' };
    }
    await apartment.deleteOne();
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
