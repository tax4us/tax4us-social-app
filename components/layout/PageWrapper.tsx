import { cn } from "@/lib/utils"

interface PageWrapperProps {
  children: React.ReactNode
  className?: string
}

export function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <div className={cn("flex-1 space-y-6 p-8 pt-6 max-w-[1920px] mx-auto", className)}>
      {children}
    </div>
  )
}