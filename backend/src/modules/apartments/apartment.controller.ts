import { ApartmentService } from './apartment.service.js';
import { findSimilarApartment, summarizeDuplicate } from '../dedup/similar-apartment.js';
import {
  createApartmentSchema,
  updateApartmentSchema,
  updateStatusSchema,
  renewLeaseSchema,
  addSubListingSchema,
  uploadSignatureSchema,
  calibrateLocationSchema,
} from './apartment.validation.js';
import { AuthRequest } from '../../middlewares/auth.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { isPrivilegedRole } from './apartment.model.js';
import { SUBMISSION_MEDIA_FOLDER } from '../submissions/submission.model.js';
import { signDirectUploads } from '../../config/cloudinary.js';
import { usdToVndRate } from '../../config/currency.js';
import { AuditService, auditActor } from '../audit/audit.service.js';

const APARTMENT_MEDIA_FOLDER = 'apartment_sale/apartments';

const apartmentId = (req: AuthRequest) => String(req.params.id);

// Story 20.5: có gửi link Google Maps mà vị trí lưu không phải EXACT → link không đọc được (đã dùng toạ độ ước lượng)
const mapWarnings = (body: { location?: { mapUrl?: string | null } }, saved: { location?: { geoPrecision?: string } }) =>
  body.location?.mapUrl && saved.location?.geoPrecision !== 'EXACT' ? ['MAP_URL_UNRESOLVED'] : undefined;

export class ApartmentController {
  // Upload nhiều hình ảnh/video lên Cloudinary
  static uploadMedia = asyncHandler(async (req, res) => {
    const folder = isPrivilegedRole(req.user?.role) ? undefined : SUBMISSION_MEDIA_FOLDER;
    const data = await ApartmentService.uploadMedia(req.files as Express.Multer.File[], folder);
    res.status(200).json({ success: true, message: 'Tải media lên Cloudinary thành công', data });
  });

  // Story 10.2 / 14.5: chữ ký tải thẳng lên Cloudinary, 1 chữ ký = 1 file (tối đa 10 / lần), thư mục theo vai trò như /upload-media
  static uploadSignature = asyncHandler(async (req, res) => {
    const folder = isPrivilegedRole(req.user?.role) ? APARTMENT_MEDIA_FOLDER : SUBMISSION_MEDIA_FOLDER;
    const { count } = uploadSignatureSchema.parse(req.body ?? {});
    res.status(200).json({ success: true, data: signDirectUploads(folder, count) });
  });

  // Kiểm tra căn hộ nghi trùng trong kho (Story 13.10)
  static checkDuplicate = asyncHandler(async (req, res) => {
    const { title, price, location, attributes, ownerContact, excludeId } = req.body || {};
    if (!price || (!location?.street && !location?.address)) {
      res.status(200).json({ success: true, isDuplicate: false });
      return;
    }
    const match = await findSimilarApartment(
      {
        title,
        price: Number(price),
        location: location || {},
        attributes,
        ownerContact,
      },
      undefined,
      typeof excludeId === 'string' ? excludeId : undefined
    );

    if (!match) {
      res.status(200).json({ success: true, isDuplicate: false });
      return;
    }

    const privileged = isPrivilegedRole(req.user?.role);
    const matchedApartment = await summarizeDuplicate(match, privileged);
    res.status(200).json({
      success: true,
      isDuplicate: true,
      matchedApartment,
      reason: match.reason,
    });
  });

  // Tạo mới căn hộ (Chỉ Manager/Admin)
  static create = asyncHandler(async (req, res) => {
    const data = await ApartmentService.create(createApartmentSchema.parse(req.body), req.user!.id);
    AuditService.log(auditActor(req), 'CREATE_APARTMENT', { type: 'APARTMENT', id: data._id, title: data.title }, { price: data.price }); // Story 16.2
    res.status(201).json({ success: true, message: 'Thêm mới căn hộ thành công', data, warnings: mapWarnings(req.body, data) });
  });

