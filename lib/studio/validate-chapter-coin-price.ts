import type { StudioMonetizationConfigView } from "@/types/studio-monetization";

export function buildAllowedCoinPriceOptions(config: StudioMonetizationConfigView) {
  const min = config.paidChapterMinCoinPrice;
  const max = config.paidChapterMaxCoinPrice;
  const options: number[] = [];

  for (let price = min; price <= max; price += 5) {
    options.push(price);
  }

  if (!options.includes(config.paidChapterDefaultCoinPrice)) {
    options.push(config.paidChapterDefaultCoinPrice);
  }

  return [...new Set(options)].sort((a, b) => a - b);
}

export function validateChapterCoinPrice(
  config: StudioMonetizationConfigView,
  coinPrice: number | null
): { ok: true; price: number } | { ok: false; error: string } {
  const defaultPrice = config.paidChapterDefaultCoinPrice;

  if (!config.paidChapterAllowCustomPrice) {
    return { ok: true, price: defaultPrice };
  }

  if (coinPrice == null || !Number.isFinite(coinPrice)) {
    return { ok: true, price: defaultPrice };
  }

  const rounded = Math.round(coinPrice);

  if (rounded < config.paidChapterMinCoinPrice || rounded > config.paidChapterMaxCoinPrice) {
    return {
      ok: false,
      error: `Giá phải từ ${config.paidChapterMinCoinPrice} đến ${config.paidChapterMaxCoinPrice} ${config.coinDisplayName}.`
    };
  }

  return { ok: true, price: rounded };
}

export function validateTipThankYouMessage(message: string) {
  const trimmed = message.trim();

  if (trimmed.length > 280) {
    return { ok: false as const, error: "Lời cảm ơn tối đa 280 ký tự." };
  }

  if (/https?:\/\//i.test(trimmed) || /www\./i.test(trimmed)) {
    return { ok: false as const, error: "Lời cảm ơn không được chứa link." };
  }

  return { ok: true as const, message: trimmed };
}
