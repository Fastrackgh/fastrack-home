import { ReceiptView } from '@/features/parent';

export default async function Page({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  return <ReceiptView paymentId={paymentId} />;
}
