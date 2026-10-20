import { WardProfilePage } from '@/features/parent';

export default async function Page({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  return <WardProfilePage studentId={studentId} />;
}
