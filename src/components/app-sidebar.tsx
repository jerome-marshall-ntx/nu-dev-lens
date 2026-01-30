"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
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
import { ChevronLeft, ChevronRight } from "lucide-react";

function SidebarToggleMenuItem() {
  const { toggleSidebar, state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <SidebarMenuItem>
      <SidebarMenuButton onClick={toggleSidebar} tooltip="Toggle Sidebar">
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover/menu-item:text-foreground" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover/menu-item:text-foreground" />
        )}
        <span>{isCollapsed ? "Expand" : "Collapse"}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function ThemeToggleMenuItem() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  if (!mounted) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton tooltip="Toggle Theme">
          <Sun className="h-4 w-4 text-muted-foreground group-hover/menu-item:text-foreground" />
          <span>Toggle Theme</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton onClick={toggleTheme} tooltip="Toggle Theme">
        {theme === "dark" ? (
          <Sun className="h-4 w-4 text-muted-foreground group-hover/menu-item:text-foreground" />
        ) : (
          <Moon className="h-4 w-4 text-muted-foreground group-hover/menu-item:text-foreground" />
        )}
        <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SidebarHeaderContent() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  // Keep consistent height to prevent vertical shift when collapsing
  return (
    <SidebarHeader className="p-4">
      <Link
        href="/"
        className={cn(
          "flex h-10 items-center gap-3 px-2", // h-10 = 40px to match logo height
          isCollapsed && "justify-center px-0",
        )}
      >
        {/* Logo - shown in both expanded and collapsed states */}
        <Image
          src="/logo.png"
          alt="NuDevLens Logo"
          width={40}
          height={40}
          className="rounded-lg"
        />
        {!isCollapsed && (
          <div className="flex flex-col">
            <span className="font-semibold tracking-tight">NuDev Lens</span>
            <span className="text-xs text-muted-foreground">
              Developer Insights
            </span>
          </div>
        )}
      </Link>
    </SidebarHeader>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Sidebar {...props} variant="floating" collapsible="icon">
      <SidebarHeaderContent />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationData.map((item) => {
                const isActive = mounted && pathname === item.url;
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
                              ? "text-foreground"
                              : "text-muted-foreground group-hover/menu-item:text-foreground",
                          )}
                        />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              <SidebarToggleMenuItem />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="mt-auto p-2">
        <SidebarMenu>
          <ThemeToggleMenuItem />
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
