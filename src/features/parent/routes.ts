import { pathId as id } from '@/lib/api-client';

/** Every page of the parent portal, so links aren't spelled out in each screen. */
export const parentRoutes = {
  home: '/parent',
  login: '/parent/login',
  register: '/parent/register',
  forgotPassword: '/auth/forgot-password?portal=parent',
  offline: '/parent/offline',
  fees: '/parent/fees',
  invoice: (invoiceId: string) => `/parent/fees/${id(invoiceId)}`,
  paymentCallback: '/parent/fees/pay/callback',
  receipt: (paymentId: string) => `/parent/receipts/${id(paymentId)}`,
  reports: '/parent/reports',
  report: (reportId: string) => `/parent/reports/${id(reportId)}`,
  attendance: '/parent/attendance',
  more: '/parent/more',
  wards: '/parent/wards',
  ward: (studentId: string) => `/parent/wards/${id(studentId)}`,
  linkWard: '/parent/wards/link',
} as const;
