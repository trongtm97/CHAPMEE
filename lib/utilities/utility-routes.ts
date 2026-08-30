/** Public utility routes — sitemap, SEO presets, navigation. */
export const UTILITY_PUBLIC_PATHS = [
  "/tien-ich",
  "/tien-ich/boi-tinh-yeu",
  "/tien-ich/icon",
  "/tien-ich/xoa-dau-tieng-viet",
  "/tien-ich/chuyen-so-tien-thanh-chu",
  "/tien-ich/dem-tu-ky-tu",
  "/tien-ich/chuyen-chu-hoa-thuong",
  "/tien-ich/tao-ma-qr-code",
  "/tien-ich/tinh-bmi",
  "/tien-ich/tinh-tdee",
  "/tien-ich/tinh-lai-suat",
  "/tien-ich/tinh-thue-vat",
  "/tien-ich/tinh-phan-tram",
  "/tien-ich/tinh-ngay-quan-he-an-toan",
  "/tien-ich/boi-tinh-yeu",
  "/tien-ich/pomodoro"
] as const;

export type UtilityPublicPath = (typeof UTILITY_PUBLIC_PATHS)[number];
