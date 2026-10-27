import { cn } from "@/lib/utils"

// Loading placeholder in the progress tint. Shape it like the content it stands for.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" aria-hidden className={cn("animate-pulse rounded-md bg-progress-soft/70", className)} {...props} />
}

export { Skeleton }
