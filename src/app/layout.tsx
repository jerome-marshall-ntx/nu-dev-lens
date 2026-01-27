import "@/styles/globals.css";

import { type Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";

import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
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
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TRPCReactProvider>
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset className="h-svh overflow-hidden">
                <div className="h-full min-w-0 flex-1 overflow-y-auto p-6">
                  {children}
                </div>
              </SidebarInset>
            </SidebarProvider>
          </TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
