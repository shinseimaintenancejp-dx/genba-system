import { usePageHeader } from "@/hooks/usePageHeader";
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

import { ApprovalBadge } from '@/components/common/ApprovalBadge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApprovalRequest } from '@/types/finance';

// Mock function until global endpoint is added
async function fetchApprovals(): Promise<ApprovalRequest[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: '1',
          entity_type: 'QUOTATION',
          entity_id: 'quotation-1',
          requested_by: 'user-1',
          status: 'PENDING',
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          entity_type: 'INVOICE',
          entity_id: 'invoice-2',
          requested_by: 'system',
          status: 'PENDING',
          created_at: new Date().toISOString(),
        },
      ]);
    }, 1000);
  });
}

export default function ApprovalsPage() {
  usePageHeader("承認待ち一覧", "担当者から申請された見積書・請求書の承認・却下を行います。");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data: approvals = [], isLoading } = useQuery({
    queryKey: ['approvals'],
    queryFn: fetchApprovals,
  });

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    // Mock API call
    setTimeout(() => {
      setProcessingId(null);
      // Ideally, invalidate query here
    }, 1000);
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    // Mock API call
    setTimeout(() => {
      setProcessingId(null);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>種別</TableHead>
              <TableHead>申請日時</TableHead>
              <TableHead>申請者</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead className="text-right">アクション</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-10 w-48 float-right" /></TableCell>
                </TableRow>
              ))
            ) : approvals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <CheckCircle className="h-10 w-10 text-emerald-500 mb-2 opacity-50" />
                    <p>現在、承認待ちの項目はありません。</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              approvals.map((approval) => (
                <TableRow key={approval.id}>
                  <TableCell className="font-medium">
                    {approval.entity_type === 'QUOTATION' ? '見積書' : '請求書'}
                  </TableCell>
                  <TableCell>
                    {format(new Date(approval.created_at), 'yyyy/MM/dd HH:mm')}
                  </TableCell>
                  <TableCell>
                    {approval.requested_by === 'system' ? 'システム (自動)' : '担当者'}
                  </TableCell>
                  <TableCell>
                    <ApprovalBadge status={approval.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        onClick={() => handleReject(approval.id)}
                        disabled={processingId === approval.id}
                      >
                        {processingId === approval.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="mr-2 h-4 w-4" />
                        )}
                        {processingId === approval.id ? '処理中...' : '却下'}
                      </Button>
                      <Button
                        className="bg-[#10B981] hover:bg-[#047857]"
                        onClick={() => handleApprove(approval.id)}
                        disabled={processingId === approval.id}
                      >
                        {processingId === approval.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="mr-2 h-4 w-4" />
                        )}
                        {processingId === approval.id ? '処理中...' : '承認'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
