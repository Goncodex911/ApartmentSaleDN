import { Apartment, IApartment } from './apartment.model.js';
import { Types } from 'mongoose';

export class ApartmentService {
  /**
   * Che giấu thông tin nhạy cảm của chủ nhà dựa theo quyền hạn của người dùng (Data Masking)
   * - Quản lý / Admin: Nhìn thấy 100% SĐT và ghi chú riêng.
   * - CTV / Khách vãng lai: Che 3 số giữa của SĐT (0912***678) và loại bỏ hoàn toàn ghi chú mật.
   */
  static maskApartment(doc: IApartment | any, role?: string): any {
    if (!doc) return null;
    const item = doc.toObject ? doc.toObject() : { ...doc };

    const isPrivileged = role === 'ADMIN' || role === 'MANAGER';
    if (!isPrivileged && item.ownerContact) {
      if (item.ownerContact.phone) {
        // Che 3 số ở giữa: 0912345678 -> 0912***678
        item.ownerContact.phone = item.ownerContact.phone.replace(/(\d{4})\d{3}(\d{3})/, '$1***$2');
      }
      delete item.ownerContact.note;
    }

    return item;
  }

  // Thêm mới căn hộ (Chỉ Manager / Admin)
  static async create(data: Partial<IApartment>, managerId: string) {
    const apartment = await Apartment.create({
      ...data,
      managerId: new Types.ObjectId(managerId),
    });
    return apartment;
  }

  // Lấy danh sách căn hộ (kèm tự động mask theo role)
  static async findAll(filter: any = {}, role?: string) {
    const list = await Apartment.find(filter).sort({ createdAt: -1 }).limit(50);
    return list.map((item) => this.maskApartment(item, role));
  }

  // Lấy chi tiết một căn hộ theo ID (kèm tự động mask theo role)
  static async findById(id: string, role?: string) {
    const item = await Apartment.findById(id);
    if (!item) {
      throw { status: 404, message: 'Không tìm thấy căn hộ' };
    }
    return this.maskApartment(item, role);
  }

  // Xóa căn hộ
  static async delete(id: string) {
    const item = await Apartment.findByIdAndDelete(id);
    if (!item) {
      throw { status: 404, message: 'Không tìm thấy căn hộ để xóa' };
    }
    return true;
  }
}

