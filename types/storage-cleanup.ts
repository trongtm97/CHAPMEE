export type StorageAssetStatus =
  | "uploading"
  | "active"
  | "temp"
  | "replaced"
  | "orphan_candidate"
  | "orphan_detected"
  | "pending_delete"
  | "quarantined"
  | "deleted"
  | "failed"
  | "error";

export type CleanupJobMode =
  | "dry_run"
  | "quarantine"
  | "hard_delete"
  | "compress"
  | "rollup";

export type CleanupJobStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export type CleanupPolicyRow = {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  category: string;
  updatedAt: string;
};

export type StorageAssetRow = {
  id: string;
  ownerId: string | null;
  ownerUsername: string | null;
  bucket: string;
  path: string;
  publicUrl: string | null;
  mimeType: string | null;
  originalFilename: string | null;
  extension: string | null;
  usageType: string | null;
  sizeBytes: number;
  status: StorageAssetStatus;
  linkedEntityType: string | null;
  linkedEntityId: string | null;
  linkedField: string | null;
  isPublic: boolean;
  isOriginal: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  orphanDetectedAt: string | null;
  quarantinedAt: string | null;
  hasDerivatives: boolean;
  variants: Record<string, unknown>;
  deleteAfterAt: string | null;
};

export type CleanupJobRow = {
  id: string;
  jobType: string;
  mode: CleanupJobMode;
  status: CleanupJobStatus;
  startedAt: string | null;
  finishedAt: string | null;
  scannedCount: number;
  affectedCount: number;
  bytesSaved: number;
  errorCount: number;
  summary: string | null;
  triggeredBy: string | null;
};

export type StorageCleanupDashboard = {
  totalAssets: number;
  activeAssets: number;
  orphanAssets: number;
  quarantinedAssets: number;
  deletableAssets: number;
  totalBytes: number;
  reclaimableBytes: number;
  topBuckets: Array<{ bucket: string; bytes: number; count: number }>;
  topUsers: Array<{ ownerId: string | null; username: string | null; bytes: number; count: number }>;
  largestFiles: StorageAssetRow[];
  latestJob: CleanupJobRow | null;
  latestFailedJob: CleanupJobRow | null;
  policyWarnings: string[];
};

export type StorageAssetFilters = {
  bucket?: string;
  status?: StorageAssetStatus | "all";
  owner?: string;
  usageType?: string;
  entityType?: string;
  mimeType?: string;
  query?: string;
  page?: number;
  pageSize?: number;
};

export type StorageAssetsPage = {
  items: StorageAssetRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error: string | null;
};

export type CleanupJobsPage = {
  items: CleanupJobRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error: string | null;
};

export type StorageCleanupPageData = {
  dashboard: StorageCleanupDashboard;
  policies: CleanupPolicyRow[];
  assets: StorageAssetsPage;
  jobs: CleanupJobsPage;
  error: string | null;
};

export type RegisterStorageAssetInput = {
  ownerId?: string | null;
  bucket: string;
  path: string;
  publicUrl?: string | null;
  mimeType?: string | null;
  sizeBytes?: number;
  checksum?: string | null;
  originalFilename?: string | null;
  extension?: string | null;
  usageType?: string | null;
  width?: number | null;
  height?: number | null;
  status?: StorageAssetStatus;
  linkedEntityType?: string | null;
  linkedEntityId?: string | null;
  linkedField?: string | null;
  isPublic?: boolean;
  isOriginal?: boolean;
  variants?: Record<string, unknown>;
  deleteAfterAt?: string | null;
  metadata?: Record<string, unknown>;
};
