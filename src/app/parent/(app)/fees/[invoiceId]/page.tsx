import { InvoiceDetail } from '@/features/parent';

export default async function Page({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;
  return <InvoiceDetail invoiceId={invoiceId} />;
}
