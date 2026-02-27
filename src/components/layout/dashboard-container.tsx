import { cn } from "@/lib/utils";

interface DashboardContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Main container for dashboard layouts.
 * Centers content with max-width of 1100px and handles responsive padding.
 */
export function DashboardContainer({
  children,
  className,
}: DashboardContainerProps) {
  return (
    <div className={cn("w-full mx-auto px-4 md:px-6 lg:px-20", className)}>
      {children}
    </div>
  );
}
