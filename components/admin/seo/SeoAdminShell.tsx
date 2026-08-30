"use client";



import Link from "next/link";

import { usePathname } from "next/navigation";

import { SeoQuickPathBar } from "@/components/admin/seo/SeoQuickPathBar";



const NAV_ITEMS = [

  { href: "/admin/seo", label: "Dashboard", exact: true },

  { href: "/admin/seo/pages", label: "Pages", exact: false },

  { href: "/admin/seo/settings", label: "Settings", exact: false },

  { href: "/admin/seo/overrides", label: "Overrides", exact: false },

  { href: "/admin/seo/content-blocks", label: "Content", exact: false },

  { href: "/admin/seo/sitemap", label: "Sitemap", exact: false },

  { href: "/admin/seo/redirects", label: "Redirects", exact: false },

  { href: "/admin/seo/404-monitor", label: "404", exact: false },

  { href: "/admin/seo/audit", label: "Audit", exact: false },

  { href: "/admin/seo/control", label: "Control", exact: false }

] as const;



const EXTERNAL_ITEMS = [

  { href: "/sitemap.xml", label: "Sitemap" },

  { href: "/robots.txt", label: "Robots" }

] as const;



type Props = {

  children: React.ReactNode;

};



export function SeoAdminShell({ children }: Props) {

  const pathname = usePathname();



  function isActive(href: string, exact: boolean) {

    if (exact) {

      return pathname === href;

    }

    return pathname === href || pathname.startsWith(`${href}/`);

  }



  return (

    <div className="space-y-6">

      <SeoQuickPathBar />



      <nav className="flex flex-wrap gap-2 border-b border-white/10 pb-4">

        {NAV_ITEMS.map((item) => (

          <Link

            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${

              isActive(item.href, item.exact)

                ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"

                : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200"

            }`}

            href={item.href}

            key={item.href}

          >

            {item.label}

          </Link>

        ))}

        {EXTERNAL_ITEMS.map((item) => (

          <a

            className="rounded-full border border-white/10 px-3 py-1.5 text-sm font-medium text-zinc-500 transition hover:border-emerald-400/30 hover:text-emerald-200"

            href={item.href}

            key={item.href}

            rel="noopener noreferrer"

            target="_blank"

          >

            {item.label} ↗

          </a>

        ))}

      </nav>

      {children}

    </div>

  );

}

