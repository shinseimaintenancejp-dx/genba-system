import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { QuotationStatus, InvoiceStatus, ApprovalStatus } from '@/types/finance';

interface ApprovalBadgeProps {
  status: QuotationStatus | InvoiceStatus | ApprovalStatus | string;
  className?: string;
}

export function ApprovalBadge({ status, className }: ApprovalBadgeProps) {
  let label = status;
  let variantClass = 'bg-gray-100 text-gray-800 border-gray-200';

  switch (status) {
    case 'DRAFT':
      label = '下書き';
      variantClass = 'bg-gray-100 text-gray-800 border-gray-200';
      break;
    case 'AUTO_GENERATED':
      label = '自動生成';
      variantClass = 'bg-blue-100 text-blue-800 border-blue-200';
      break;
    case 'PENDING':
    case 'PENDING_APPROVAL':
      label = '承認待ち';
      variantClass = 'bg-amber-100 text-amber-800 border-amber-200';
      break;
    case 'APPROVED':
    case 'ACCEPTED':
      label = '承認済';
      variantClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
      break;
    case 'ISSUED':
      label = '発行済';
      variantClass = 'bg-indigo-100 text-indigo-800 border-indigo-200';
      break;
    case 'PAID':
      label = '支払済';
      variantClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
      break;
    case 'REJECTED':
      label = '却下';
      variantClass = 'bg-red-100 text-red-800 border-red-200';
      break;
    case 'CANCELLED':
      label = 'キャンセル';
      variantClass = 'bg-gray-100 text-gray-600 border-gray-200';
      break;
    case 'SENT':
      label = '送信済';
      variantClass = 'bg-blue-100 text-blue-800 border-blue-200';
      break;
    default:
      break;
  }

  return (
    <Badge variant="outline" className={cn('font-medium', variantClass, className)}>
      {label}
    </Badge>
  );
}
