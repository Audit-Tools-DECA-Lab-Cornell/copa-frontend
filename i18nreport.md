# i18n Hard-coded Strings Audit Report

## Executive Summary

A comprehensive audit of the COPA Playspace dashboard frontend reveals **195 hard-coded UI strings** across **49 files** that should be internationalized instead of being directly embedded in the code.

## Key Findings

### Statistics

- **Total hard-coded strings:** 195
- **Files affected:** 49
- **Priority levels:** Critical (67), High (48), Medium (59), Low (21)
- **Languages affected:** English (en.json) and German (de.json)

### Top Files with Issues

1. `src/app/onboarding/auditor/page.tsx` - 13 strings
2. `src/components/landing-page.tsx` - 11 strings
3. `src/app/(protected)/admin/raw-data/page.tsx` - 10 strings
4. `src/app/(protected)/manager/raw-data/page.tsx` - 10 strings
5. `src/components/dashboard/audit-report-view.tsx` - 7 strings

### Categories of Issues

| Category               | Count | Examples                                                  |
| ---------------------- | ----- | --------------------------------------------------------- |
| Dialog & Modal Titles  | 13    | "Resources", "Auditor profile", "Build a place report"    |
| Table Column Headers   | 9     | "Project", "Date Range", "Completed", "Mean Score (PV/U)" |
| Filter/Dialog Titles   | 12    | "Managers", "Projects", "Places", "Auditors"              |
| Button Labels          | 18    | "Back to Places", "New project", "Assign Auditor"         |
| Form Field Labels      | 16    | "Full name", "Email", "Phone", "Gender"                   |
| Form Placeholders      | 28    | "Select a project...", "e.g. City Parks Department"       |
| Card/Statistics Titles | 18    | "Total Audits", "Overall PV/U", "Submitted reports"       |
| Status & Info Messages | 15    | "No response recorded", "Reports unavailable"             |
| Aria-labels            | 21    | "Select all on this page", "Remove option"                |
| Other UI Text          | 25    | "Type", "Status", "Score", "Actions"                      |

## Detailed Issues Found

### Critical Issues (High Priority)

These are user-facing strings that should definitely be internationalized:

**Page Headers & Titles:**

- "Resources" (resources/page.tsx)
- "Auditor profile", "Change password" (settings/page.tsx)
- "Place not found" (admin/places/[placeId]/page.tsx)

**Card Statistics:**

- "Total Audits", "Submitted", "In Progress" (places detail pages)
- "Overall PV/U", "Audit Mean PV", "Survey Mean U" (manager pages)

**Table Headers (appears in multiple pages):**

- "Project", "Date Range", "Places", "Completed"
- "Mean Score (PV/U)", "Last Audited"

**Filter Titles (appears multiple times):**

- "Managers", "Projects", "Places", "Auditors"

### High Priority Issues

**Button Actions:**

- "Back to Places" (appears 4+ times)
- "Back to Reports" (appears 3+ times)
- "Assign Auditor" (appears 4+ times)
- "New project", "Create project", "Edit project", "Delete project"

**Dialog Titles:**

- "Assign to Project" vs "Assign Auditor" (conditional)
- "Build a place report"
- "Manager onboarding", "Auditor onboarding"

### Medium Priority Issues

**Form Fields (onboarding pages):**

- "Full name", "Email", "Phone", "Gender", "Age range"
- "City", "Province / state", "Country", "Role / profession"
- "Position / role"

**Placeholders:**

- "Select a project...", "Select a type"
- "Search for an address"
- "Describe other"
- "Name, code, or email..."

**Status Messages:**

- "No response recorded"
- "No questions yet"
- "No place reports saved yet"
- "Reports unavailable", "Projects unavailable"
- "Audit Not Yet Submitted"

### Low Priority Issues

**Aria-labels (Accessibility):**

- "Select all on this page"
- "Select all projects"
- "Remove option", "Remove question"
- "Public resource navigation", "COPA homepage"
- "Main navigation", "Mobile navigation"

## Recommendations

### Immediate Actions (Phase 1)

1. Create comprehensive i18n keys for all identified strings
2. Update `messages/en.json` with new keys and English text
3. Update `messages/de.json` with German translations
4. Prioritize critical dialog titles and page headers

### Medium-term Actions (Phase 2)

1. Update component code to use `useTranslations()` and `t()` calls
2. Create consistent naming conventions for i18n keys:
   - `pages.*` for page-level content
   - `components.*` for component content
   - `dialogs.*` for dialog-specific strings
   - `tables.*` for table headers and labels
   - `forms.*` for form fields and placeholders
   - `aria.*` for accessibility labels

### Long-term Actions (Phase 3)

1. Implement automated i18n linting to catch new hard-coded strings
2. Add pre-commit hooks to prevent hard-coded strings in new code
3. Consider adding i18n extraction tools to CI/CD pipeline
4. Test all UI flows in both English and German

## Example i18n Key Structure

```json
{
  "pages": {
    "resources": {
      "title": "Resources"
    },
    "settings": {
      "auditorProfile": "Auditor profile",
      "changePassword": "Change password"
    }
  },
  "components": {
    "tables": {
      "headers": {
        "project": "Project",
        "dateRange": "Date Range",
        "places": "Places",
        "completed": "Completed",
        "meanScore": "Mean Score (PV/U)",
        "lastAudited": "Last Audited"
      }
    }
  },
  "dialogs": {
    "assignAuditor": {
      "assignToProject": "Assign to Project",
      "assignAuditor": "Assign Auditor"
    }
  }
}
```

## Conclusion

The codebase has significant internationalization issues with 195 hard-coded UI strings scattered across 49 files. While the i18n infrastructure is already in place, systematic replacement of all hard-coded strings with translation keys is needed. This audit provides a roadmap for remediation.

---

**Report Generated:** 2026-06-05
**Total Findings:** 195 strings across 49 files
**Estimated Effort:** 4-6 hours for full remediation
