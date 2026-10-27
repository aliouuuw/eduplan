"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

// The active tab is marked by a white sheet that slides between triggers. Without JS (or before the
// first measure) each active trigger keeps its own white fill, so the state is never hidden.
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, ref) => {
  const listRef = React.useRef<HTMLDivElement | null>(null)
  const pillRef = React.useRef<HTMLSpanElement | null>(null)

  React.useEffect(() => {
    const list = listRef.current
    const pill = pillRef.current
    if (!list || !pill) return
    const place = () => {
      const active = list.querySelector<HTMLElement>('[role="tab"][data-state="active"]')
      if (!active) return
      pill.style.width = `${active.offsetWidth}px`
      pill.style.transform = `translateX(${active.offsetLeft}px)`
      list.dataset.ready = ""
    }
    place()
    const mo = new MutationObserver(place)
    mo.observe(list, { subtree: true, attributes: true, attributeFilter: ["data-state"] })
    const ro = new ResizeObserver(place)
    ro.observe(list)
    return () => {
      mo.disconnect()
      ro.disconnect()
    }
  }, [])

  return (
    <TabsPrimitive.List
      ref={(node) => {
        listRef.current = node
        if (typeof ref === "function") ref(node)
        else if (ref) ref.current = node
      }}
      className={cn(
        "group/tabs relative inline-flex w-fit items-center gap-1 rounded-full bg-white/55 p-1 text-ink-2",
        className
      )}
      {...props}
    >
      <span
        ref={pillRef}
        aria-hidden
        className="pointer-events-none absolute top-1 left-0 h-10 rounded-full bg-card opacity-0 shadow-tab transition-[transform,width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[ready]/tabs:opacity-100"
      />
      {children}
    </TabsPrimitive.List>
  )
})
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative z-10 inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full px-[18px] text-[14.5px] font-medium transition-[background-color,color,box-shadow] hover:bg-white/70 hover:text-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-tab group-data-[ready]/tabs:data-[state=active]:bg-transparent group-data-[ready]/tabs:data-[state=active]:shadow-none",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-6",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }

