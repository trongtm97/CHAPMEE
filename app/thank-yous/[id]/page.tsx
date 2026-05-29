import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthorThankYouCard } from "@/components/thankyou";
import { getThankYouById } from "@/lib/supabase/thank-yous";

export const dynamic = "force-dynamic";

type ThankYouPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: ThankYouPageProps): Promise<Metadata> {
  const { id } = await params;
  const thankYou = await getThankYouById(id);
  if (!thankYou) {
    return { title: "Thank you not found", description: "Lời cảm ơn không tồn tại hoặc không công khai." };
  }

  return {
    title: `Lời cảm ơn từ ${thankYou.authorName}`,
    description: thankYou.message
  };
}

export default async function ThankYouPage({ params }: ThankYouPageProps) {
  const { id } = await params;
  const thankYou = await getThankYouById(id);

  if (!thankYou) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="page-kicker">Thank You</p>
        <h1 className="page-title">Lời cảm ơn từ tác giả</h1>
        <p className="page-copy">Một card ngắn gọn để chụp màn hình và chia sẻ.</p>
      </section>
      <AuthorThankYouCard thankYou={thankYou} />
    </div>
  );
}
