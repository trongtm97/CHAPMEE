import type { Metadata } from "next";
import {
  buildTaxonomyLandingMetadata,
  loadTaxonomyLandingRoute,
  TaxonomyLandingRouteView
} from "@/lib/discovery/taxonomy-landing-route";

export type TaxonomyLandingPageKey =
  | "tag"
  | "boi-canh"
  | "cam-giac"
  | "dinh-dang"
  | "nhan-vat"
  | "quan-he"
  | "phong-cach"
  | "canh-bao"
  | "tinh-trang"
  | "goi-truy-cap"
  | "loai-truyen"
  | "do-tuoi"
  | "the-loai-phu"
  | "the-loai";

type LandingCopy = {
  segment: string;
  notFoundTitle: string;
};

export const TAXONOMY_LANDING_PAGE_CONFIG: Record<TaxonomyLandingPageKey, LandingCopy> = {
  tag: {
    segment: "tag",
    notFoundTitle: "Tag không tồn tại"
  },
  "boi-canh": {
    segment: "boi-canh",
    notFoundTitle: "Không tìm thấy bối cảnh"
  },
  "cam-giac": {
    segment: "cam-giac",
    notFoundTitle: "Không tìm thấy cảm giác đọc"
  },
  "dinh-dang": {
    segment: "dinh-dang",
    notFoundTitle: "Không tìm thấy định dạng"
  },
  "nhan-vat": {
    segment: "nhan-vat",
    notFoundTitle: "Không tìm thấy nhãn nhân vật"
  },
  "quan-he": {
    segment: "quan-he",
    notFoundTitle: "Không tìm thấy quan hệ"
  },
  "phong-cach": {
    segment: "phong-cach",
    notFoundTitle: "Không tìm thấy phong cách"
  },
  "canh-bao": {
    segment: "canh-bao",
    notFoundTitle: "Cảnh báo không tồn tại"
  },
  "tinh-trang": {
    segment: "tinh-trang",
    notFoundTitle: "Trạng thái không tồn tại"
  },
  "goi-truy-cap": {
    segment: "goi-truy-cap",
    notFoundTitle: "Gói truy cập không tồn tại"
  },
  "loai-truyen": {
    segment: "loai-truyen",
    notFoundTitle: "Loại truyện không tồn tại"
  },
  "do-tuoi": {
    segment: "do-tuoi",
    notFoundTitle: "Độ tuổi không tồn tại"
  },
  "the-loai-phu": {
    segment: "the-loai-phu",
    notFoundTitle: "Không tìm thấy thể loại phụ"
  },
  "the-loai": {
    segment: "the-loai",
    notFoundTitle: "Không tìm thấy thể loại"
  }
};

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export function defineTaxonomyLandingPage(key: TaxonomyLandingPageKey) {
  const copy = TAXONOMY_LANDING_PAGE_CONFIG[key];

  async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    return buildTaxonomyLandingMetadata(copy.segment, slug, {
      notFoundTitle: copy.notFoundTitle,
      searchParams: await searchParams
    });
  }

  async function Page({ params, searchParams }: PageProps) {
    const { slug } = await params;
    const route = await loadTaxonomyLandingRoute(copy.segment, slug, await searchParams);
    return <TaxonomyLandingRouteView {...route} />;
  }

  return { generateMetadata, Page };
}
