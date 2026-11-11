import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background-color,color,border-color,box-shadow,transform] duration-300 ease-[var(--ease-out-expo)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-white text-ink hover:bg-blue hover:text-white hover:shadow-[0_0_0_1px_rgb(75_123_255),0_10px_40px_-8px_rgb(75_123_255/0.7)]",
        accent:
          "bg-blue text-white shadow-[0_10px_40px_-12px_rgb(75_123_255/0.8)] hover:bg-[#6390ff] hover:shadow-[0_14px_50px_-10px_rgb(75_123_255/0.9)]",
        outline: "border border-line-strong text-white hover:border-white/40 hover:bg-white/[0.04]",
        ghost: "text-fog hover:text-white hover:bg-white/[0.05]",
        link: "text-white underline-offset-4 hover:underline px-0",
      },
      size: {
        sm: "h-9 rounded-full px-4 text-sm",
        md: "h-11 rounded-full px-5 text-[0.9375rem]",
        lg: "h-14 rounded-full px-7 text-base",
        icon: "size-11 rounded-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { buttonVariants };
