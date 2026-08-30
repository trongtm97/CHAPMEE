import "server-only";

import {
  getPolicyPageByCanonicalPath,
  isPolicyPubliclyVisible
} from "@/lib/policies/policy-pages";
import type { PolicyPage } from "@/types/policy-pages";

export type ResolvedPublishedSitePage = {
  published: boolean;
  page: PolicyPage | null;
};

export async function resolvePublishedSitePage(
  publicPath: string
): Promise<ResolvedPublishedSitePage> {
  const { item, error } = await getPolicyPageByCanonicalPath(publicPath, {
    publicOnly: true
  });

  if (error || !item || !isPolicyPubliclyVisible(item)) {
    return { published: false, page: null };
  }

  return { published: true, page: item };
}
