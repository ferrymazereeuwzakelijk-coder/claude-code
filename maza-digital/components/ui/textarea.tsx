import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-40 w-full rounded-md border border-input bg-ink-2 px-4 py-3 text-base leading-relaxed text-white placeholder:text-mist/70",
        "transition-colors focus-visible:border-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/30",
        "aria-[invalid=true]:border-destructive disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
