import { AppSearchBar } from "@/components/ui/AppSearchBar";

type DiscoverSearchBarProps = {
  initialQuery?: string;
};

/** @deprecated Dùng AppSearchBar — giữ export để tương thích import cũ. */
export function DiscoverSearchBar({ initialQuery = "" }: DiscoverSearchBarProps) {
  return <AppSearchBar catalogNavigation defaultValue={initialQuery} />;
}
