# Defect Report: BUG-13 (CONF-02 / DESK-04)

**Bug ID:** BUG-13  
**Legacy Reference:** CONF-02 / DESK-04  
**Component:** Electron Desktop Shell (`SourceCode/Angular/main.js:121`)  
**Module:** Cloud Authentication & Database Setup  
**Severity:** **LOW**  
**Reproducible:** 100% Deterministic  

---

## 1. Description & Impact

In `SourceCode/Angular/main.js` line 121, the cloud API endpoint is hardcoded as a string constant:
```javascript
const CLOUD_API_URL = 'http://208.110.72.211'; // Production Cloud API
```
This hardcoded value makes it impossible to configure or test the desktop application against:
- Local development cloud servers (`http://localhost:5000`)
- Staging environments or QA test rigs
- Customer-specific private cloud or on-premise deployments

When attempting to test Cloud Setup without an internet connection or against a local mock server, the desktop application fails with network timeouts because it cannot be redirected.

---

## 2. Root Cause Analysis

`main.js` does not consult environment variables (e.g. `process.env.CLOUD_API_URL`) or an external configuration file for the cloud URL before falling back to the production IP.

---

## 3. Remediation Plan

Update `main.js` to prioritize `process.env.CLOUD_API_URL`:
```javascript
const CLOUD_API_URL = process.env.CLOUD_API_URL || 'http://208.110.72.211';
```
