"use client";

import { HomeQuickForm } from "@/components/utilities/love-insight/forms/HomeQuickForm";
import { Container } from "@/components/utilities/love-insight/layout/Container";
import { LoveInsightShell } from "@/components/utilities/love-insight/LoveInsightShell";
import { Disclaimer } from "@/components/utilities/love-insight/ui/Disclaimer";

export function LoveReadingCalculator() {
  return (
    <LoveInsightShell>
      <section className="relative overflow-hidden">
        <Container className="py-8 text-center sm:py-12">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-gold-300">
            ✦ ChapMee Bói Tình Yêu ✦
          </p>
          <h1 className="text-display mx-auto max-w-3xl text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl">
            <span className="text-gradient-rose">Khám phá mức độ hợp nhau</span> của hai bạn
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-lavender-200 sm:text-base">
            Nhập tên hai người để bói nhanh — thêm ngày sinh để phân tích sâu hơn qua thần số học, cung
            hoàng đạo, con giáp và ngũ hành.
          </p>

          <div className="mx-auto mt-8 max-w-2xl text-left">
            <HomeQuickForm />
          </div>
        </Container>
      </section>

      <Container className="pb-6">
        <Disclaimer />
      </Container>
    </LoveInsightShell>
  );
}
