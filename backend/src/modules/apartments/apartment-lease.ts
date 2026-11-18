import { Types } from 'mongoose';
import { IApartment, ILease } from './apartment.model.js';
import { UpdateStatusInput } from './apartment.validation.js';

/**
 * Cộng tháng, giữ ngày trong tháng; tháng đích ngắn hơn thì lấy ngày cuối tháng
 * (31/01 + 1 tháng → 28/02 hoặc 29/02, không trôi sang 03/03 như Date.setMonth).
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

/** Hợp đồng mới khi Quản lý đánh dấu Đã cho thuê (Story 11.5). */
export function buildLease(input: NonNullable<UpdateStatusInput['lease']>): ILease {
  const startDate = new Date(input.startDate);
  return {
    startDate,
    durationMonths: input.durationMonths,
    endDate: addMonths(startDate, input.durationMonths),
    closedBy: input.closedBy ? new Types.ObjectId(input.closedBy) : undefined,
    tenantName: input.tenantName || undefined,
    tenantPhone: input.tenantPhone || undefined,
  };
}

/** Gia hạn: cộng thêm tháng vào ngày hết hạn và xoá dấu đã nhắc để chu kỳ nhắc mới chạy lại. */
export function extendLease(apartment: IApartment, months: number): void {
  const lease = apartment.lease;
  if (apartment.status !== 'RENTED' || !lease) throw { status: 400, message: 'Căn chưa có hợp đồng thuê để gia hạn' };
  apartment.set('lease.endDate', addMonths(lease.endDate, months));
  apartment.set('lease.durationMonths', lease.durationMonths + months);
  apartment.set('lease.reminded30At', undefined);
  apartment.set('lease.reminded15At', undefined);
  apartment.set('lease.expiredNotifiedAt', undefined);
}
