import { asyncHandler } from '../../utils/async-handler.js';
import { AdminService } from './admin.service.js';
import { brokerPerformance, brokerPerformanceQuerySchema } from './broker-performance.service.js';
import { SystemConfigService, telegramSourceSchema, toggleSourceSchema, updateSettingsSchema } from './system-config.service.js';

export class AdminController {
  // [ADMIN] GET /api/v1/admin/dashboard-stats — số liệu trang Quản trị (Story 13.1)
  static dashboardStats = asyncHandler(async (_req, res) => {
    res.status(200).json({ success: true, data: await AdminService.dashboardStats() });
  });

  // [ADMIN] GET /api/v1/admin/broker-performance?range=this_month|last_month|all — bảng xếp hạng CTV (Story 13.4)
  static brokerPerformance = asyncHandler(async (req, res) => {
    const { range } = brokerPerformanceQuerySchema.parse(req.query);
    res.status(200).json({ success: true, data: await brokerPerformance(range) });
  });

  // [ADMIN] Cấu hình hệ thống (Story 13.5)
  static getSettings = asyncHandler(async (_req, res) => {
    res.status(200).json({ success: true, data: await SystemConfigService.getForAdmin() });
  });

  static updateSettings = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, message: 'Đã lưu cấu hình', data: await SystemConfigService.update(updateSettingsSchema.parse(req.body)) });
  });

  static addTelegramSource = asyncHandler(async (req, res) => {
    res.status(201).json({ success: true, message: 'Đã thêm nhóm nguồn', data: await SystemConfigService.addTelegramSource(telegramSourceSchema.parse(req.body)) });
  });

  static toggleTelegramSource = asyncHandler(async (req, res) => {
    const { active } = toggleSourceSchema.parse(req.body);
    res.status(200).json({ success: true, data: await SystemConfigService.toggleTelegramSource(String(req.params.chatId), active) });
  });

  static removeTelegramSource = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, message: 'Đã xóa nhóm nguồn', data: await SystemConfigService.removeTelegramSource(String(req.params.chatId)) });
  });
}
