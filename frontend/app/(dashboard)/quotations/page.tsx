'use client';
import { usePageHeader } from "@/hooks/usePageHeader";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FilePlus, Search } from 'lucide-react';

import { QuotationTable } from '@/components/finance/QuotationTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Quotation } from '@/types/finance';

// Mock function until global endpoint is added
async function fetchQuotations(): Promise<Quotation[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: '1',
          quotation_number: 'QT-20260611-0001',
          title: 'オフィスビル定期清掃見積',
          issue_date: '2026-06-11',
          total_amount: 150000,
          tax_amount: 15000,
          status: 'DRAFT',
          genba_id: 'genba-1',
          customer_id: 'cust-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          items: [],
        },
        {
          id: '2',
          quotation_number: 'QT-20260610-0002',
          title: 'マンション共有部清掃',
          issue_date: '2026-06-10',
          total_amount: 85000,
          tax_amount: 8500,
          status: 'PENDING_APPROVAL',
          genba_id: 'genba-2',
          customer_id: 'cust-2',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          items: [],
        },
      ]);
    }, 1000);
  });
}

export default function QuotationsPage() {
  usePageHeader("見積管理", "顧客向けの見積書を作成・管理します。");
  const [searchQuery, setSearchQuery] = useState('');

  const { data: quotations = [], isLoading } = useQuery({
    queryKey: ['quotations'],
    queryFn: fetchQuotations,
  });

  const filteredQuotations = quotations.filter((q) =>
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.quotation_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        <Button className="h-10 px-4 text-sm bg-[#1E60F2] hover:bg-[#0F4FD0] md:h-[52px] md:px-6 md:text-base">
          <FilePlus className="mr-2 h-4 w-4" />
          見積書作成
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="見積番号や件名で検索..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <QuotationTable quotations={filteredQuotations} isLoading={isLoading} />
    </div>
  );
}
