import { PublicLegalLinks } from "@/components/layout/PublicLegalLinks";



/**

 * Desktop-only legal links on homepage / Reels — Google OAuth verification

 * requires an easily accessible privacy policy link on https://chapmee.com/

 */

export function HomepageLegalBar() {

  return (

    <footer

      className="pointer-events-none absolute inset-y-0 right-0 z-20 hidden items-center md:flex"

      role="contentinfo"

    >

      <PublicLegalLinks

        className="pointer-events-auto mr-6 rounded-2xl border border-white/[0.08] bg-[#070b10]/75 px-4 py-3 text-[11px] text-zinc-500 shadow-[0_16px_48px_rgba(0,0,0,0.4)] backdrop-blur-xl lg:mr-8 lg:px-5 lg:py-3.5 lg:text-xs"

        emphasizePrivacy

        itemClassName="py-0.5"

        layout="vertical"

      />

    </footer>

  );

}


