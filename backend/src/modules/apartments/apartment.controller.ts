import { Request, Response, NextFunction } from 'express';
import { ApartmentService } from './apartment.service.js';
import {
  createApartmentSchema,
  updateApartmentSchema,
  updateStatusSchema,
  addSubListingSchema,
} from './apartment.validation.js';
import { AuthRequest } from '../../middlewares/auth.js';

export class ApartmentController {
  // Upload nhiều hình ảnh/video lên Cloudinary
  static async uploadMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];
      const uploadedMedia = await ApartmentService.uploadMedia(files);
      res.status(200).json({
        success: true,
        message: 'Tải media lên Cloudinary thành công',
        data: uploadedMedia,
      });
    } catch (error) {
      next(error);
    }
  }

  // Tạo mới căn hộ (Chỉ Manager/Admin)
  static async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = createApartmentSchema.parse(req.body);
      const apartment = await ApartmentService.create(validatedData, req.user!.id);
      res.status(201).json({
        success: true,
        message: 'Thêm mới căn hộ thành công',
        data: apartment,
      });
    } catch (error) {
      next(error);
    }
  }

  // Cập nhật thông tin căn hộ
  static async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const apartmentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const validatedData = updateApartmentSchema.parse(req.body);
      const updated = await ApartmentService.update(apartmentId, validatedData, req.user!);
      res.status(200).json({
        success: true,
        message: 'Cập nhật căn hộ thành công',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  // Cập nhật nhanh 1-Click trạng thái phòng (Story 2.2)
  static async updateStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const apartmentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const validatedData = updateStatusSchema.parse(req.body);
      const updated = await ApartmentService.updateStatus(apartmentId, validatedData, req.user!);
      res.status(200).json({
        success: true,
        message: 'Cập nhật trạng thái phòng thành công',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  // Đính kèm Nguồn tham chiếu vào Căn Master (Story 2.3)
  static async addSubListing(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const apartmentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const validatedData = addSubListingSchema.parse(req.body);
      const updated = await ApartmentService.addSubListing(apartmentId, validatedData, req.user!);
      res.status(201).json({
        success: true,
        message: 'Đính kèm nguồn tham chiếu thành công',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  // Gỡ bỏ Nguồn tham chiếu khỏi Căn Master (Story 2.3)
  static async removeSubListing(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const apartmentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const subListingId = Array.isArray(req.params.subId) ? req.params.subId[0] : req.params.subId;
      const updated = await ApartmentService.removeSubListing(apartmentId, subListingId, req.user!);
      res.status(200).json({
        success: true,
        message: 'Gỡ bỏ nguồn tham chiếu thành công',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  // Xóa căn hộ
  static async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const apartmentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await ApartmentService.delete(apartmentId, req.user!);
      res.status(200).json({ success: true, message: 'Xóa căn hộ thành công' });
    } catch (error) {
      next(error);
    }
  }

  // Lấy danh sách căn hộ (kèm phân trang, lọc và data masking theo role)
  static async getAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ApartmentService.findAll(req.query, req.user?.role);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  // Xem chi tiết căn hộ theo ID (Tự động che dữ liệu theo role)
  static async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const apartmentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const apartment = await ApartmentService.findById(apartmentId, req.user?.role);
      res.status(200).json({ success: true, data: apartment });
    } catch (error) {
      next(error);
    }
  }
}
