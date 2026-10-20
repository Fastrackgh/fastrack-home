import { AreaView } from '@/features/dashboard';

export default async function DashboardAreaPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  return <AreaView slug={area} />;
}
