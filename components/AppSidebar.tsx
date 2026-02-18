"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
    SquareTerminal,
    LayoutDashboard,
    FileText,
    Sparkles,
    PieChart,
    LifeBuoy,
    Video,
    Users,
    TrendingUp,
    Library,
} from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
} from "@/components/ui/sidebar"

// Menu items.
const navMain = [
    {
        title: "Executive Center",
        url: "/executive-center",
        icon: LayoutDashboard,
    },
    {
        title: "Content Generation",
        url: "/content-generation",
        icon: Video,
    },
    {
        title: "Overview",
        url: "/",
        icon: PieChart,
    },
    {
        title: "Topics & Ideas",
        url: "/topics",
        icon: FileText,
    },
    {
        title: "Content Library",
        url: "/content-library",
        icon: Library,
    },
    {
        title: "Analytics",
        url: "/analytics",
        icon: PieChart,
    },
    {
        title: "Production Roadmap",
        url: "/content-pipeline",
        icon: SquareTerminal,
    },
    {
        title: "Factory Controls",
        url: "/generators",
        icon: Sparkles,
    },
    {
        title: "Lead Generation",
        url: "/lead-generation",
        icon: Users,
    },
    {
        title: "Content Optimization",
        url: "/content-optimization",
        icon: TrendingUp,
    },
    {
        title: "Video Studio",
        url: "/video-studio",
        icon: Video,
    },
]

const navSecondary = [
    {
        title: "Support",
        url: "https://api.whatsapp.com/send?phone=972543022554&text=Hi%20Shai,%20I%20need%20help%20with%20Tax4US%20platform",
        icon: LifeBuoy,
    },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname()
    
    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader className="border-b h-16 flex items-center px-4 bg-primary text-white">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild className="hover:bg-white/10 active:bg-white/20 transition-colors">
                            <a href="/" className="flex items-center gap-3">
                                <div className="relative aspect-square size-9 shrink-0 overflow-hidden rounded-lg border border-white/20 shadow-lg ring-1 ring-white/10 transition-transform hover:scale-105 active:scale-95">
                                    <img
                                        src="/rob-avatar.png"
                                        alt="Rob Lubow"
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                                <div className="flex flex-col leading-tight">
                                    <span className="truncate font-bold text-lg font-heading">Tax4US</span>
                                    <span className="truncate text-[10px] uppercase tracking-widest opacity-70 font-sans">Content Factory</span>
                                </div>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent className="bg-white">
                <SidebarGroup>
                    <SidebarGroupLabel className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest py-4">Menu</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu className="px-2 space-y-1">
                            {navMain.map((item) => {
                                const isActive = pathname === item.url || (item.url === "/executive-center" && pathname === "/")
                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            tooltip={item.title}
                                            isActive={isActive}
                                            className="h-11 rounded-lg px-3 transition-all hover:bg-muted active:scale-[0.98] data-[active=true]:bg-primary/5 data-[active=true]:text-primary"
                                        >
                                            <a href={item.url} className="flex items-center gap-3 font-medium">
                                                {item.icon && <item.icon className="size-5" />}
                                                <span>{item.title}</span>
                                            </a>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                <div className="flex-1" />
                <SidebarGroup className="mt-auto border-t">
                    <SidebarGroupContent>
                        <SidebarMenu className="px-2 py-2">
                            {navSecondary.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild size="sm" className="h-9 hover:bg-muted rounded-md text-muted-foreground">
                                        <a href={item.url} className="flex items-center gap-3">
                                            <item.icon className="size-4" />
                                            <span className="text-sm font-medium">{item.title}</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <div className="p-4 text-[10px] uppercase tracking-widest text-muted-foreground/30 text-center font-bold">
                Tax4US Content Factory • AI
            </div>
            <SidebarRail />
        </Sidebar>
    )
}
