import { LEGAL_CONTENT_PLACEHOLDER } from "@/lib/legal-pages";
import { PLATFORM_PAGE_CONTENT } from "@/lib/site-pages/platform-page-content";
import type { PolicyType } from "@/types/policy-pages";

export type SitePageGroup = "legal" | "info" | "legacy";

export type SitePageRegistryEntry = {
  key: string;
  title: string;
  slug: string;
  publicPath: string;
  description: string;
  group: SitePageGroup;
  policyType: PolicyType;
  defaultContent: string;
};

export const SITE_PAGE_GROUP_LABELS: Record<SitePageGroup, string> = {
  legal: "Pháp lý & BCT",
  info: "Thông tin chung",
  legacy: "Chính sách (/chinh-sach)"
};

const DEFAULT_MD = `## Nội dung đang cập nhật

${LEGAL_CONTENT_PLACEHOLDER}
`;

function contentForPath(publicPath: string): string {
  return PLATFORM_PAGE_CONTENT[publicPath]?.content ?? DEFAULT_MD;
}

function registryFromPlatform(
  key: string,
  publicPath: string,
  group: SitePageGroup,
  policyType: PolicyType
): SitePageRegistryEntry | null {
  const meta = PLATFORM_PAGE_CONTENT[publicPath];
  if (!meta) return null;

  return {
    key,
    slug: meta.slug,
    title: meta.title,
    description: meta.summary,
    publicPath,
    group,
    policyType,
    defaultContent: meta.content
  };
}

function legalPage(
  slug: string,
  title: string,
  description: string,
  policyType: PolicyType = "content"
): SitePageRegistryEntry {
  const publicPath = `/legal/${slug}`;
  const meta = PLATFORM_PAGE_CONTENT[publicPath];

  return {
    key: `legal:${slug}`,
    slug,
    title: meta?.title ?? title,
    description: meta?.summary ?? description,
    publicPath,
    group: "legal",
    policyType,
    defaultContent: contentForPath(publicPath)
  };
}

const aboutEntry = registryFromPlatform("info:about", "/about", "info", "account");
const contactEntry = registryFromPlatform("info:contact", "/contact", "info", "community");
const legalIndexEntry = registryFromPlatform("legal:index", "/legal", "legal", "content");

export const SITE_PAGE_REGISTRY: SitePageRegistryEntry[] = [
  ...(aboutEntry ? [aboutEntry] : []),
  ...(contactEntry ? [contactEntry] : []),
  ...(legalIndexEntry ? [legalIndexEntry] : []),
  legalPage("terms", "Điều khoản sử dụng", "Điều khoản và giới hạn trách nhiệm khi sử dụng ChapMee.", "account"),
  legalPage("privacy", "Chính sách quyền riêng tư", "Cách ChapMee thu thập và sử dụng dữ liệu cá nhân.", "privacy"),
  legalPage("cookies", "Chính sách cookie", "Cookie và công nghệ tương tự trên ChapMee."),
  legalPage(
    "content-policy",
    "Chính sách nội dung",
    "Quy định nội dung được phép, hạn chế và bị cấm trên ChapMee."
  ),
  legalPage(
    "community-guidelines",
    "Nguyên tắc cộng đồng",
    "Quy tắc tương tác lành mạnh trên ChapMee.",
    "community"
  ),
  legalPage(
    "copyright",
    "Chính sách bản quyền",
    "Cách ChapMee tiếp nhận, xem xét và xử lý báo cáo vi phạm bản quyền."
  ),
  legalPage(
    "dmca",
    "Chính sách DMCA",
    "Cơ chế báo cáo và xử lý nội dung bị cho là xâm phạm bản quyền."
  ),
  legalPage(
    "advertising-policy",
    "Chính sách quảng cáo",
    "Quy định hiển thị quảng cáo, nội dung tài trợ và hành vi liên quan trên ChapMee.",
    "advertising"
  ),
  legalPage(
    "business-info",
    "Thông tin chủ sở hữu website",
    "Thông tin đơn vị vận hành phục vụ thông báo Bộ Công Thương.",
    "account"
  ),
  legalPage("payment-policy", "Chính sách thanh toán", "Thanh toán và giao dịch trên nền tảng.", "monetization"),
  legalPage("refund-policy", "Chính sách hoàn tiền", "Điều kiện hoàn tiền.", "monetization"),
  legalPage("service-delivery", "Chính sách cung ứng dịch vụ số", "Cung ứng dịch vụ số cho người dùng.", "monetization"),
  legalPage("complaints-disputes", "Khiếu nại & tranh chấp", "Tiếp nhận và xử lý khiếu nại.", "community"),
  legalPage(
    "marketplace-regulation",
    "Quy chế hoạt động nền tảng ChapMee",
    "Nguyên tắc vận hành, quyền và nghĩa vụ các bên khi sử dụng ChapMee.",
    "creator"
  ),
  legalPage(
    "creator-terms",
    "Điều khoản dành cho tác giả",
    "Điều kiện và trách nhiệm khi sử dụng Studio và đăng nội dung.",
    "creator"
  ),
  legalPage(
    "creator-monetization-policy",
    "Chính sách kiếm tiền tác giả",
    "Điều kiện, hình thức kiếm tiền, ghi nhận doanh thu và rút tiền.",
    "monetization"
  ),
  legalPage(
    "creator-verification-policy",
    "Chính sách xác minh tác giả",
    "Mục đích, điều kiện và quy trình xác minh tác giả.",
    "creator"
  )
];

export function getSitePageRegistryEntry(publicPath: string): SitePageRegistryEntry | null {
  return SITE_PAGE_REGISTRY.find((entry) => entry.publicPath === publicPath) ?? null;
}

export function getSitePageRegistryEntryByKey(key: string): SitePageRegistryEntry | null {
  return SITE_PAGE_REGISTRY.find((entry) => entry.key === key) ?? null;
}

export function listSitePagesByGroup(group: SitePageGroup | "all" = "all") {
  if (group === "all") return SITE_PAGE_REGISTRY;
  return SITE_PAGE_REGISTRY.filter((entry) => entry.group === group);
}
