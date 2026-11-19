import React from 'react';
import { AdminUser } from '../../api/userApi.js';
import { Badge } from '../ui/Badge.js';

export const ROLE_LABEL: Record<AdminUser['role'], string> = { ADMIN: 'Admin', MANAGER: 'Quản lý', COLLABORATOR: 'CTV' };
const STATUS = {
  ACTIVE: { label: 'Hoạt động', tone: 'AVAILABLE' },
  PENDING: { label: 'Chờ duyệt', tone: 'gold' },
  BLOCKED: { label: 'Bị khóa', tone: 'danger' },
} as const;

/** Huy hiệu vai trò + trạng thái tài khoản (Story 13.2) — chữ đi kèm màu, không chỉ dựa vào màu. */
export const UserBadges: React.FC<{ user: Pick<AdminUser, 'role' | 'status'> }> = ({ user }) => (
  <span className="inline-flex flex-wrap gap-1.5">
    <Badge tone={user.role === 'COLLABORATOR' ? 'neutral' : 'accent'}>{ROLE_LABEL[user.role]}</Badge>
    <Badge tone={STATUS[user.status].tone}>{STATUS[user.status].label}</Badge>
  </span>
);
