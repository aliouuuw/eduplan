"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

// Tabs between the pages of one section (e.g. École: Classes, Niveaux, Matières, Enseignants).
// Links, not Radix tabs: each one is its own route.
export function SectionNav({ sections }: { sections: { prefixes: string[]; links: { href: string; label: string }[] }[] }) {
  const pathname = usePathname()
  const section = sections.find((s) => s.prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`)))
  if (!section) return null

  return (
    <nav aria-label="Pages de la section" className="mb-6 flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-white/55 p-1">
      {section.links.map((l) => {
        const on = pathname === l.href || pathname.startsWith(`${l.href}/`)
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "flex h-10 shrink-0 items-center rounded-full px-[18px] text-[14.5px] font-medium transition-[background-color,color,box-shadow]",
              on ? "bg-card text-foreground shadow-tab" : "text-ink-2 hover:bg-white/70 hover:text-foreground"
            )}
          >
            {l.label}
          </Link>
        )
      })}
    </nav>
  )
}
