import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Next 16 ships a native flat config; FlatCompat crashes on it.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Design mocks and their build scripts are not app code.
    ".impeccable/**",
    "prototype/**",
  ]),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/exhaustive-deps": "off",
      "prefer-const": "off",
      "react/no-unescaped-entities": "off",
    },
  },
  {
    // ponytail: legacy pages that still fetch in useEffect + setState. New files get these rules as errors.
    // Remove a file from this list when its page is rebuilt on the data pattern (src/lib/data + actions).
    files: [
      "src/app/dashboard/admin/class-groups/\\[groupId\\]/page.tsx",
      "src/app/dashboard/admin/class-groups/page.tsx",
      "src/app/dashboard/admin/classes/\\[classId\\]/page.tsx",
      "src/app/dashboard/admin/classes/page.tsx",
      "src/app/dashboard/admin/scheduling/templates/page.tsx",
      "src/app/dashboard/admin/scheduling/time-slots/page.tsx",
      "src/app/dashboard/admin/scheduling/timetables/page.tsx",
      "src/app/dashboard/admin/subjects/\\[subjectId\\]/page.tsx",
      "src/app/dashboard/admin/subjects/page.tsx",
      "src/app/dashboard/admin/teachers/\\[teacherId\\]/availability/page.tsx",
      "src/app/dashboard/admin/teachers/\\[teacherId\\]/page.tsx",
      "src/app/dashboard/admin/teachers/availability/page.tsx",
      "src/app/dashboard/admin/teachers/page.tsx",
      "src/app/dashboard/admin/users/page.tsx",
      "src/app/dashboard/superadmin/password-resets/page.tsx",
      "src/app/dashboard/superadmin/schools/page.tsx",
      "src/app/dashboard/superadmin/users/page.tsx",
      "src/app/dashboard/teacher/availability/page.tsx",
      "src/components/calendar/drag/calendar-drag-manager.tsx",
      "src/components/class-timetable-tab.tsx",
      "src/components/forms/time-slot-form.tsx",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/incompatible-library": "warn",
    },
  },
]);

export default eslintConfig;
