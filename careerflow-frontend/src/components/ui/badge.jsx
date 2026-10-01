import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/utils/index"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        primary:
          "border-transparent bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300",
        default:
          "border-transparent bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
        secondary:
          "border-transparent bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-300",
        outline: "border-border bg-background text-foreground",
        success:
          "border-transparent bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
        warning:
          "border-transparent bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
        destructive:
          "border-transparent bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300",
        danger:
          "border-transparent bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge }
