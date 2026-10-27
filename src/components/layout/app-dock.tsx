"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardCheck,
  FileText,
  House,
  Inbox,
  LayoutGrid,
  LineChart,
  MessageCircle,
  NotebookPen,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react"

import { activeHref, type IconKey, type NavItem } from "@/lib/navigation"
import { cn } from "@/lib/utils"

const ICONS: Record<IconKey, LucideIcon> = {
  home: House,
  classes: LayoutGrid,
  notes: FileText,
  attendance: ClipboardCheck,
  messages: MessageCircle,
  agenda: CalendarDays,
  work: NotebookPen,
  subjects: BookOpen,
  school: Building2,
  people: Users,
  tracking: LineChart,
  settings: Settings,
  schools: Building2,
  requests: Inbox,
}

// The A+ navigation: labelled icons (D23), the active item lifted on a white sheet.
// From md up it is a vertical dock on the ground; on phones a bottom tab bar (attendance is phone first, D22).
export function AppDock({ items, end, className }: { items: NavItem[]; end?: React.ReactNode; className?: string }) {
  const pathname = usePathname()
  const active = activeHref(items, pathname)

  return (
    <nav
      aria-label="Navigation principale"
      className={cn(
        // phone: bottom bar
        "fixed inset-x-0 bottom-0 z-40 flex items-start justify-around bg-card/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-10px_24px_-20px_rgb(90_71_199/0.45)] backdrop-blur-md",
        // md+: vertical dock
        "md:sticky md:top-0 md:h-screen md:w-[72px] md:flex-col md:items-center md:justify-start md:gap-2.5 md:bg-transparent md:px-0 md:pt-7 md:pb-7 md:shadow-none md:backdrop-blur-none",
        className
      )}
    >
      <Link
        href={items[0]?.href ?? "/"}
        aria-label="EduPlan, accueil"
        className="mb-6 hidden size-10 place-items-center rounded-[14px] fill-primary font-display text-lg text-primary-foreground md:grid"
      >
        e
      </Link>
      {items.map(({ href, label, icon }) => {
        const on = href === active
        const Icon = ICONS[icon]
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "group flex min-w-0 flex-col items-center gap-1 text-[11px] transition-colors md:mb-1.5 md:text-[11.5px]",
              on ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span
              className={cn(
                "grid h-9 w-12 place-items-center rounded-[14px] transition-[background-color,box-shadow] md:h-10",
                on ? "bg-progress-faint text-progress-ink md:bg-card md:shadow-tab" : "group-hover:bg-white/60"
              )}
            >
              <Icon className="size-5" strokeWidth={1.7} />
            </span>
            {label}
          </Link>
        )
      })}
      {end && <div className="hidden md:mt-auto md:flex md:flex-col md:items-center md:gap-3.5 md:text-muted-foreground">{end}</div>}
    </nav>
  )
}

