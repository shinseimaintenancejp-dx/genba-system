import { usePageHeader } from "@/hooks/usePageHeader";
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FilePlus, Search } from 'lucide-react';

import { InvoiceTable } from '@/components/finance/InvoiceTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Invoice } from '@/types/finance';

// Mock function until global endpoint is added
async function fetchInvoices(): Promise<Invoice[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: '1',
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
        },
        {
          id: '2',
          invoice_number: 'INV-OUT-20260610-0002',
          invoice_type: 'OUTGOING',
          issue_date: '2026-06-10',
          billing_period_year: 2026,
          billing_period_month: 5,
          amount: 120000,
          tax_amount: 12000,
          status: 'PENDING_APPROVAL',
          is_auto_generated: true,
          contract_id: 'contract-2',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
    }, 1000);
  });
}

export default function InvoicesPage() {
  usePageHeader("請求管理", "顧客への請求書発行および入金状況を管理します。");
  const [searchQuery, setSearchQuery] = useState('');

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: fetchInvoices,
  });

  const filteredInvoices = invoices.filter((i) =>
    i.invoice_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">請求管理</h1>
          <p className="text-sm text-muted-foreground">
            毎月の請求書の確認・発行・ステータス管理を行います。
          </p>
        </div>
        <Button className="h-10 px-4 text-sm bg-[#1E60F2] hover:bg-[#0F4FD0] md:h-[52px] md:px-6 md:text-base">
          <FilePlus className="mr-2 h-4 w-4" />
          請求書作成
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="請求書番号で検索..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <InvoiceTable invoices={filteredInvoices} isLoading={isLoading} />
    </div>
  );
}
