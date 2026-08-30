"use server";

import {
  enrichAdminTransactions,
  fetchTransactionRiskContext
} from "@/lib/admin/transactions/enrich-transactions";
import {
  mapTypeFilterToDbTypes
} from "@/lib/admin/transactions/parse-transaction-filters";
import { getTransactionsForAdminPaginated } from "@/lib/data/transactions";
import type { AdminTransactionListRow, TransactionDashboardFilters } from "@/types/admin-transaction";

export async function listAdminTransactions(filters: TransactionDashboardFilters): Promise<{
  rows: AdminTransactionListRow[];
  total: number;
  error: string | null;
}> {
  const dbTypes = mapTypeFilterToDbTypes(filters.type);

  const result = await getTransactionsForAdminPaginated({
    page: filters.page,
    pageSize: filters.pageSize,
    search: filters.search || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    sort: filters.sort,
    status: filters.status !== "all" ? filters.status : undefined,
    source: filters.source !== "all" ? filters.source : undefined,
    types: dbTypes ?? undefined
  });

  if (result.error) {
    return { rows: [], total: 0, error: result.error };
  }

  const riskContext = await fetchTransactionRiskContext(result.data.map((row) => row.id));
  const rows = await enrichAdminTransactions(result.data, riskContext);

  return { rows, total: result.total, error: null };
}
