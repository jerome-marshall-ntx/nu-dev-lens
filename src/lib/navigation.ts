import {
  FolderGit2,
  LayoutDashboard,
  Users
} from "lucide-react";

// Shared navigation data - single source of truth for all navigation items
export const navigationData = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    description: "Overview & stats",
  },
  {
    title: "Repositories",
    url: "/repositories",
    icon: FolderGit2,
    description: "Browse repositories",
  },
  {
    title: "Contributors",
    url: "/contributors",
    icon: Users,
    description: "View contributors",
  }
];

// Helper function to get title by pathname
export function getTitleByPathname(pathname: string): string {
  const item = navigationData.find((item) => item.url === pathname);
  return item?.title ?? "Dashboard";
}
