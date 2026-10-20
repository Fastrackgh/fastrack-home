import { PlatformSchoolDetail } from '@/features/platform-schools/SchoolDetail';

export default async function PlatformSchoolPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  return <PlatformSchoolDetail schoolId={schoolId} />;
}
