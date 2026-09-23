import { PlatformSchoolSnapshot, PlatformSchoolsRepository } from "./model";

const commonModules = [
  { id: "students", name: "Student records", description: "Admissions, profiles, guardians, and enrollment.", enabled: true },
  { id: "fees", name: "Fees & payments", description: "Invoices, collections, discounts, and balances.", enabled: true },
  { id: "attendance", name: "Attendance", description: "Student and staff attendance tracking.", enabled: true },
  { id: "academics", name: "Academics", description: "Assessments, report cards, and gradebooks.", enabled: true },
  { id: "communication", name: "Communication", description: "SMS, email, and parent notices.", enabled: true },
  { id: "admissions", name: "Online admissions", description: "Public application and admissions workflow.", enabled: false },
];

export const platformSchoolFixtures: Record<string, PlatformSchoolSnapshot> = {
  "fastrack-international": {
    profile: { id: "fastrack-international", name: "Fastrack International", code: "FIS-001", status: "Active", email: "admin@fis-001.school", phone: "+233 30 255 0101", address: "14 Liberation Road", city: "Accra", region: "Greater Accra", website: "https://fis-001.school", createdAt: "12 Jan 2024" },
    ownerId: "u-ama", principalId: "u-kwame",
    users: [
      { id: "u-ama", name: "Ama Boateng", email: "ama.boateng@fis-001.school", phone: "+233 24 400 0101", role: "Owner", status: "Active", lastActive: "Today, 08:14" },
      { id: "u-kwame", name: "Kwame Mensah", email: "kwame.mensah@fis-001.school", phone: "+233 24 400 0102", role: "Principal", status: "Active", lastActive: "Today, 07:42" },
      { id: "u-akosua", name: "Akosua Asante", email: "akosua.asante@fis-001.school", phone: "+233 24 400 0103", role: "Academic Head", status: "Active", lastActive: "Yesterday" },
      { id: "u-kofi", name: "Kofi Mensah", email: "kofi.mensah@fis-001.school", phone: "+233 24 400 0104", role: "Teacher", status: "Active", lastActive: "Today, 06:58" },
      { id: "u-efua", name: "Efua Osei", email: "efua.osei@fis-001.school", phone: "+233 24 400 0105", role: "Account Officer", status: "Active", lastActive: "Yesterday" },
      { id: "u-adwoa", name: "Adwoa Owusu", email: "adwoa.owusu@fis-001.school", phone: "+233 24 400 0106", role: "Secretary", status: "Invited", lastActive: "Invitation pending" },
    ],
    students: [
      { id: "s-kofi", name: "Kofi Ansah", className: "Primary 2", guardian: "George Ansah", guardianPhone: "+233 24 400 0111", status: "Active", balance: "GH₵ 850" },
      { id: "s-abena", name: "Abena Osei", className: "Primary 2", guardian: "Nana Osei", guardianPhone: "+233 24 400 0112", status: "Active", balance: "GH₵ 0" },
      { id: "s-kwesi", name: "Kwesi Osei", className: "Primary 4", guardian: "Nana Osei", guardianPhone: "+233 24 400 0112", status: "Active", balance: "GH₵ 400" },
      { id: "s-esi", name: "Esi Agyeman", className: "Nursery 2", guardian: "Akua Agyeman", guardianPhone: "+233 24 400 0113", status: "Pending", balance: "GH₵ 1,200" },
    ],
    staff: [
      { id: "u-kwame", name: "Kwame Mensah", email: "kwame.mensah@fis-001.school", phone: "+233 24 400 0102", role: "Principal", status: "Active", lastActive: "Today, 07:42" },
      { id: "u-akosua", name: "Akosua Asante", email: "akosua.asante@fis-001.school", phone: "+233 24 400 0103", role: "Academic Head", status: "Active", lastActive: "Yesterday" },
      { id: "u-kofi", name: "Kofi Mensah", email: "kofi.mensah@fis-001.school", phone: "+233 24 400 0104", role: "Teacher", status: "Active", lastActive: "Today, 06:58" },
    ],
    modules: commonModules,
    subscription: { plan: "Professional", status: "Active", seats: 650, renewalDate: "01 Oct 2026", monthlyFee: "GH₵ 1,200" },
    activity: [
      { id: "a1", summary: "Term 1 fee schedule updated", actor: "Ama Boateng", occurredAt: "Today, 08:20" },
      { id: "a2", summary: "Academic Head account activated", actor: "System", occurredAt: "Yesterday, 14:08" },
      { id: "a3", summary: "Professional subscription renewed", actor: "Platform billing", occurredAt: "20 Sep 2026" },
    ],
  },
  "riverside-academy": {
    profile: { id: "riverside-academy", name: "Riverside Academy", code: "RIV-002", status: "Active", email: "office@riverside.school", phone: "+233 32 202 2010", address: "8 Lake Road", city: "Kumasi", region: "Ashanti", website: "https://riverside.school", createdAt: "28 Mar 2025" },
    ownerId: "r-owner", principalId: "r-principal",
    users: [
      { id: "r-owner", name: "Nana Yaw Boakye", email: "owner@riverside.school", phone: "+233 24 500 0101", role: "Owner", status: "Active", lastActive: "Today, 09:11" },
      { id: "r-principal", name: "Efua Owusu", email: "principal@riverside.school", phone: "+233 24 500 0102", role: "Principal", status: "Active", lastActive: "Today, 07:55" },
      { id: "r-teacher", name: "Mabel Appiah", email: "mabel@riverside.school", phone: "+233 24 500 0103", role: "Teacher", status: "Active", lastActive: "Yesterday" },
    ],
    students: [
      { id: "r-student-1", name: "Yaw Boahen", className: "Primary 3", guardian: "Amina Boahen", guardianPhone: "+233 24 500 0111", status: "Active", balance: "GH₵ 250" },
      { id: "r-student-2", name: "Akua Gyasi", className: "KG 2", guardian: "Joseph Gyasi", guardianPhone: "+233 24 500 0112", status: "Active", balance: "GH₵ 0" },
    ],
    staff: [{ id: "r-principal", name: "Efua Owusu", email: "principal@riverside.school", phone: "+233 24 500 0102", role: "Principal", status: "Active", lastActive: "Today, 07:55" }, { id: "r-teacher", name: "Mabel Appiah", email: "mabel@riverside.school", phone: "+233 24 500 0103", role: "Teacher", status: "Active", lastActive: "Yesterday" }],
    modules: commonModules.map((module) => ({ ...module, enabled: module.id !== "communication" && module.id !== "admissions" })),
    subscription: { plan: "Standard", status: "Active", seats: 350, renewalDate: "25 Sep 2026", monthlyFee: "GH₵ 800" },
    activity: [{ id: "r1", summary: "Subscription payment received", actor: "Platform billing", occurredAt: "18 Sep 2026" }],
  },
  "greenfield-school": {
    profile: { id: "greenfield-school", name: "Greenfield School", code: "GRN-003", status: "Trial", email: "hello@greenfield.school", phone: "+233 24 600 0101", address: "21 Community Road", city: "Tema", region: "Greater Accra", website: "https://greenfield.school", createdAt: "02 Sep 2026" },
    ownerId: "g-owner", principalId: "g-principal",
    users: [{ id: "g-owner", name: "Evelyn Quartey", email: "evelyn@greenfield.school", phone: "+233 24 600 0101", role: "Owner", status: "Active", lastActive: "Yesterday" }, { id: "g-principal", name: "Samuel Lartey", email: "samuel@greenfield.school", phone: "+233 24 600 0102", role: "Principal", status: "Invited", lastActive: "Invitation pending" }],
    students: [{ id: "g-student-1", name: "Maya Lartey", className: "Creche", guardian: "Samuel Lartey", guardianPhone: "+233 24 600 0111", status: "Pending", balance: "GH₵ 750" }],
    staff: [{ id: "g-principal", name: "Samuel Lartey", email: "samuel@greenfield.school", phone: "+233 24 600 0102", role: "Principal", status: "Invited", lastActive: "Invitation pending" }],
    modules: commonModules.map((module) => ({ ...module, enabled: module.id === "students" || module.id === "fees" })),
    subscription: { plan: "Trial", status: "Trial", seats: 200, renewalDate: "30 Sep 2026", monthlyFee: "GH₵ 0" },
    activity: [{ id: "g1", summary: "Trial workspace provisioned", actor: "Platform onboarding", occurredAt: "02 Sep 2026" }],
  },
};

export function getPreviewPlatformSchool(schoolId: string) {
  return platformSchoolFixtures[schoolId] ?? null;
}

export function getPreviewPlatformSchoolId(name: string) {
  return Object.values(platformSchoolFixtures).find(
    (school) => school.profile.name === name,
  )?.profile.id;
}

export const previewPlatformSchoolsRepository: PlatformSchoolsRepository = {
  async getSchool(schoolId) {
    return getPreviewPlatformSchool(schoolId);
  },
  async listSchoolIds() {
    return Object.keys(platformSchoolFixtures);
  },
};
