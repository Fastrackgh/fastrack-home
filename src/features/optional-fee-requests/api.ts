import { apiClient, PageMeta } from '@/lib/api-client';
import { pageParams, toPage, type Page, type Raw } from '@/lib/pagination';
import type { OptionalFeeRequestAction, OptionalFeeRequestStatus } from '@/features/parent/types';

export type { OptionalFeeRequestAction, OptionalFeeRequestStatus };

/** A parent's ask to start or stop a student's optional service, as staff see it. */
export interface StaffOptionalFeeRequest {
  id: string;
  feeTypeId: string;
  feeTypeName: string;
  action: OptionalFeeRequestAction;
  status: OptionalFeeRequestStatus;
  parentNote: string | null;
  staffNote: string | null;
  createdAt: string;
  decidedAt: string | null;
  schoolStudentId: string;
  studentName: string;
  studentCode: string | null;
  className: string | null;
  parentName: string;
  parentPhone: string | null;
  parentEmail: string;
  decidedByName: string | null;
}

const BASE = '/schools/me/optional-fee-requests';

export const optionalFeeRequestsApi = {
  async list({
    page,
    status,
  }: {
    page: number;
    status: OptionalFeeRequestStatus | null;
  }): Promise<Page<StaffOptionalFeeRequest>> {
    const res = await apiClient.get<Raw[], PageMeta>(`${BASE}?${pageParams(page, { status })}`);
    return toPage(res, (raw) => raw as unknown as StaffOptionalFeeRequest);
  },
  async pendingCount(): Promise<number> {
    const res = await apiClient.get<{ pending: number }>(`${BASE}/pending-count`);
    return res.data.pending;
  },
  async approve(id: string, note?: string): Promise<StaffOptionalFeeRequest> {
    const res = await apiClient.post<StaffOptionalFeeRequest>(
      `${BASE}/${encodeURIComponent(id)}/approve`,
      { note },
    );
    return res.data;
  },
  async decline(id: string, note?: string): Promise<StaffOptionalFeeRequest> {
    const res = await apiClient.post<StaffOptionalFeeRequest>(
      `${BASE}/${encodeURIComponent(id)}/decline`,
      { note },
    );
    return res.data;
  },
};
