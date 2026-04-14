# Implement electron:debug Script & Fix Asset Loading

The goal is to create a script that starts the Angular application and loads it into Electron automatically. Additionally, we need to fix the MIME type/404 errors caused by an incorrect `base href` in `index.html`.

## Proposed Changes

### Angular Project

#### [MODIFY] [index.html](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Angular/src/index.html)
- Change `<base href="/app/">` to `<base href="/">`.
- **Reason**: `ng serve` (used for debugging) hosts the application at the root (`/`) by default. Having `/app/` as the base href causes Electron to look for styles and scripts at `http://localhost:4200/app/...`, which results in 404 errors.

#### [MODIFY] [package.json](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Angular/package.json)
- Add `concurrently` and `wait-on` to `devDependencies`.
- Add `electron:debug` script:
  `"electron:debug": "concurrently \"npm start\" \"wait-on http://localhost:4200 && electron . --dev\""`

## Verification Plan

### Manual Verification
1. Run `npm run electron:debug` in the `Angular` directory.
2. Verify that it starts `ng serve`.
3. Verify that once `ng serve` is ready, the Electron window opens and loads `http://localhost:4200`.
4. Check the Electron console for any MIME type or 404 errors (they should be gone).
