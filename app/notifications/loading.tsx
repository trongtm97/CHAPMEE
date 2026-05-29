import { NotificationSkeleton } from "@/components/notifications/NotificationSkeleton";
import { MobileBackHeader } from "@/components/me/MobileBackHeader";

export default function NotificationsLoadingPage() {
  return (
    <section className="space-y-3">
      <MobileBackHeader fallbackHref="/me" title="Thông báo" variant="compact" />
      <div className="h-9 animate-pulse rounded-full bg-white/6" />
      <NotificationSkeleton />
    </section>
  );
}
