import Image from "next/image";
import Script from "next/script";
import { CHAPMEE_DMCA_BADGE } from "@/lib/compliance/chapmee-dmca-badge";

export function DmcaProtectionBadge() {
  return (
    <>
      <a
        className="dmca-badge inline-flex shrink-0"
        href={CHAPMEE_DMCA_BADGE.statusUrl}
        rel="noopener noreferrer"
        target="_blank"
        title={CHAPMEE_DMCA_BADGE.title}
      >
        <Image
          alt={CHAPMEE_DMCA_BADGE.alt}
          className="h-4 w-[120px] object-contain"
          height={16}
          src={CHAPMEE_DMCA_BADGE.imageUrl}
          unoptimized
          width={120}
        />
      </a>
      <Script src={CHAPMEE_DMCA_BADGE.helperScript} strategy="lazyOnload" />
    </>
  );
}
