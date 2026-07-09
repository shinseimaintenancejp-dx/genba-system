import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export function formatDateJST(dateString: string | Date | undefined | null, formatStr: string = "yyyy/MM/dd HH:mm") {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    const zonedDate = toZonedTime(date, "Asia/Tokyo");
    return format(zonedDate, formatStr);
  } catch (e) {
    return "-";
  }
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
  }).format(amount);
}
