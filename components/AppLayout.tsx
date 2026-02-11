import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <main className="w-full bg-background">
                <div className="flex h-16 items-center border-b px-8 bg-white/50 backdrop-blur-sm sticky top-0 z-50">
                    <SidebarTrigger />
                    <div className="ml-4 text-sm font-bold text-foreground/60 font-sans tracking-tight">Tax4Us Agent Platform</div>
                </div>
                <div className="p-4 md:p-10">
                    {children}
                </div>
            </main>
        </SidebarProvider>
    )
}
