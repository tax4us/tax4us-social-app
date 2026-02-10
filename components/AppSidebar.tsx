"use client"

import * as React from "react"
import {
    SquareTerminal,
    LayoutDashboard,
    FileText,
    Sparkles,
    PieChart,
    LifeBuoy,
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
        title: "Overview",
        url: "/",
        icon: LayoutDashboard,
        isActive: true,
    },
    {
        title: "Topics & Ideas",
        url: "/topics",
        icon: FileText,
    },
    {
        title: "Performance",
        url: "/analytics",
        icon: PieChart,
    },
    {
        title: "Content Pipeline",
        url: "/content-pipeline",
        icon: SquareTerminal,
    },
    {
        title: "Generators",
        url: "/generators",
        icon: Sparkles,
    },
]

const navSecondary = [
    {
        title: "Support",
        url: "mailto:support@tax4us.com",
        icon: LifeBuoy,
    },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader className="border-b h-16 flex items-center px-4 bg-primary text-white">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild className="hover:bg-white/10 active:bg-white/20 transition-colors">
                            <a href="/" className="flex items-center gap-3">
                                <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-white/20 text-white shadow-sm font-bold text-lg font-heading">
                                    T
                                </div>
                                <div className="flex flex-col leading-tight">
                                    <span className="truncate font-bold text-lg font-heading">Tax4Us</span>
                                    <span className="truncate text-[10px] uppercase tracking-widest opacity-70 font-sans">Agent Console</span>
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
                            {navMain.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        tooltip={item.title}
                                        isActive={item.isActive}
                                        className="h-11 rounded-lg px-3 transition-all hover:bg-muted active:scale-[0.98] data-[active=true]:bg-primary/5 data-[active=true]:text-primary"
                                    >
                                        <a href={item.url} className="flex items-center gap-3 font-medium">
                                            {item.icon && <item.icon className="size-5" />}
                                            <span>{item.title}</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
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
            <SidebarFooter className="border-t bg-muted/30">
                <div className="p-4 text-[10px] uppercase tracking-widest text-muted-foreground/50 text-center font-bold">
                    v1.0.0 • B.L.A.S.T.
                </div>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
