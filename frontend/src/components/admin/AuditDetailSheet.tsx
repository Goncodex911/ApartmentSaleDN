import React from 'react';
import { Link } from 'react-router-dom';
import { AuditLogEntry } from '../../api/adminApi.js';
import { BottomSheet } from '../layout/BottomSheet.js';
import { Badge } from '../ui/Badge.js';
import { SEVERITY_LABEL, changeValue, fieldLabel } from './auditMeta.js';
import { actionMeta, detailText, formatDateTime, roleText } from './AuditLogItem.js';

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid grid-cols-[7rem_1fr] gap-2 py-2 border-b border-slate-100 last:border-0">
    <dt className="text-sm text-slate-600">{label}</dt>
    <dd className="text-sm text-slate-900 break-words">{children}</dd>
  </div>
);

/** Story 16.2: chi tiết 1 mục nhật ký — trường đã đổi (trước → sau), người thực hiện, IP, thiết bị đầy đủ. */
export const AuditDetailSheet: React.FC<{ log: AuditLogEntry; onClose: () => void }> = ({ log, onClose }) => {
  const meta = actionMeta(log.action);
  const changes = Object.entries(log.details?.changes ?? {});
  const summary = changes.length ? '' : detailText(log);
  const canOpenApartment = log.targetType === 'APARTMENT' && log.targetId && log.action !== 'DELETE_APARTMENT';

  return (
    <BottomSheet title="Chi tiết hoạt động" onClose={onClose} showClose wide>
      <div className="space-y-4 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={meta.tone} icon={meta.icon}>{meta.label}</Badge>
          {log.severity && <Badge tone={log.severity === 'SECURITY' ? 'danger' : log.severity === 'IMPORTANT' ? 'gold' : 'neutral'}>{SEVERITY_LABEL[log.severity]}</Badge>}
        </div>
        <dl>
          <Row label="Thời gian">{formatDateTime(log.createdAt)}</Row>
          <Row label="Người thực hiện">
            {log.userId ? (
              <Link to={`/admin/users/${log.userId}`} className="font-medium text-indigo-700 hover:underline" onClick={onClose}>{log.userName || 'Không rõ'}</Link>
            ) : (
              log.userName || 'Không rõ'
            )}{' '}
            · {roleText(log.userRole)}
          </Row>
          <Row label="Đối tượng">
            {canOpenApartment ? (
              <Link to="/apartments" state={{ openApartmentId: log.targetId }} className="font-medium text-indigo-700 hover:underline">{log.targetTitle || 'Căn hộ'}</Link>
            ) : (
              log.targetTitle || '—'
            )}
          </Row>
          {summary && <Row label="Nội dung">{summary}</Row>}
          <Row label="IP">{log.ipAddress || 'Không rõ'}</Row>
          <Row label="Thiết bị">{log.userAgent || 'Không rõ'}</Row>
        </dl>
        {changes.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Trường đã đổi</h3>
            <ul className="space-y-2">
              {changes.map(([field, change]) => (
                <li key={field} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm">
                  <p className="font-medium text-slate-900">{fieldLabel(field)}</p>
                  <p className="text-slate-700 break-words">
                    <span className="line-through decoration-slate-400">{changeValue(change.from)}</span>
                    <span aria-hidden> → </span>
                    <span className="sr-only"> đổi thành </span>
                    <span className="font-medium text-slate-900">{changeValue(change.to)}</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
