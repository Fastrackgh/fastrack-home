import { notFound } from "next/navigation";
import { PlatformSchoolDetail } from "@/features/platform-schools/SchoolDetail";
import { getPreviewPlatformSchool, platformSchoolFixtures } from "@/features/platform-schools/fixtures";

export function generateStaticParams() {
  return Object.keys(platformSchoolFixtures).map((schoolId) => ({ schoolId }));
}

export default async function PlatformSchoolPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  const school = getPreviewPlatformSchool(schoolId);
  if (!school) notFound();

  return <PlatformSchoolDetail initialSchool={school} />;
}
