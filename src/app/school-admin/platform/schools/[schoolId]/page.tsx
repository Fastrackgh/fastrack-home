import { notFound } from "next/navigation";
import { PlatformSchoolDetail } from "@/features/platform-schools/SchoolDetail";
import { getPreviewPlatformSchool, platformSchoolFixtures } from "@/features/platform-schools/fixtures";
import { PlatformSchoolSnapshot } from "@/features/platform-schools/model";

export function generateStaticParams() {
  return Object.keys(platformSchoolFixtures).map((schoolId) => ({ schoolId }));
}

export default async function PlatformSchoolPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  let school = getPreviewPlatformSchool(schoolId);

  if (!school) {
    // If not in static fixtures, try fetching from the backend API
    try {
      const res = await fetch(`http://localhost:3000/api/super-admin/schools/${schoolId}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        const d = json.data;
        if (d) {
          school = {
            profile: {
              id: d.id,
              name: d.name,
              code: d.code,
              status: d.isActive ? "Active" : "Suspended",
              email: d.email || "info@" + (d.code?.toLowerCase() || "school") + ".school",
              phone: d.phone || "+233 24 000 0000",
              address: d.address || "Main Campus",
              city: "Accra",
              region: "Greater Accra",
              website: d.website || "https://fastrack.school",
              createdAt: new Date(d.createdAt).toLocaleDateString(),
            },
            ownerId: d.schoolHead?.id || "u-head",
            principalId: d.schoolHead?.id || "u-head",
            users: d.schoolHead
              ? [
                  {
                    id: d.schoolHead.id,
                    name: `${d.schoolHead.firstName} ${d.schoolHead.lastName}`,
                    email: d.schoolHead.email,
                    phone: d.schoolHead.phone || "",
                    role: "Principal",
                    status: d.schoolHead.isActive ? "Active" : "Inactive",
                    lastActive: "Today",
                  },
                ]
              : [],
            students: [],
            staff: d.schoolHead
              ? [
                  {
                    id: d.schoolHead.id,
                    name: `${d.schoolHead.firstName} ${d.schoolHead.lastName}`,
                    email: d.schoolHead.email,
                    phone: d.schoolHead.phone || "",
                    role: "Principal",
                    status: d.schoolHead.isActive ? "Active" : "Inactive",
                    lastActive: "Today",
                  },
                ]
              : [],
            modules: (d.enabledModules || []).map((m: string) => ({
              id: m,
              name: m.charAt(0).toUpperCase() + m.slice(1),
              description: `Operational workflows for ${m}.`,
              enabled: true,
            })),
            subscription: {
              plan: "Professional",
              status: "Active",
              seats: 500,
              renewalDate: "01 Jan 2027",
              monthlyFee: "GH₵ 1,500",
            },
            activity: [
              {
                id: "act-1",
                summary: "School provisioned on platform",
                actor: "Super Admin",
                occurredAt: new Date(d.createdAt).toLocaleDateString(),
              },
            ],
          };
        }
      }
    } catch {
      // Fallback
    }
  }

  // If still not found, fallback to first fixture
  if (!school) {
    const fallbackId = Object.keys(platformSchoolFixtures)[0];
    school = platformSchoolFixtures[fallbackId];
  }

  if (!school) notFound();

  return <PlatformSchoolDetail initialSchool={school} />;
}
