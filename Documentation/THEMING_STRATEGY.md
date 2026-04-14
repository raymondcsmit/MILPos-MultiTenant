# Dynamic Theming Strategy & Analysis
**Application:** MIL POS (Angular 19+)

## 1. Executive Summary
This document analyzes the current styling architecture of the MIL POS application and provides a comprehensive strategy to implement a **Dynamic Theming Engine**. The goal is to allow users to switch themes (Colors, Fonts, Density) at runtime without requiring a page reload or application rebuild.

## 2. Current Styling Architecture Analysis

### 2.1 Technology Stack
*   **Framework:** Angular 19+ (Standalone Components, Signals).
*   **UI Library:** Angular Material (`@angular/material`) & Bootstrap 5 (`bootstrap`).
*   **Preprocessor:** SCSS (Sass).
*   **Global Styles:** Located in `public/scss/` (e.g., `style.scss`, `variables.scss`, `custom-theme.scss`).

### 2.2 Current Limitations
*   **Static Compilation:** The current theming logic relies heavily on SCSS variables (e.g., `$colors` in `variables.scss`) and Angular Material mixins (`mat.theme`) evaluated at **build time**.
*   **Hardcoded Values:** `custom-theme.scss` hardcodes the palette (e.g., `mat.$cyan-palette`) and typography (`Roboto`).
*   **No Runtime Swapping:** Changing the primary color requires changing the SCSS file and recompiling the application.

## 3. Proposed Architecture: "The Variable Bridge"

To achieve dynamic theming, we must move from **Static SCSS Variables** to **Dynamic CSS Custom Properties (CSS Variables)**.

### 3.1 Core Concepts
1.  **CSS Custom Properties (`--var`)**: Define all themeable attributes (colors, fonts, spacing) as CSS variables on the `:root` or `body` element.
2.  **Angular Material Theming**: Use Angular Material's Sass mixins to generate CSS classes for each theme (e.g., `.theme-ocean`, `.theme-dark`) OR use the modern "CSS Variables" approach for Material 3.
3.  **ThemeService**: A singleton Angular service to manage the active theme, persist selection to `localStorage`, and apply the corresponding CSS class or style values to the DOM.

## 4. Implementation Strategy

### Phase 1: The CSS Variable Foundation
Refactor the global `variables.scss` to use CSS variables as the source of truth, with SCSS variables acting as fallbacks or pointers.

**Current:**
```scss
$primary-color: #00bcd4;
```

**Proposed:**
```scss
:root {
  --primary-color: #00bcd4;
  --secondary-color: #ff9800;
  --font-family-main: 'Roboto', sans-serif;
}

// SCSS usage now points to CSS var
$primary-color: var(--primary-color);
```

### Phase 2: Angular Material Multi-Theme Setup
Angular Material themes are complex mixins. To support multiple themes, we define a map of themes and iterate over them to generate CSS classes.

**Strategy:**
1.  Define available palettes in a config file.
2.  Create a "Theme Mixin" that accepts a primary and secondary palette.
3.  Generate classes like `.theme-default`, `.theme-ocean`, `.theme-crimson`.

When the user selects "Ocean", the `ThemeService` adds the class `.theme-ocean` to the `<body>` tag.

### Phase 3: Dynamic Typography
Fonts cannot be easily swapped via a simple class change if the font files aren't loaded.

**Strategy:**
1.  **Lazy Load Fonts**: Create a service that appends `<link>` tags for Google Fonts dynamically based on user selection to save bandwidth.
2.  **CSS Variable**: Update `--font-family-main` on the `body` tag.

```css
body {
    font-family: var(--font-family-main);
}
```

### Phase 4: Bootstrap & Custom Component Integration
Since Bootstrap is used, we must ensure its variables align with our new CSS variables.
*   Override Bootstrap CSS variables (Bootstrap 5 supports this native) to map to our `--primary-color`.

## 5. Theme Configuration Data Structure

We should define a strong TypeScript interface for a Theme to drive the UI.

```typescript
export interface AppTheme {
  id: string;
  name: string;
  isDark: boolean;
  properties: {
    '--primary-color': string;
    '--secondary-color': string;
    '--font-family-main': string;
    '--surface-color': string;
    '--text-color': string;
  };
  // For Angular Material specific loading
  materialThemeClass: string; 
}
```

## 6. Detailed Roadmap

### Step 1: Proof of Concept (POC)
1.  Create `ThemeService` with a `setTheme(themeName)` method.
2.  Define `--primary-color` in `style.scss`.
3.  Update one component to use `var(--primary-color)` instead of a hardcoded color.
4.  Test runtime switching.

### Step 2: Angular Material Refactoring
1.  Open `custom-theme.scss`.
2.  Wrap the `mat.theme` include in a mixin or CSS class selector.
3.  Define 3 distinct themes (e.g., Light/Blue, Dark/Purple, Light/Green).

### Step 3: Global Variable Replacement
1.  Audit `variables.scss`.
2.  Systematically replace static hex codes with CSS variables.
3.  Ensure `bootstrap` imports utilize these variables (may require specific Bootstrap variable overrides).

### Step 4: UI Implementation
1.  Create a `Settings` -> `Appearance` page.
2.  Add a "Theme Selector" dropdown or card grid (using the mockups we created earlier as inspiration).
3.  Add a "Font Selector" dropdown.

## 7. Pros & Cons

| Feature | Pros | Cons |
| :--- | :--- | :--- |
| **CSS Variables** | Instant switching, no reload, native browser support. | Requires refactoring existing SCSS. |
| **Class-Based Themes** | Easy to manage with Angular Material. | slightly larger CSS bundle size (generating styles for all themes). |
| **Dynamic Fonts** | Great UX, accessibility friendly. | Potential "Flash of Unstyled Text" (FOUT) while loading. |

## 8. Conclusion
The application is well-positioned for this upgrade. The use of SCSS and Angular Material standardizes the effort. The primary effort will be **refactoring existing static color references** to use the new CSS variable system.

**Recommended First Step:** Implement **Phase 1** (CSS Variables for Primary Colors) and verify it works with the Dashboard cards.
