import { EmptyState, SectionHeader } from "@/components/ui";
import { AuthorThankYouCard } from "@/components/thankyou/AuthorThankYouCard";
import type { AuthorThankYouView } from "@/types/thank-you";

type ThankYouSectionProps = {
  title: string;
  subtitle?: string;
  items: AuthorThankYouView[];
  emptyTitle: string;
  emptyDescription: string;
};

export function ThankYouSection({ title, subtitle, items, emptyTitle, emptyDescription }: ThankYouSectionProps) {
  return (
    <section className="space-y-3">
      <SectionHeader subtitle={subtitle} title={title} />
      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => <AuthorThankYouCard key={item.id} thankYou={item} />)}
        </div>
      ) : (
        <EmptyState description={emptyDescription} title={emptyTitle} />
      )}
    </section>
  );
}
