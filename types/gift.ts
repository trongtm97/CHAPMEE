export type GiftRarity = "common" | "rare" | "epic" | "legendary";

export type VirtualGift = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  coin_price: number;
  icon_url: string | null;
  emoji: string | null;
  rarity: GiftRarity;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};
