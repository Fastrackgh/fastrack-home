import { apiClient } from '@/lib/api-client';

/** A waitlist sign-up or contact request from the marketing site. */
export interface LeadInput {
  kind: 'WAITLIST' | 'CONTACT';
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  message?: string;
  studentCount?: string;
  currentSystem?: string;
  /** Hidden honeypot field: people leave it empty, bots fill it in. */
  website?: string;
}

/** Sends a lead to `POST /public/leads`; throws when it was not stored. */
export async function submitLead(lead: LeadInput): Promise<void> {
  const clean = Object.fromEntries(
    Object.entries(lead).map(([key, value]) => [key, value?.trim() || undefined]),
  );
  await apiClient.post('/public/leads', clean);
}

/** Visually hidden, unfocusable input style for the honeypot field. */
export const honeypotStyle: React.CSSProperties = {
  position: 'absolute',
  left: '-10000px',
  width: 1,
  height: 1,
  overflow: 'hidden',
};
