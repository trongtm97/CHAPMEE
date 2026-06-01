import { StorageCleanupAdminPage } from "@/components/admin/storage-cleanup/StorageCleanupAdminPage";
import { getStorageCleanupPageData } from "@/lib/storage/cleanup-service";
import type { StorageAssetFilters, StorageAssetStatus } from "@/types/storage-cleanup";

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInt(value: string | string[] | undefined, fallback: number) {
  const parsed = Number.parseInt(firstValue(value) ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export default async function AdminStorageCleanupRoute({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const status = firstValue(params.status);
  const filters: StorageAssetFilters = {
    bucket: firstValue(params.bucket) || undefined,
    entityType: firstValue(params.entityType) || undefined,
    mimeType: firstValue(params.mimeType) || undefined,
    page: positiveInt(params.page, 1),
    pageSize: positiveInt(params.pageSize, 25),
    query: firstValue(params.query) || undefined,
    status: status ? (status as StorageAssetStatus | "all") : "all",
    usageType: firstValue(params.usageType) || undefined
  };
  const data = await getStorageCleanupPageData(filters);
  return <StorageCleanupAdminPage data={data} filters={filters} />;
}
