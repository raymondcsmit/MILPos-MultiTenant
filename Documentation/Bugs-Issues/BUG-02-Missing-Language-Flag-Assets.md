# Defect Report: BUG-02 (ASSET-01)

**Bug ID:** BUG-02  
**Legacy Reference:** ASSET-01 / TC-D01.020  
**Component:** Frontend Assets (`SourceCode/Angular/src/assets/LanguageImages/`)  
**Module:** Internationalization (i18n) / Header Language Switcher  
**Severity:** **MEDIUM**  
**Reproducible:** 100% Deterministic  
**Verified in Live Browser:** Yes (Network console 404s on page load)  

---

## 1. Description & Impact

When loading any authenticated page in the Angular frontend, the top navigation header renders the language selector dropdown. The frontend requests flag images from `http://localhost:4200/LanguageImages/` or through the backend asset pipeline. 
The browser console logs multiple HTTP 404 Not Found errors for:
- `united-states.svg`
- `china.svg`
- `france.svg`
- `saudi-arabia.svg`
- `turkish.png`
- `japan.svg`
- `french.png`

### Impact:
- Visual degradation (broken image placeholder icons inside language selector menu).
- Console spam on every page transition.

---

## 2. Root Cause Analysis

The Angular `angular.json` asset configuration or the local asset folder `src/assets/LanguageImages/` does not have copies of all seeded language icons configured in the database `Languages` table. Alternatively, the relative image path in the header template expects assets in `assets/LanguageImages/` but the code references `/LanguageImages/`.

---

## 3. Remediation Plan

1. Verify folder `SourceCode/Angular/src/assets/LanguageImages/` and ensure all required SVG/PNG flag assets exist.
2. In `angular.json`, ensure `assets` includes `"src/assets/LanguageImages"` or maps `LanguageImages` correctly.
3. Provide fallback image handling (e.g. `(error)="onImgError($event)"`) so broken image links do not trigger red console errors.
