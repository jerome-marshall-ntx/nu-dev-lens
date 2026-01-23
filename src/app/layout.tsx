import "@/styles/globals.css";

import { type Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";

import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TRPCReactProvider } from "@/trpc/react";

export const metadata: Metadata = {
  title: "NuDev Lens",
  description: "NuDev Lens",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TRPCReactProvider>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <AppHeader />
              <div className="p-4">{children}</div>
            </SidebarInset>
          </SidebarProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
