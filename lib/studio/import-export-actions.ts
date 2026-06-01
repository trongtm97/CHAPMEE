"use server";

import {
  executeImportAction as executeImport,
  fetchExportRowsAction as fetchExportRows,
  searchStoriesForQuickPickAction as searchStoriesForQuickPick
} from "@/lib/studio/import-export-server";
import {
  downloadStudioImportTemplatesAction as downloadTemplates,
  downloadStudioImportTemplatesXlsxAction as downloadTemplatesXlsx,
  downloadStudioImportTemplatesZipAction as downloadTemplatesZip,
  fetchChaptersExportV2Action as fetchChaptersExportV2,
  fetchImportExportBundleXlsxAction as fetchImportExportBundleXlsx,
  fetchImportExportBundleZipAction as fetchImportExportBundleZip,
  fetchStoriesExportV2ByScopeAction as fetchStoriesExportV2ByScope
} from "@/lib/studio/import-export-v2-server";
import type { ExportScopeInput, ImportExportAction, ImportExportDataType, ImportExportRow } from "@/types/studio-import";

export async function fetchExportRowsAction(input: {
  dataType: ImportExportDataType;
  scope: ExportScopeInput;
}) {
  return fetchExportRows(input);
}

export async function fetchChaptersExportV2Action(scope: ExportScopeInput) {
  return fetchChaptersExportV2(scope);
}

export async function downloadStudioImportTemplatesAction(mode: "create" | "update") {
  return downloadTemplates(mode);
}

export async function downloadStudioImportTemplatesZipAction(mode: "create" | "update") {
  return downloadTemplatesZip(mode);
}

export async function fetchImportExportBundleZipAction(scope: ExportScopeInput) {
  return fetchImportExportBundleZip(scope);
}

export async function fetchStoriesExportV2ByScopeAction(scope: ExportScopeInput) {
  return fetchStoriesExportV2ByScope(scope);
}

export async function fetchImportExportBundleXlsxAction(scope: ExportScopeInput) {
  return fetchImportExportBundleXlsx(scope);
}

export async function downloadStudioImportTemplatesXlsxAction(mode: "create" | "update") {
  return downloadTemplatesXlsx(mode);
}

export async function executeImportAction(input: {
  rows: ImportExportRow[];
  actions: ImportExportAction[];
  rowIndices: number[];
}) {
  return executeImport(input);
}

export async function searchStoriesForQuickPickAction(input: { search?: string; page?: number }) {
  return searchStoriesForQuickPick(input);
}
