# Defect Report: BUG-03 (SEC-08 / ASSET-02)

**Bug ID:** BUG-03  
**Legacy Reference:** SEC-08 / TC-D02.008  
**Component:** Backend Static Files (`SourceCode/SQLAPI/POS.API/Program.cs`) & Frontend Header  
**Module:** Tenant Company Profile / Brand Logo  
**Severity:** **MEDIUM**  
**Reproducible:** 100% Deterministic  
**Verified in Live Browser:** Yes (Header logo shows broken image icon and "[Logo]" alt text)  

---

## 1. Description & Impact

In the Angular application top navigation bar, the company logo is rendered from:
`http://localhost:5000/CompanyLogo/logo.png`
When viewed in modern Chromium browsers, the image fails to display and renders as a broken icon with alt text `Logo`.
In the browser console, Chromium warns of **Cross-Origin Read Blocking (CORB / ORB)** or CORS resource blocking because static files in `wwwroot/CompanyLogo` are served by ASP.NET Core without the appropriate `Access-Control-Allow-Origin` headers or Content-Type headers for cross-origin image requests.

---

## 2. Root Cause Analysis

In `SourceCode/SQLAPI/POS.API/Program.cs`, CORS is configured via `app.UseCors("ExposeResponseHeaders")`, but static file serving via `app.UseStaticFiles()` may precede CORS middleware, or the static file options do not attach CORS headers to static resources served from `wwwroot`.
When the Angular app on `http://localhost:4200` requests `<img>` from `http://localhost:5000`, the browser blocks reading the response if CORS headers are absent.

---

## 3. Remediation Plan

1. Configure `StaticFileOptions` in `Program.cs` to set response headers:
   ```csharp
   app.UseStaticFiles(new StaticFileOptions
   {
       OnPrepareResponse = ctx =>
       {
           ctx.Context.Response.Headers.Append("Access-Control-Allow-Origin", "*");
           ctx.Context.Response.Headers.Append("Access-Control-Allow-Headers", "*");
           ctx.Context.Response.Headers.Append("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
       }
   });
   ```
2. In Angular header component, add a graceful fallback icon if the logo fails to load.
