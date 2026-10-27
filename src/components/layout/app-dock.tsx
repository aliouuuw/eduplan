"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

// `icon` is a rendered element (e.g. <House />): server pages can pass it, a component function could not cross into this client component.
export type DockItem = { href: string; label: string; icon: React.ReactNode }

// The A+ navigation: labelled icons on the ground (D23), the active item lifted on a white sheet.
// `end` holds what sits at the bottom (notifications, account).
export function AppDock({ items, end, className }: { items: DockItem[]; end?: React.ReactNode; className?: string }) {
  const pathname = usePathname()
  // the longest matching href wins, so /dashboard/teacher/classes does not also light up /dashboard/teacher
  const active = items
    .filter((it) => pathname === it.href || pathname.startsWith(`${it.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href

  return (
    <nav aria-label="Navigation principale" className={cn("flex w-[72px] flex-col items-center gap-2.5", className)}>
      <Link
        href={items[0]?.href ?? "/"}
        aria-label="EduPlan, accueil"
        className="mb-6 grid size-10 place-items-center rounded-[14px] fill-primary font-display text-lg text-primary-foreground"
      >
        e
      </Link>
      {items.map(({ href, label, icon }) => {
        const on = href === active
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "group mb-1.5 flex flex-col items-center gap-1 text-[11.5px] transition-colors",
              on ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span
              className={cn(
                "grid h-10 w-12 place-items-center rounded-[14px] transition-[background-color,box-shadow]",
                on ? "bg-card text-progress-ink shadow-tab" : "group-hover:bg-white/60"
              )}
            >
              <span className="[&_svg]:size-5 [&_svg]:stroke-[1.7]">{icon}</span>
            </span>
            {label}
          </Link>
        )
      })}
      {end && <div className="mt-auto flex flex-col items-center gap-3.5 text-muted-foreground">{end}</div>}
    </nav>
  )
}
