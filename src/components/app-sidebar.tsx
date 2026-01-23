"use client";

import Image from "next/image";
import * as React from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { Separator } from "./ui/separator";

// Sidebar navigation data - can be customized based on project
const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/",
    },
    {
      title: "Repository",
      url: "/",
    },
    {
      title: "Contributors",
      url: "/",
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props} variant="floating">
      <SidebarHeader className="p-4">
        <div className="-my-4 flex flex-col items-center">
          <Image
            src="/logo.png"
            alt="NuDevLens Logo"
            width={120}
            height={120}
            className="rounded-md"
          />
        </div>
      </SidebarHeader>
      <Separator />
      <SidebarContent>
        <SidebarGroup>
          {/* <SidebarGroupLabel>Navigation</SidebarGroupLabel> */}
          <SidebarGroupContent>
            <SidebarMenu>
              {data.navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>{item.title}</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
