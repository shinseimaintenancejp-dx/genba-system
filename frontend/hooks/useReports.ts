import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";

export interface ProfitReportItem {
  genba_id: string;
  genba_name: string;
  revenue: number;
  partner_cost: number;
  inhouse_cost: number;
  profit: number;
  profit_margin: number;
}

export interface ProfitReportResponse {
  year: number;
  month: number;
  total_revenue: number;
  total_partner_cost: number;
  total_inhouse_cost: number;
  total_profit: number;
  total_profit_margin: number;
  genbas: ProfitReportItem[];
}

export const useProfitReport = (year: number, month: number) => {
  return useQuery({
    queryKey: ["reports", "profit", year, month],
    queryFn: () => get<ProfitReportResponse>(`/contracts/reports/profit?year=${year}&month=${month}`),
    enabled: !!year && !!month,
  });
};
