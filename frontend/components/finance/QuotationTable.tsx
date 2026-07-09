'use client';

import { format } from 'date-fns';
import { FileText, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';

import { ApprovalBadge } from '@/components/common/ApprovalBadge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Quotation } from '@/types/finance';

interface QuotationTableProps {
  quotations: Quotation[];
  isLoading: boolean;
}

export function QuotationTable({ quotations, isLoading }: QuotationTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>見積番号</TableHead>
              <TableHead>件名</TableHead>
              <TableHead>発行日</TableHead>
              <TableHead>金額（税抜）</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (quotations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border rounded-md bg-muted/20">
        <FileText className="h-10 w-10 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground">見積書が見つかりません</h3>
        <p className="text-sm text-muted-foreground mt-1">まだ見積書が登録されていません。</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>見積番号</TableHead>
            <TableHead>件名</TableHead>
            <TableHead>発行日</TableHead>
            <TableHead>金額（税抜）</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotations.map((quotation) => (
            <TableRow key={quotation.id}>
              <TableCell className="font-medium">{quotation.quotation_number}</TableCell>
              <TableCell>{quotation.title}</TableCell>
              <TableCell>
                {format(new Date(quotation.issue_date), 'yyyy/MM/dd')}
              </TableCell>
              <TableCell>
                ¥{quotation.total_amount.toLocaleString()}
              </TableCell>
              <TableCell>
                <ApprovalBadge status={quotation.status} />
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">メニューを開く</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/quotations/${quotation.id}`}>
                        詳細を見る
                      </Link>
                    </DropdownMenuItem>
                    {quotation.status === 'DRAFT' && (
                      <DropdownMenuItem asChild>
                        <Link href={`/quotations/${quotation.id}/edit`}>
                          編集する
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