  // Cập nhật thông tin căn hộ (cập nhật một phần, không ghi đè trường không gửi lên)
  static update = asyncHandler(async (req, res) => {
    const data = await ApartmentService.update(apartmentId(req), updateApartmentSchema.parse(req.body), auditActor(req));
    res.status(200).json({ success: true, message: 'Cập nhật căn hộ thành công', data, warnings: mapWarnings(req.body, data) });
  });

  // Cập nhật nhanh 1-Click trạng thái phòng (Story 2.2)
  static updateStatus = asyncHandler(async (req, res) => {
    const data = await ApartmentService.updateStatus(apartmentId(req), updateStatusSchema.parse(req.body), auditActor(req));
    res.status(200).json({ success: true, message: 'Cập nhật trạng thái phòng thành công', data });
  });

  // Gia hạn hợp đồng thuê (Story 11.5)
  static renewLease = asyncHandler(async (req, res) => {
    const { months } = renewLeaseSchema.parse(req.body);
    const data = await ApartmentService.renewLease(apartmentId(req), months, auditActor(req));
    res.status(200).json({ success: true, message: `Đã gia hạn thêm ${months} tháng`, data });
  });

  // Đính kèm Nguồn tham chiếu vào Căn Master (Story 2.3)
  static addSubListing = asyncHandler(async (req, res) => {
    const data = await ApartmentService.addSubListing(apartmentId(req), addSubListingSchema.parse(req.body), auditActor(req));
    res.status(201).json({ success: true, message: 'Đính kèm nguồn tham chiếu thành công', data });
  });

  // Gỡ bỏ Nguồn tham chiếu khỏi Căn Master (Story 2.3)
  static removeSubListing = asyncHandler(async (req, res) => {
    const data = await ApartmentService.removeSubListing(apartmentId(req), String(req.params.subId), auditActor(req));
    res.status(200).json({ success: true, message: 'Gỡ bỏ nguồn tham chiếu thành công', data });
  });

  // Xóa căn hộ
  static delete = asyncHandler(async (req, res) => {
    await ApartmentService.delete(apartmentId(req), auditActor(req));
    res.status(200).json({ success: true, message: 'Xóa căn hộ thành công' });
  });

  // Lấy danh sách căn hộ (kèm phân trang, lọc và data masking theo role)
  static getAll = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, ...(await ApartmentService.findAll(req.query, req.user?.role)) });
  });

  // Xem chi tiết căn hộ theo ID (Tự động che dữ liệu theo role)
  static getById = asyncHandler(async (req, res) => {
    const data = await ApartmentService.findById(apartmentId(req), req.user?.role);
    // Story 13.3: Quản lý / ADMIN nhận SĐT chủ nhà đầy đủ → ghi nhật ký (chạy ngầm)
    if (isPrivilegedRole(req.user?.role) && data?.ownerContact?.phone) AuditService.logContactView(auditActor(req), data);
    // meta.usdRate: bảng so sánh căn quy giá ra USD (Story 11.6)
    res.status(200).json({ success: true, data, meta: { usdRate: usdToVndRate() } });
  });

  // Story 17.6: Lấy danh sách căn chờ chuẩn hóa bản đồ
  static getMapQAPending = asyncHandler(async (req, res) => {
    const { zone, page, limit } = req.query as { zone?: string; page?: string; limit?: string };
    const data = await ApartmentService.getMapQAPending({
      zone,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.status(200).json({ success: true, data });
  });

  // Story 17.6: Căn chỉnh vị trí 1-chạm
  static calibrateLocation = asyncHandler(async (req, res) => {
    const id = apartmentId(req);
    const { coordinates } = calibrateLocationSchema.parse(req.body);
    const data = await ApartmentService.calibrateLocation(id, coordinates, auditActor(req));
    res.status(200).json({ success: true, message: 'Đã chuẩn hóa vị trí chính xác', data });
  });
}
