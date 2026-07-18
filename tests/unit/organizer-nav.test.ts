import { describe, expect, it } from "vitest";
import { isOrganizerNavActive } from "@/components/organizer/OrganizerShell";

describe("isOrganizerNavActive", () => {
  it("marks exact matches as active", () => {
    expect(isOrganizerNavActive("/organizer/overview", "/organizer/overview")).toBe(true);
  });

  it("marks nested paths as active", () => {
    expect(isOrganizerNavActive("/organizer/events/evt_1", "/organizer/events")).toBe(true);
  });

  it("does not mark unrelated paths", () => {
    expect(isOrganizerNavActive("/organizer/overview", "/organizer/events")).toBe(false);
  });
});
