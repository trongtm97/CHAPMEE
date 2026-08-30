import { DISCLAIMER } from "@/lib/love-insight/shared";

export function Disclaimer() {
  return (
    <p className="rounded-xl border border-gold-300/20 bg-gold-300/5 px-4 py-3 text-xs leading-relaxed text-gold-100/80">
      <span className="mr-1 font-semibold text-gold-200">Lưu ý:</span>
      {DISCLAIMER}
    </p>
  );
}
