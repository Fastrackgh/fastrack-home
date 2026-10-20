import { ReportView } from '@/features/parent';

export default async function Page({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  return <ReportView reportId={reportId} />;
}
