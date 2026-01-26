"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { navigationData } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { PanelLeftClose, PanelLeftOpen, Settings } from "lucide-react";

function SidebarToggleMenuItem() {
  const { toggleSidebar, state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <SidebarMenuItem>
      <SidebarMenuButton onClick={toggleSidebar} tooltip="Toggle Sidebar">
        {isCollapsed ? (
          <PanelLeftOpen className="h-4 w-4 text-muted-foreground" />
        ) : (
          <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
        )}
        <span>{isCollapsed ? "Expand" : "Collapse"}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar {...props} variant="floating" collapsible="icon">
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-3 px-2">
          <Image
            src="/logo.png"
            alt="NuDevLens Logo"
            width={40}
            height={40}
            className="rounded-lg"
          />
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-semibold tracking-tight">NuDev Lens</span>
            <span className="text-xs text-muted-foreground">
              Developer Insights
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationData.map((item) => {
                const isActive = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link
                        href={item.url}
                        className={cn(
                          "flex items-center gap-3",
                          isActive && "font-medium",
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-4 w-4",
                            isActive
                              ? "text-primary"
                              : "text-muted-foreground",
                          )}
                        />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Settings">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarToggleMenuItem />
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
