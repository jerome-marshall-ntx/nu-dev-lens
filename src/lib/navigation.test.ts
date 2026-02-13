import { describe, expect, it } from "vitest";

import { getTitleByPathname, navigationData } from "@/lib/navigation";

describe("navigation helpers", () => {
  it("returns the matching page title by pathname", () => {
    expect(getTitleByPathname("/")).toBe("Dashboard");
    expect(getTitleByPathname("/repositories")).toBe("Repositories");
    expect(getTitleByPathname("/contributors")).toBe("Contributors");
  });

  it("falls back to Dashboard for unknown routes", () => {
    expect(getTitleByPathname("/unknown")).toBe("Dashboard");
  });

  it("keeps the expected top-level navigation items", () => {
    const titles = navigationData.map((item) => item.title);
    expect(titles).toEqual(["Dashboard", "Repositories", "Contributors"]);
  });
});
