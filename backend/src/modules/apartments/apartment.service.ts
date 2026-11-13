import { Apartment, IApartment } from './apartment.model.js';
import { CreateApartmentInput, UpdateApartmentInput, UpdateStatusInput, AddSubListingInput } from './apartment.validation.js';
import { uploadBufferToCloudinary } from '../../config/cloudinary.js';
import { Types } from 'mongoose';

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
   * Data Masking (Kế thừa từ Story 1.2 & Mở rộng cho Story 2.3):
   * Che giấu SĐT và xóa ghi chú mật của chủ nhà ở cả Căn Master và toàn bộ mảng SubListings nếu là CTV
   */
  static maskApartment(doc: IApartment | any, role?: string): any {
    if (!doc) return null;
    const item = doc.toObject ? doc.toObject() : { ...doc };

    const isPrivileged = role === 'ADMIN' || role === 'MANAGER';
    if (!isPrivileged) {
      // 1. Che thông tin chủ nhà của Căn Master
      if (item.ownerContact) {
        if (item.ownerContact.phone) {
          item.ownerContact.phone = item.ownerContact.phone.replace(/(\d{4})\d{3}(\d{3})/, '$1***$2');
        }
        delete item.ownerContact.note;
      }

      // 2. Che thông tin chủ nhà ở tất cả các nguồn tham chiếu (SubListings)
      if (Array.isArray(item.subListings)) {
        item.subListings = item.subListings.map((sub: any) => {
          const subObj = sub.toObject ? sub.toObject() : { ...sub };
          if (subObj.ownerContact) {
            if (subObj.ownerContact.phone) {
              subObj.ownerContact.phone = subObj.ownerContact.phone.replace(/(\d{4})\d{3}(\d{3})/, '$1***$2');
            }
            delete subObj.ownerContact.note;
          }
          return subObj;
        });
      }
    }

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

  // Thêm mới căn hộ (Manager / Admin)
  static async create(data: CreateApartmentInput, managerId: string) {
    const apartment = await Apartment.create({
      ...data,
      managerId: new Types.ObjectId(managerId),
    });
    return apartment;
  }

  // Cập nhật căn hộ (Chỉ chủ căn hộ hoặc Admin)
  static async update(id: string, data: UpdateApartmentInput, user: { id: string; role: string }) {
    const apartment = await Apartment.findById(id);
    if (!apartment) {
      throw { status: 404, message: 'Không tìm thấy căn hộ' };
    }

    if (user.role !== 'ADMIN' && apartment.managerId.toString() !== user.id) {
      throw { status: 403, message: 'Bạn không có quyền chỉnh sửa căn hộ này' };
    }

    Object.assign(apartment, data);
    await apartment.save();
    return apartment;
  }

  // Cập nhật nhanh 1-Click trạng thái phòng (Story 2.2)
  static async updateStatus(id: string, input: UpdateStatusInput, user: { id: string; role: string }) {
    const apartment = await Apartment.findById(id);
    if (!apartment) {
      throw { status: 404, message: 'Không tìm thấy căn hộ' };
    }

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

  // Đính kèm Nguồn tham chiếu vào Căn Master (Story 2.3)
  static async addSubListing(id: string, input: AddSubListingInput, user: { id: string; role: string }) {
    const apartment = await Apartment.findById(id);
    if (!apartment) {
      throw { status: 404, message: 'Không tìm thấy căn hộ' };
    }

    if (user.role !== 'ADMIN' && apartment.managerId.toString() !== user.id) {
      throw { status: 403, message: 'Bạn không có quyền thêm nguồn tham chiếu cho căn hộ này' };
    }

    const { setAsMasterPrice, ...subListingData } = input;

    // Tùy chọn: Chọn giá này làm giá đại diện cho căn Master
    if (setAsMasterPrice && subListingData.price) {
      apartment.price = subListingData.price;
    }

    apartment.subListings.push(subListingData as any);
    await apartment.save();

    return apartment;
  }

  // Gỡ bỏ Nguồn tham chiếu khỏi Căn Master (Story 2.3)
  static async removeSubListing(id: string, subListingId: string, user: { id: string; role: string }) {
    const apartment = await Apartment.findById(id);
    if (!apartment) {
      throw { status: 404, message: 'Không tìm thấy căn hộ' };
    }

    if (user.role !== 'ADMIN' && apartment.managerId.toString() !== user.id) {
      throw { status: 403, message: 'Bạn không có quyền xóa nguồn tham chiếu này' };
    }

    apartment.subListings = apartment.subListings.filter(
      (sub: any) => sub._id.toString() !== subListingId
    );

    await apartment.save();
    return apartment;
  }

  // Xóa căn hộ (Chỉ chủ căn hộ hoặc Admin)
  static async delete(id: string, user: { id: string; role: string }) {
    const apartment = await Apartment.findById(id);
    if (!apartment) {
      throw { status: 404, message: 'Không tìm thấy căn hộ' };
    }

    if (user.role !== 'ADMIN' && apartment.managerId.toString() !== user.id) {
      throw { status: 403, message: 'Bạn không có quyền xóa căn hộ này' };
    }

    await Apartment.findByIdAndDelete(id);
    return true;
  }

  // Tìm kiếm, phân trang và lọc danh sách căn hộ (kèm tự động ẩn RENTED cho CTV)
  static async findAll(query: ApartmentFilterQuery, role?: string) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: any = {};

    // Xử lý bộ lọc trạng thái (Story 2.2)
    const isPrivileged = role === 'ADMIN' || role === 'MANAGER';
    if (query.status) {
      if (query.status === 'ALL') {
        if (!isPrivileged) {
          filter.status = { $ne: 'RENTED' };
        }
      } else {
        filter.status = query.status;
      }
    } else {
      if (!isPrivileged) {
        filter.status = { $in: ['AVAILABLE', 'UPCOMING', 'DEPOSITED'] };
      }
    }

    if (query.district) {
      filter['location.district'] = { $regex: query.district, $options: 'i' };
    }

    if (query.minPrice || query.maxPrice) {
      filter.price = {};
      if (query.minPrice) filter.price.$gte = Number(query.minPrice);
      if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
    }

    if (query.furnishing) {
      filter['attributes.furnishing'] = query.furnishing;
    }

    if (query.elevator !== undefined) {
      filter['attributes.elevator'] = query.elevator === 'true' || query.elevator === true;
    }

    if (query.allowPets !== undefined) {
      filter['attributes.allowPets'] = query.allowPets === 'true' || query.allowPets === true;
    }

    const [items, total] = await Promise.all([
      Apartment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Apartment.countDocuments(filter),
    ]);

    const maskedItems = items.map((item) => this.maskApartment(item, role));

    return {
      items: maskedItems,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Lấy chi tiết căn hộ
  static async findById(id: string, role?: string) {
    const item = await Apartment.findById(id);
    if (!item) {
      throw { status: 404, message: 'Không tìm thấy căn hộ' };
    }
    return this.maskApartment(item, role);
  }
}
