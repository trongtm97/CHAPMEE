import { fetchAppSettingByKey } from "@/lib/data/app-settings";

export async function getAdminCoinGrantMaxPerAction() {
  const setting = await fetchAppSettingByKey("admin.coin_grant_max_per_action");
  const value = setting?.value;
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : 10000;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10000;
}
