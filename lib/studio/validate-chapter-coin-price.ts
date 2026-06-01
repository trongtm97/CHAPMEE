import { validateNoExternalContact } from "@/lib/profile/validate-no-external-contact";
import { validateStudioCoinPrice } from "@/lib/studio/validate-coin-price";
import type { StudioMonetizationConfigView } from "@/types/studio-monetization";

export const TIP_THANK_YOU_EXTERNAL_CONTACT_ERROR =
  "Nội dung không được chứa thông tin liên hệ hoặc liên kết ngoài nền tảng.";

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

  const check = validateStudioCoinPrice(Math.round(coinPrice), { allowFree: true });
  if (!check.ok) {
    return check;
  }

  const price = check.price ?? defaultPrice;

  if (price < config.paidChapterMinCoinPrice || price > config.paidChapterMaxCoinPrice) {
    return {
      ok: false,
      error: `Giá phải từ ${config.paidChapterMinCoinPrice} đến ${config.paidChapterMaxCoinPrice} ${config.coinDisplayName}.`
    };
  }

  return { ok: true, price };
}

export function validateTipThankYouMessage(message: string) {
  const trimmed = message.trim();

  if (trimmed.length > 280) {
    return { ok: false as const, error: "Lời cảm ơn tối đa 280 ký tự." };
  }

  const contactCheck = validateNoExternalContact(trimmed);
  if (!contactCheck.ok) {
    return { ok: false as const, error: TIP_THANK_YOU_EXTERNAL_CONTACT_ERROR };
  }

  return { ok: true as const, message: trimmed };
}
