// Shared navigation data - single source of truth for all navigation items
export const navigationData = [
  {
    title: "Dashboard",
    url: "/",
  },
  {
    title: "Repositories",
    url: "/repositories",
  },
  {
    title: "Contributors",
    url: "/contributors",
  },
];

// Helper function to get title by pathname
export function getTitleByPathname(pathname: string): string {
  const item = navigationData.find((item) => item.url === pathname);
  return item?.title ?? "Dashboard";
}
