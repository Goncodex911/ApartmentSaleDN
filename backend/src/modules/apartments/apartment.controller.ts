import { ApartmentService } from './apartment.service.js';
import {
  createApartmentSchema,
  updateApartmentSchema,
  updateStatusSchema,
  addSubListingSchema,
} from './apartment.validation.js';
import { AuthRequest } from '../../middlewares/auth.js';
import { asyncHandler } from '../../utils/async-handler.js';

const apartmentId = (req: AuthRequest) => String(req.params.id);

export class ApartmentController {
  // Upload nhiều hình ảnh/video lên Cloudinary
  static uploadMedia = asyncHandler(async (req, res) => {
    const data = await ApartmentService.uploadMedia(req.files as Express.Multer.File[]);
    res.status(200).json({ success: true, message: 'Tải media lên Cloudinary thành công', data });
  });

  // Tạo mới căn hộ (Chỉ Manager/Admin)
  static create = asyncHandler(async (req, res) => {
    const data = await ApartmentService.create(createApartmentSchema.parse(req.body), req.user!.id);
    res.status(201).json({ success: true, message: 'Thêm mới căn hộ thành công', data });
  });

  // Cập nhật thông tin căn hộ (cập nhật một phần, không ghi đè trường không gửi lên)
  static update = asyncHandler(async (req, res) => {
    const data = await ApartmentService.update(apartmentId(req), updateApartmentSchema.parse(req.body), req.user!);
    res.status(200).json({ success: true, message: 'Cập nhật căn hộ thành công', data });
  });

  // Cập nhật nhanh 1-Click trạng thái phòng (Story 2.2)
  static updateStatus = asyncHandler(async (req, res) => {
    const data = await ApartmentService.updateStatus(apartmentId(req), updateStatusSchema.parse(req.body), req.user!);
    res.status(200).json({ success: true, message: 'Cập nhật trạng thái phòng thành công', data });
  });

  // Đính kèm Nguồn tham chiếu vào Căn Master (Story 2.3)
  static addSubListing = asyncHandler(async (req, res) => {
    const data = await ApartmentService.addSubListing(apartmentId(req), addSubListingSchema.parse(req.body), req.user!);
    res.status(201).json({ success: true, message: 'Đính kèm nguồn tham chiếu thành công', data });
  });

  // Gỡ bỏ Nguồn tham chiếu khỏi Căn Master (Story 2.3)
  static removeSubListing = asyncHandler(async (req, res) => {
    const data = await ApartmentService.removeSubListing(apartmentId(req), String(req.params.subId), req.user!);
    res.status(200).json({ success: true, message: 'Gỡ bỏ nguồn tham chiếu thành công', data });
  });

  // Xóa căn hộ
  static delete = asyncHandler(async (req, res) => {
    await ApartmentService.delete(apartmentId(req), req.user!);
    res.status(200).json({ success: true, message: 'Xóa căn hộ thành công' });
  });

  // Lấy danh sách căn hộ (kèm phân trang, lọc và data masking theo role)
  static getAll = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, ...(await ApartmentService.findAll(req.query, req.user?.role)) });
  });

  // Xem chi tiết căn hộ theo ID (Tự động che dữ liệu theo role)
  static getById = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, data: await ApartmentService.findById(apartmentId(req), req.user?.role) });
  });
}
