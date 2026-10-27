import { expect, test } from "bun:test";
import { NAV, activeHref } from "./navigation";

test("the deepest matching section is active", () => {
  const t = NAV.teacher;
  expect(activeHref(t, "/dashboard/teacher")).toBe("/dashboard/teacher");
  expect(activeHref(t, "/dashboard/teacher/classes/3b")).toBe("/dashboard/teacher/classes");
  expect(activeHref(t, "/dashboard/teacher/availability")).toBe("/dashboard/teacher/timetable");
  const a = NAV.admin;
  expect(activeHref(a, "/dashboard/admin/subjects/x")).toBe("/dashboard/admin/classes");
  expect(activeHref(a, "/dashboard/admin/invitations")).toBe("/dashboard/admin/users");
  expect(activeHref(a, "/dashboard/admin")).toBe("/dashboard/admin");
  expect(activeHref(a, "/dashboard/teacher")).toBeUndefined();
});

test("every role has a home first and at most six items", () => {
  for (const [role, items] of Object.entries(NAV)) {
    expect(items[0].href).toBe(`/dashboard/${role}`);
    expect(items.length).toBeLessThanOrEqual(6);
  }
});
