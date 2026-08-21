'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle , Receipt } from 'lucide-react';
import Link from 'next/link';

import { ApprovalBadge } from '@/components/common/ApprovalBadge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageHeader } from '@/hooks/usePageHeader';
import { Invoice } from '@/types/finance';

// Mock function
async function fetchInvoice(id: string): Promise<Invoice> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id,
        invoice_number: 'INV-OUT-20260611-0001',
        invoice_type: 'OUTGOING',
        issue_date: '2026-06-11',
        billing_period_year: 2026,
        billing_period_month: 5,
        amount: 250000,
        tax_amount: 25000,
        status: 'AUTO_GENERATED',
        is_auto_generated: true,
        contract_id: 'contract-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }, 1000);
  });
}

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => fetchInvoice(id),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!invoice) {
    return <div>請求書が見つかりません</div>;
  }

  usePageHeader(`請求書詳細: ${invoice.invoice_number}`, null, Receipt);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/invoices">
          <Button variant="ghost" className="h-10 w-10 p-0">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">戻る</span>
          </Button>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {invoice.status === 'AUTO_GENERATED' && (
            <Button className="bg-[#10B981] hover:bg-[#047857]">
              <CheckCircle className="mr-2 h-4 w-4" />
              承認申請へ進む
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <div className="flex justify-between items-start mb-8 border-b pb-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">ステータス</p>
            <ApprovalBadge status={invoice.status} />
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-muted-foreground mb-1">発行日</p>
            <p className="font-medium">{invoice.issue_date}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 border-b pb-4">
            <div>
              <p className="text-sm text-muted-foreground">対象年月</p>
              <p className="font-medium">{invoice.billing_period_year}年{invoice.billing_period_month}月</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">種別</p>
              <p className="font-medium">{invoice.invoice_type === 'OUTGOING' ? '売上' : '支払'}</p>
            </div>
          </div>
          
          <div className="flex justify-between items-center bg-muted/30 p-4 rounded-md">
            <span className="font-medium text-lg">ご請求金額（税抜）</span>
            <span className="font-bold text-2xl">¥{invoice.amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center p-4">
            <span className="text-muted-foreground">消費税 (10%)</span>
            <span>¥{invoice.tax_amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center bg-blue-50 text-blue-900 p-4 rounded-md">
            <span className="font-bold text-lg">合計金額（税込）</span>
            <span className="font-bold text-2xl">¥{(invoice.amount + invoice.tax_amount).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
