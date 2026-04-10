# Dynamic Theming Implementation Plan

## Goal
Implement a **Dynamic Theming Engine** that allows users to switch themes (e.g., Light, Dark, Ocean, Crimson) at runtime without page reloads. This will be achieved using **CSS Custom Properties (Variables)** generated automatically from existing Angular Material palettes.

## User Review Required
> [!IMPORTANT]
> This plan involves a fundamental change to how global colors are defined. While we use a "Bridge" strategy to minimize breakage, some older hardcoded styles in specific components might need manual adjustment if they don't use the global variables.

## Proposed Changes

### Phase 1: The Core Infrastructure (SCSS)
Establish the SCSS mixins and base structure to generate CSS variables.

#### [NEW] [Common] `_var-generator.scss`
*   **Location**: `Angular/public/scss/common/_var-generator.scss`
*   **Purpose**: A generic mixin that iterates over a Material palette map and generates `--primary-50`, `--primary-100`, etc.

#### [MODIFY] [Theme] `custom-theme.scss`
*   **Location**: `Angular/public/scss/theme/custom-theme.scss`
*   **Action**: 
    1.  Import `_var-generator.scss`.
    2.  Define a `:root` block for the default theme variables.
    3.  Define CSS classes (e.g., `.theme-ocean`, `.theme-dark`) that override these variables using different palettes.

### Phase 2: The Variable Bridge
Connect the new CSS variables to the existing SCSS variables so legacy code works automatically.

#### [MODIFY] [Common] `variables.scss`
*   **Location**: `Angular/public/scss/common/variables.scss`
*   **Action**: Replace static hex codes with `var(...)` references.
    *   `$colors('blue')` -> `var(--primary-500)` (example mapping)
    *   `$theme-white` -> `var(--surface-color)`

### Phase 3: Angular Service & State Management
Create the logic to manage user preference.

#### [NEW] [Service] `ThemeService`
*   **Location**: `Angular/src/app/core/services/theme.service.ts`
*   **Responsibilities**:
    *   `setTheme(themeId: string)`: Adds/removes classes from `document.body`.
    *   `getTheme()`: Returns current theme.
    *   `loadSavedTheme()`: Checks `localStorage` on startup.

#### [MODIFY] [Entry] `app.component.ts`
*   **Action**: Call `themeService.loadSavedTheme()` on initialization to prevent flash of wrong theme.

### Phase 4: UI Implementation
Allow the user to actually switch the theme.

#### [NEW] [Component] `ThemeSelectorComponent`
*   **Location**: `Angular/src/app/shared/components/theme-selector/theme-selector.component.ts`
*   **UI**: A simple dropdown or list of color swatches.

#### [MODIFY] [Page] `SettingsPage` (or equivalent)
*   **Action**: Embed the `ThemeSelectorComponent`.

#### [MODIFY] [Component] `Legacy Invoice Components`
*   **Locations**: 
    *   `src/app/shared/sales-order-invoice/sales-order-invoice.component.html`
    *   `src/app/shared/purchase-order-invoice/purchase-order-invoice.component.html`
*   **Action**: These files contain heavily hardcoded styles (e.g., `border: 1px solid #dee2e6`, `background-color: #fff`). 
    *   Replace `#fff` with `var(--surface-color)` (or equivalent).
    *   Replace `#dee2e6` with `var(--border-color)`.
    *   **Note**: Since these are printable invoices, verify that CSS variables print correctly in all target browsers.
66: 
67: ### Phase 6: Global & Component Level Refactoring [NEW]
66: 
67: ### Phase 6: Global & Component Level Refactoring
68: Deep refactoring of global overrides and individual components that are blocking theming.
69: 
70: #### [BUG FIX] Fix 'Pay Online Now' Link
71: *   **Issue**: Clicking "Pay Online Now" on the Trial Expired screen results in an Access Denied XML error.
72: *   **Action**: Update the `payOnline()` method in `SubscriptionComponent` to point to a valid payment URL or a placeholder.
73: 
74: #### [MODIFY] [Global] `general.scss`
69: 
70: #### [MODIFY] [Global] `general.scss`
71: *   **Location**: `Angular/public/scss/common/general.scss`
72: *   **Issue**: Contains widespread hardcoded colors for Tables, Inputs, Dialogs, Paginators, and helper classes (e.g., `.bg-white`).
73: *   **Action**: Replace all hex codes with semantic variables (e.g., `var(--surface-color)`, `var(--text-color)`, `var(--border-color)`).
74: 
75: #### [MODIFY] [Components] High-Priority Components
76: *   **Locations**:
77:     *   `login.component.scss` (Hardcoded white background/text)
78:     *   `header.component.scss` (Hardcoded black/white text)
79:     *   `pos.component.scss` (Likely similar overrides)
80: *   **Action**: Audit and replace hardcoded colors.

## Verification Plan

### Automated Tests
*   **Unit Test**: Test `ThemeService` to ensure it correctly updates the `body` class configuration and creates `localStorage` entries.

### Manual Verification
1.  **Default Load**: Open app, verify default colors look correct (Regression test).
2.  **Runtime Switch**:
    *   Open DevTools -> Elements.
    *   Use the new UI to switch to "Ocean".
    *   Verify `<body>` has class `theme-ocean`.
    *   Verify `--primary-500` value changes in the "Computed" styles tab.
    *   Verify buttons and headers update color immediately.
3.  **Persistency**: Refresh page. Verify "Ocean" theme is still applied.
