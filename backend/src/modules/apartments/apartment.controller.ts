import { Response, NextFunction } from 'express';
import { ApartmentService } from './apartment.service.js';
import { AuthRequest } from '../../middlewares/auth.js';

export class ApartmentController {
  // Tạo mới căn hộ (Chỉ Manager/Admin)
  static async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const apartment = await ApartmentService.create(req.body, req.user!.id);
      res.status(201).json({
        success: true,
        message: 'Thêm mới căn hộ thành công',
        data: apartment,
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy danh sách căn hộ (Tự động che dữ liệu theo role)
  static async getAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const list = await ApartmentService.findAll({}, req.user?.role);
      res.status(200).json({ success: true, count: list.length, data: list });
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

  // Xóa căn hộ (Chỉ Manager/Admin)
  static async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const apartmentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await ApartmentService.delete(apartmentId);
      res.status(200).json({ success: true, message: 'Xóa căn hộ thành công' });
    } catch (error) {
      next(error);
    }
  }
}
