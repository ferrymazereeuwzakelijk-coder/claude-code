import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-12 w-full rounded-md border border-input bg-ink-2 px-4 text-base text-white placeholder:text-mist/70",
        "transition-colors focus-visible:border-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/30",
        "aria-[invalid=true]:border-destructive disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
