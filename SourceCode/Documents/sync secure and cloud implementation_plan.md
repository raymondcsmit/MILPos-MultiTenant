# Secure Sync System - Sprint-Based Implementation Plan

## Overview

This plan consolidates three major features into a phased, sprint-based implementation:

1. **API Key-Based Sync Security** - Tenant-specific API keys for secure sync
2. **Cloud-Authenticated Database Download** - Seamless first-time setup with cloud login
3. **Machine-Specific Encryption** - Protect credentials from being copied to other machines

**Architecture Principles:**
- ✅ Respect existing multi-tenant architecture
- ✅ Maintain separation: Cloud API (PostgreSQL) vs Desktop API (SQLite)
- ✅ Leverage existing Hangfire background jobs for sync
- ✅ Use existing JWT authentication infrastructure
- ✅ Follow CQRS/MediatR pattern

**Sprint Structure:**
- Each sprint is **user-testable** with clear acceptance criteria
- Sprints build on each other incrementally
- Can pause between sprints for testing/feedback

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLOUD API (PostgreSQL)                       │
│  - Multi-tenant data                                            │
│  - JWT authentication                                           │
│  - API key generation & validation                              │
│  - Tenant database export                                       │
│  - Sync endpoints (with API key auth)                           │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ HTTPS + API Key
                              │
┌─────────────────────────────────────────────────────────────────┐
│              ELECTRON APP (Desktop Client)                      │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  First Launch: Cloud Login Screen                        │ │
│  │  - User enters email/password                            │ │
│  │  - Authenticates to Cloud API                            │ │
│  │  - Downloads tenant database automatically               │ │
│  │  - Saves encrypted credentials                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Embedded .NET API (SQLite)                              │ │
│  │  - Runs on localhost:5000                                │ │
│  │  - Uses tenant-specific SQLite database                  │ │
│  │  - Hangfire jobs sync with Cloud API                     │ │
│  │  - Uses API key from encrypted auth.json                 │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Angular Frontend                                        │ │
│  │  - Connects to localhost:5000                            │ │
│  │  - Works 100% offline after setup                        │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Current State Analysis

### Existing Infrastructure (✅ Already Built)

**Backend:**
- ✅ Multi-tenant architecture with [TenantId](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Domain/SingleTenantProvider.cs#40-120) filtering
- ✅ JWT authentication with claims
- ✅ [ExportTenantToSqliteCommandHandler](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.MediatR/Tenant/Handlers/ExportTenantToSqliteCommandHandler.cs#22-396) for database export
- ✅ Hangfire background jobs for sync
- ✅ [CloudApiClient](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Domain/Sync/CloudApiClient.cs#19-38) for sync communication
- ✅ [SyncEngine](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Domain/Sync/SyncEngine.cs#24-39) for data synchronization

**Frontend:**
- ✅ Electron app with embedded .NET API
- ✅ Angular frontend
- ✅ Build scripts for desktop packaging

**Database:**
- ✅ [Tenant](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Data/Entities/Tenant/Tenant.cs#5-32) table exists
- ✅ [RoleClaims.csv](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SeedData/RoleClaims.csv) with `TENANT_DOWNLOAD_DATABASE` claim added

### What Needs to Be Built

**Sprint 1: API Key Infrastructure (Backend)**
- Add [ApiKey](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Repository/Tenant/TenantRegistrationService.cs#652-662) column to [Tenant](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Data/Entities/Tenant/Tenant.cs#5-32) table
- Auto-generate API key on tenant creation
- API key validation middleware
- Update sync endpoints to require API key

**Sprint 2: Cloud Authentication & Database Download (Backend)**
- `/api/tenants/my-database` endpoint
- Update JWT to include [ApiKey](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Repository/Tenant/TenantRegistrationService.cs#652-662) claim
- Update [ExportTenantToSqliteCommandHandler](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.MediatR/Tenant/Handlers/ExportTenantToSqliteCommandHandler.cs#22-396) to include [appsettings.json](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/appsettings.json)

**Sprint 3: Machine-Specific Encryption (Electron)**
- Install `node-dpapi` package
- Create encryption utility
- Encrypt/decrypt auth credentials

**Sprint 4: Cloud Login & Auto-Download (Electron)**
- First-launch detection
- Cloud login screen
- Download splash with progress
- Automatic database setup

**Sprint 5: Integration & Testing**
- End-to-end testing
- Error handling
- Documentation
- User acceptance testing

---

## Sprint 1: API Key Infrastructure (Backend)

**Duration:** 3-5 days  
**Focus:** Add API key to Tenant table and implement validation

### 1.1 Database Changes

**File:** `POS.Data/Entities/Tenant.cs`

```csharp
public class Tenant : BaseEntity
{
    // ... existing properties ...
    
    /// <summary>
    /// API key for sync authentication (auto-generated)
    /// </summary>
    public string ApiKey { get; set; }
}
```

**File:** Create migration

```bash
cd POS.Migrations.PostgreSQL
dotnet ef migrations add AddApiKeyToTenant --context POSDbContext --startup-project ../POS.API
```

### 1.2 API Key Generation

**File:** `POS.MediatR/Tenant/Handlers/AddTenantCommandHandler.cs`

```csharp
public class AddTenantCommandHandler : IRequestHandler<AddTenantCommand, ServiceResponse<TenantDto>>
{
    public async Task<ServiceResponse<TenantDto>> Handle(AddTenantCommand request, CancellationToken cancellationToken)
    {
        var entity = _mapper.Map<Tenant>(request);
        
        // ✅ Generate API key
        entity.ApiKey = GenerateApiKey();
        
        // ... rest of existing code ...
    }
    
    private string GenerateApiKey()
    {
        // Generate 32-byte random key
        using (var rng = new RNGCryptoServiceProvider())
        {
            var bytes = new byte[32];
            rng.GetBytes(bytes);
            return Convert.ToBase64String(bytes);
        }
    }
}
```

### 1.3 API Key Validation Middleware

**File:** [POS.API/Middleware/ApiKeyAuthenticationMiddleware.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Middleware/ApiKeyAuthenticationMiddleware.cs) (NEW)

```csharp
public class ApiKeyAuthenticationMiddleware
{
    private readonly RequestDelegate _next;
    
    public ApiKeyAuthenticationMiddleware(RequestDelegate next)
    {
        _next = next;
    }
    
    public async Task InvokeAsync(HttpContext context, POSDbContext dbContext)
    {
        // Check if X-API-Key header exists
        var apiKey = context.Request.Headers["X-API-Key"].FirstOrDefault();
        
        if (!string.IsNullOrEmpty(apiKey))
        {
            // Validate API key
            var tenant = await dbContext.Tenants
                .FirstOrDefaultAsync(t => t.ApiKey == apiKey);
            
            if (tenant != null)
            {
                // Set TenantId in context for downstream use
                context.Items["TenantId"] = tenant.Id;
                context.Items["AuthenticatedViaApiKey"] = true;
            }
        }
        
        await _next(context);
    }
}
```

**File:** [POS.API/Startup.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Startup.cs)

```csharp
public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
{
    // ... existing middleware ...
    
    app.UseMiddleware<ApiKeyAuthenticationMiddleware>();
    
    // ... rest of middleware ...
}
```

### 1.4 Update Sync Endpoints

**File:** `POS.API/Controllers/Sync/SyncController.cs` (if exists, or create)

```csharp
[ApiController]
[Route("api/[controller]")]
public class SyncController : BaseController
{
    [HttpPost("products")]
    [AllowAnonymous] // Allow API key auth
    public async Task<IActionResult> SyncProducts([FromBody] SyncProductsCommand command)
    {
        // Check if authenticated via API key
        if (!HttpContext.Items.ContainsKey("AuthenticatedViaApiKey"))
        {
            return Unauthorized("API key required");
        }
        
        var tenantId = (Guid)HttpContext.Items["TenantId"];
        command.TenantId = tenantId;
        
        var result = await _mediator.Send(command);
        return Ok(result);
    }
}
```

### Sprint 1 Testing

**Acceptance Criteria:**
- [ ] New tenants have auto-generated [ApiKey](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Repository/Tenant/TenantRegistrationService.cs#652-662)
- [ ] API key is stored in database
- [ ] Middleware validates API key from `X-API-Key` header
- [ ] Invalid API key returns 401 Unauthorized
- [ ] Valid API key sets [TenantId](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Domain/SingleTenantProvider.cs#40-120) in context

**Manual Test:**
```bash
# 1. Create new tenant via SuperAdmin UI
# 2. Check database for ApiKey
SELECT Id, Name, ApiKey FROM Tenants WHERE Name = 'Test Tenant';

# 3. Test API key validation
curl -X POST https://cloud.yourcompany.com/api/sync/products \
  -H "X-API-Key: {api-key-from-db}" \
  -H "Content-Type: application/json" \
  -d '{"products": []}'

# Expected: 200 OK (or appropriate response)

# 4. Test invalid API key
curl -X POST https://cloud.yourcompany.com/api/sync/products \
  -H "X-API-Key: invalid-key" \
  -H "Content-Type: application/json" \
  -d '{"products": []}'

# Expected: 401 Unauthorized
```

---

## Sprint 2: Cloud Authentication & Database Download (Backend)

**Duration:** 3-5 days  
**Focus:** Enable users to download their tenant database via cloud login

### 2.1 Update JWT to Include ApiKey

**File:** `POS.Helper/JwtHelper.cs`

```csharp
public static string GenerateJSONWebToken(User user, Tenant tenant, string secretKey)
{
    var claims = new List<Claim>
    {
        new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
        new Claim(ClaimTypes.Email, user.Email),
        new Claim("TenantId", tenant.Id.ToString()),
        new Claim("ApiKey", tenant.ApiKey), // ✅ Add API key to JWT
        // ... other claims ...
    };
    
    // ... rest of JWT generation ...
}
```

### 2.2 Download My Database Endpoint

**File:** [POS.API/Controllers/TenantsController.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Controllers/TenantsController.cs)

```csharp
[HttpGet("my-database")]
[Authorize]
public async Task<IActionResult> DownloadMyDatabase()
{
    // Get tenant from JWT
    var tenantIdClaim = User.FindFirst("TenantId");
    if (tenantIdClaim == null || !Guid.TryParse(tenantIdClaim.Value, out var tenantId))
    {
        return Unauthorized("Invalid tenant");
    }
    
    // Export database
    var command = new ExportTenantToSqliteCommand { TenantId = tenantId };
    var result = await _mediator.Send(command);
    
    if (!result.Success)
        return BadRequest(result.Errors);
    
    // Return file
    var fileBytes = await System.IO.File.ReadAllBytesAsync(result.Data.FilePath);
    System.IO.File.Delete(result.Data.FilePath); // Cleanup
    
    return File(fileBytes, "application/x-sqlite3", $"POSDb_{DateTime.Now:yyyyMMdd}.db");
}
```

### 2.3 Update Export Handler to Include appsettings.json

**File:** [POS.MediatR/Tenant/Handlers/ExportTenantToSqliteCommandHandler.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.MediatR/Tenant/Handlers/ExportTenantToSqliteCommandHandler.cs)

```csharp
public async Task<ServiceResponse<ExportTenantToSqliteResponse>> Handle(
    ExportTenantToSqliteCommand request, 
    CancellationToken cancellationToken)
{
    // ... existing export logic ...
    
    // ✅ Create appsettings.json
    var tenant = await _dbContext.Tenants.FindAsync(request.TenantId);
    
    var appSettings = new
    {
        TenantId = tenant.Id,
        ApiKey = tenant.ApiKey,
        SyncSettings = new
        {
            CloudApiUrl = _configuration["CloudApiUrl"], // From config
            SyncIntervalMinutes = 15,
            AutoSync = true
        },
        DatabaseProvider = "Sqlite",
        ConnectionStrings = new
        {
            SqliteConnectionString = "Data Source=POSDb.db"
        }
    };
    
    var settingsPath = Path.Combine(tempDir, "appsettings.json");
    await File.WriteAllTextAsync(settingsPath, 
        JsonSerializer.Serialize(appSettings, new JsonSerializerOptions { WriteIndented = true }));
    
    // ✅ Create README.txt
    var readmePath = Path.Combine(tempDir, "README.txt");
    await File.WriteAllTextAsync(readmePath, $@"
MIL POS Database Package
========================

Tenant: {tenant.Name}
Generated: {DateTime.Now:yyyy-MM-dd HH:mm:ss}

Setup Instructions:
1. Download MIL POS installer from: https://github.com/your-org/milpos/releases
2. Install the application
3. On first launch, login with your credentials
4. Database will be downloaded automatically

Your Credentials:
- Email: (provided separately)
- Password: (provided separately)

Support: support@yourcompany.com
");
    
    // ... rest of export logic ...
}
```

### Sprint 2 Testing

**Acceptance Criteria:**
- [ ] JWT includes [ApiKey](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Repository/Tenant/TenantRegistrationService.cs#652-662) claim
- [ ] `/api/tenants/my-database` endpoint exists
- [ ] Endpoint requires authentication
- [ ] Returns SQLite database file
- [ ] Database contains tenant data only
- [ ] [appsettings.json](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/appsettings.json) included with correct credentials
- [ ] README.txt included with instructions

**Manual Test:**
```bash
# 1. Login as tenant user
POST https://cloud.yourcompany.com/api/auth/login
{
  "email": "admin@tenant1.com",
  "password": "password"
}

# 2. Extract JWT token from response

# 3. Download database
GET https://cloud.yourcompany.com/api/tenants/my-database
Authorization: Bearer {jwt-token}

# Expected: Downloads POSDb_20260211.db file

# 4. Verify database contents
sqlite3 POSDb_20260211.db
SELECT COUNT(*) FROM Products;
SELECT COUNT(*) FROM Customers;

# 5. Verify appsettings.json exists and contains ApiKey
```

---

## Sprint 3: Machine-Specific Encryption (Electron)

**Duration:** 2-3 days  
**Focus:** Encrypt credentials using Windows DPAPI

### 3.1 Install Dependencies

**File:** [package.json](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Angular/package.json)

```bash
cd SourceCode/Angular
npm install node-dpapi --save
```

### 3.2 Create Encryption Utility

**File:** `SourceCode/Angular/encryption.js` (NEW)

```javascript
const dpapi = require('node-dpapi');

function encryptData(data) {
  try {
    const dataBuffer = Buffer.from(data, 'utf8');
    const encryptedBuffer = dpapi.protectData(dataBuffer, null, 'CurrentUser');
    return encryptedBuffer.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

function decryptData(encryptedData) {
  try {
    const encryptedBuffer = Buffer.from(encryptedData, 'base64');
    const decryptedBuffer = dpapi.unprotectData(encryptedBuffer, null, 'CurrentUser');
    return decryptedBuffer.toString('utf8');
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

function isEncrypted(data) {
  if (!data || typeof data !== 'string') return false;
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  return base64Regex.test(data) && data.length > 100;
}

module.exports = { encryptData, decryptData, isEncrypted };
```

### 3.3 Create Auth Config Manager

**File:** `SourceCode/Angular/auth-manager.js` (NEW)

```javascript
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { encryptData, decryptData, isEncrypted } = require('./encryption');

const userDataPath = app.getPath('userData');
const authPath = path.join(userDataPath, 'auth.json');

function saveAuthConfig(authData) {
  const encrypted = {
    token: encryptData(authData.token),
    apiKey: encryptData(authData.apiKey),
    tenantId: authData.tenantId,
    cloudApiUrl: authData.cloudApiUrl,
    user: {
      id: encryptData(authData.user.id),
      email: authData.user.email,
      name: authData.user.name
    }
  };
  
  fs.writeFileSync(authPath, JSON.stringify(encrypted, null, 2));
}

function readAuthConfig() {
  try {
    if (!fs.existsSync(authPath)) {
      return null;
    }
    
    const authData = JSON.parse(fs.readFileSync(authPath, 'utf8'));
    
    return {
      token: isEncrypted(authData.token) ? decryptData(authData.token) : authData.token,
      apiKey: isEncrypted(authData.apiKey) ? decryptData(authData.apiKey) : authData.apiKey,
      tenantId: authData.tenantId,
      cloudApiUrl: authData.cloudApiUrl,
      user: {
        id: isEncrypted(authData.user?.id) ? decryptData(authData.user.id) : authData.user?.id,
        email: authData.user?.email,
        name: authData.user?.name
      }
    };
  } catch (error) {
    console.error('Failed to read auth config:', error);
    
    if (error.message.includes('decrypt')) {
      fs.unlinkSync(authPath);
      return null;
    }
    
    throw error;
  }
}

module.exports = { saveAuthConfig, readAuthConfig, authPath };
```

### Sprint 3 Testing

**Acceptance Criteria:**
- [ ] `node-dpapi` package installed
- [ ] `encryption.js` utility created
- [ ] `auth-manager.js` created
- [ ] Can encrypt/decrypt strings
- [ ] Encrypted data cannot be decrypted on different machine
- [ ] Auth config saves with encrypted fields
- [ ] Auth config reads and decrypts correctly

**Manual Test:**
```javascript
// Test encryption
const { encryptData, decryptData } = require('./encryption');

const original = 'test-api-key-12345';
const encrypted = encryptData(original);
const decrypted = decryptData(encrypted);

console.log('Original:', original);
console.log('Encrypted:', encrypted);
console.log('Decrypted:', decrypted);
console.log('Match:', original === decrypted); // Should be true

// Test auth manager
const { saveAuthConfig, readAuthConfig } = require('./auth-manager');

saveAuthConfig({
  token: 'jwt-token-here',
  apiKey: 'api-key-here',
  tenantId: '12345678-1234-1234-1234-123456789abc',
  cloudApiUrl: 'https://cloud.test.com',
  user: { id: 'user-id', email: 'test@test.com', name: 'Test User' }
});

const auth = readAuthConfig();
console.log('Read auth:', auth);
// Should show decrypted values
```

---

## Sprint 4: Cloud Login & Auto-Download (Electron)

**Duration:** 5-7 days  
**Focus:** Implement first-launch cloud login and automatic database download

### 4.1 Create Login Screen

**File:** `SourceCode/Angular/login.html` (NEW)

```html
<!DOCTYPE html>
<html>
<head>
  <title>MIL POS - Login</title>
  <link rel="stylesheet" href="login.css">
</head>
<body>
  <div class="login-container">
    <div class="logo">
      <h1>MIL POS</h1>
      <p>Welcome! Please login to continue</p>
    </div>
    
    <form id="loginForm">
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" required autocomplete="username">
      </div>
      
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" required autocomplete="current-password">
      </div>
      
      <button type="submit" id="loginBtn">Login</button>
      
      <div class="error" id="errorMsg"></div>
    </form>
    
    <div class="help">
      Need help? Contact your administrator
    </div>
  </div>

  <script src="login.js"></script>
</body>
</html>
```

**File:** `SourceCode/Angular/login.css` (NEW)

```css
body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  margin: 0;
}

.login-container {
  background: white;
  padding: 40px;
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  width: 350px;
}

/* ... rest of CSS from plan ... */
```

**File:** `SourceCode/Angular/login.js` (NEW)

```javascript
const form = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const errorMsg = document.getElementById('errorMsg');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  loginBtn.disabled = true;
  loginBtn.textContent = 'Logging in...';
  errorMsg.style.display = 'none';
  
  try {
    const result = await window.electronAPI.login(email, password);
    
    if (!result.success) {
      errorMsg.textContent = result.error || 'Login failed. Please try again.';
      errorMsg.style.display = 'block';
      loginBtn.disabled = false;
      loginBtn.textContent = 'Login';
    }
  } catch (error) {
    errorMsg.textContent = 'Connection error. Please check your internet.';
    errorMsg.style.display = 'block';
    loginBtn.disabled = false;
    loginBtn.textContent = 'Login';
  }
});
```

### 4.2 Create Download Splash Screen

**File:** Update [SourceCode/Angular/splash.html](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Angular/splash.html)

```html
<!DOCTYPE html>
<html>
<head>
  <title>Setting up...</title>
  <style>
    /* ... gradient background and styling ... */
  </style>
</head>
<body>
  <div class="splash-container">
    <div class="logo">MIL POS</div>
    <h2>Setting up your workspace...</h2>
    <div class="spinner"></div>
    <div class="progress-container">
      <div class="progress-bar" id="progressBar"></div>
    </div>
    <div class="status" id="statusText">Downloading your data...</div>
  </div>

  <script>
    window.electronAPI.onDownloadProgress((event, data) => {
      document.getElementById('progressBar').style.width = data.percent + '%';
      document.getElementById('statusText').textContent = data.message;
    });
  </script>
</body>
</html>
```

### 4.3 Update Main Process

**File:** [SourceCode/Angular/main.js](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Angular/main.js)

```javascript
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { saveAuthConfig, readAuthConfig } = require('./auth-manager');

const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'POSDb.db');
const settingsPath = path.join(userDataPath, 'appsettings.json');

const CLOUD_API_URL = process.env.CLOUD_API_URL || 'https://cloud.yourcompany.com';

let mainWindow = null;
let splashWindow = null;
let apiProcess = null;

app.whenReady().then(() => {
  if (!fs.existsSync(dbPath)) {
    showCloudLoginWindow();
  } else {
    startLocalMode();
  }
});

function showCloudLoginWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 500,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    frame: false,
    resizable: false
  });

  mainWindow.loadFile('login.html');
}

ipcMain.handle('cloud-login', async (event, { email, password }) => {
  try {
    // Check internet
    const isOnline = await checkInternetConnection();
    if (!isOnline) {
      return { success: false, error: 'No internet connection' };
    }

    // Authenticate
    const response = await axios.post(`${CLOUD_API_URL}/api/auth/login`, {
      email,
      password
    });

    const { token, tenantId, apiKey, user } = response.data;

    // Save encrypted auth
    saveAuthConfig({
      token,
      tenantId,
      apiKey,
      cloudApiUrl: CLOUD_API_URL,
      user
    });

    // Close login, show download splash
    mainWindow.close();
    showDownloadSplash();

    // Download database
    await downloadTenantDatabase(token);

    // Close splash, start app
    splashWindow.close();
    startLocalMode();

    return { success: true };

  } catch (error) {
    console.error('Login error:', error);
    return { 
      success: false, 
      error: error.response?.data?.message || 'Invalid credentials' 
    };
  }
});

async function checkInternetConnection() {
  try {
    await axios.get(`${CLOUD_API_URL}/api/health`, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

function showDownloadSplash() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 400,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    frame: false,
    resizable: false
  });

  splashWindow.loadFile('splash.html');
}

async function downloadTenantDatabase(token) {
  try {
    splashWindow.webContents.send('download-progress', {
      percent: 10,
      message: 'Connecting to server...'
    });

    const response = await axios({
      method: 'GET',
      url: `${CLOUD_API_URL}/api/tenants/my-database`,
      headers: { 'Authorization': `Bearer ${token}` },
      responseType: 'stream'
    });

    const totalSize = parseInt(response.headers['content-length'], 10);
    let downloadedSize = 0;

    const writer = fs.createWriteStream(dbPath);

    response.data.on('data', (chunk) => {
      downloadedSize += chunk.length;
      const percent = Math.round((downloadedSize / totalSize) * 70) + 10;
      
      splashWindow.webContents.send('download-progress', {
        percent,
        message: `Downloading... ${Math.round(downloadedSize / 1024 / 1024)}MB / ${Math.round(totalSize / 1024 / 1024)}MB`
      });
    });

    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    splashWindow.webContents.send('download-progress', {
      percent: 100,
      message: 'Setup complete! Starting application...'
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

  } catch (error) {
    console.error('Download error:', error);
    dialog.showErrorBox('Download Failed', 
      'Failed to download database. Please check your internet connection and try again.');
    app.quit();
  }
}

function startLocalMode() {
  const auth = readAuthConfig();
  startApiServer(auth);
  createMainWindow();
}

function startApiServer(auth) {
  const { spawn } = require('child_process');
  const apiPath = path.join(process.resourcesPath, 'api', 'POS.API.exe');
  
  const env = {
    ...process.env,
    ASPNETCORE_ENVIRONMENT: 'Production',
    ASPNETCORE_URLS: 'http://localhost:5000',
    USER_DATA_PATH: userDataPath,
    TENANT_ID: auth.tenantId,
    API_KEY: auth.apiKey,
    CLOUD_API_URL: auth.cloudApiUrl
  };
  
  apiProcess = spawn(apiPath, [], { env });
  
  apiProcess.stdout.on('data', (data) => {
    console.log(`API: ${data}`);
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  setTimeout(() => {
    mainWindow.loadURL('http://localhost:5000');
  }, 3000);
}

app.on('before-quit', () => {
  if (apiProcess) {
    apiProcess.kill();
  }
});
```

**File:** `SourceCode/Angular/preload.js`

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  login: (email, password) => ipcRenderer.invoke('cloud-login', { email, password }),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback)
});
```

### 4.4 Update .NET API to Read Environment Variables

**File:** [POS.API/Program.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Program.cs)

```csharp
public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        
        // Get credentials from environment (set by Electron)
        var userDataPath = Environment.GetEnvironmentVariable("USER_DATA_PATH");
        var env = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
        
        // ONLY override settings if running in Electron/Desktop mode
        if (!string.IsNullOrEmpty(userDataPath) || env == "Desktop")
        {
            var tenantId = Environment.GetEnvironmentVariable("TENANT_ID");
            var apiKey = Environment.GetEnvironmentVariable("API_KEY");
            var cloudApiUrl = Environment.GetEnvironmentVariable("CLOUD_API_URL");

            if (!string.IsNullOrEmpty(userDataPath))
            {
                // Override database path
                var dbPath = Path.Combine(userDataPath, "POSDb.db");
                builder.Configuration["ConnectionStrings:SqliteConnectionString"] = $"Data Source={dbPath}";
            }
            
            if (!string.IsNullOrEmpty(tenantId) && !string.IsNullOrEmpty(apiKey))
            {
                // Override sync settings
                builder.Configuration["TenantId"] = tenantId;
                builder.Configuration["ApiKey"] = apiKey;
                builder.Configuration["SyncSettings:CloudApiUrl"] = cloudApiUrl;
            }
        }
        
        // ... rest of configuration ...
    }
}
```

### Sprint 4 Testing

**Acceptance Criteria:**
- [ ] First launch shows cloud login screen
- [ ] Valid credentials authenticate successfully
- [ ] Invalid credentials show error message
- [ ] Download splash shows progress
- [ ] Database downloads to user data directory
- [ ] Credentials saved encrypted
- [ ] Embedded API starts with local database
- [ ] Angular app loads and works offline
- [ ] Second launch skips login (goes straight to app)

**Manual Test:**
1. Delete `C:\Users\{user}\AppData\Roaming\MIL POS\` directory
2. Launch MIL POS
3. Login screen should appear
4. Enter valid cloud credentials
5. Watch download progress
6. App should launch automatically
7. Close app and relaunch
8. Should go straight to local login (no cloud login)

---

## Sprint 5: Integration & Testing

**Duration:** 3-5 days  
**Focus:** End-to-end testing, error handling, documentation

### 5.1 Error Handling

**Scenarios to handle:**
- No internet on first launch
- Invalid credentials
- Download failure
- Corrupted auth file
- Database file missing
- API server startup failure

**Implementation:** Add error dialogs and retry logic (see detailed plan in cloud_authenticated_database_download.md)

### 5.2 End-to-End Testing

**Test Cases:**

1. **Fresh Install**
   - [ ] Install app on clean machine
   - [ ] First launch shows login
   - [ ] Login with valid credentials
   - [ ] Database downloads
   - [ ] App works offline

2. **Invalid Credentials**
   - [ ] Enter wrong password
   - [ ] Error message shown
   - [ ] Can retry

3. **No Internet**
   - [ ] Disconnect internet
   - [ ] Launch app
   - [ ] Error message shown
   - [ ] Can retry when connected

4. **Background Sync**
   - [ ] App running
   - [ ] Make changes
   - [ ] Wait 15 minutes
   - [ ] Check cloud for synced data

5. **Cross-Machine Protection**
   - [ ] Copy auth.json to different machine
   - [ ] Launch app
   - [ ] Should fail to decrypt
   - [ ] Should show login screen

### 5.3 Documentation

**Create:**
- [ ] End-user setup guide
- [ ] SuperAdmin guide
- [ ] Troubleshooting guide
- [ ] Developer documentation

### Sprint 5 Deliverables

- [ ] All error scenarios handled
- [ ] All test cases passing
- [ ] Documentation complete
- [ ] Ready for production deployment

---

## Implementation Order Summary

```
Sprint 1: API Key Infrastructure (Backend)
├── Add ApiKey to Tenant table
├── Auto-generate on tenant creation
├── API key validation middleware
└── Update sync endpoints

Sprint 2: Cloud Auth & Database Download (Backend)
├── Update JWT with ApiKey claim
├── Create /api/tenants/my-database endpoint
└── Update export handler for appsettings.json

Sprint 3: Machine-Specific Encryption (Electron)
├── Install node-dpapi
├── Create encryption utility
└── Create auth manager

Sprint 4: Cloud Login & Auto-Download (Electron)
├── Create login screen
├── Create download splash
├── Update main process
└── Update .NET API

Sprint 5: Integration & Testing
├── Error handling
├── End-to-end testing
└── Documentation
```

---

## Dependencies Between Sprints

- Sprint 2 depends on Sprint 1 (needs ApiKey in database)
- Sprint 4 depends on Sprint 2 (needs /my-database endpoint)
- Sprint 4 depends on Sprint 3 (needs encryption utilities)
- Sprint 5 depends on all previous sprints

**Can work in parallel:**
- Sprint 1 and Sprint 3 (independent)
- Sprint 2 backend and Sprint 3 Electron (independent)

---

## Rollback Plan

Each sprint is independently testable. If issues arise:

**Sprint 1:** Can rollback migration, remove middleware
**Sprint 2:** Can disable endpoint, revert JWT changes
**Sprint 3:** Can remove encryption (use plain text temporarily)
**Sprint 4:** Can use manual database setup (old flow)
**Sprint 5:** Testing phase, no rollback needed

---

## Success Criteria

**Overall Success:**
- ✅ User installs app → Logs in → Database downloads automatically
- ✅ User works 100% offline after setup
- ✅ Background sync works automatically
- ✅ Credentials protected by machine-specific encryption
- ✅ API key validates all sync operations
- ✅ No manual file management required

**Ready for Production When:**
- All sprints completed
- All test cases passing
- Documentation complete
- User acceptance testing passed
- Performance acceptable (download time < 2 minutes for typical database)

---

## Next Steps

1. **Review this plan** with team
2. **Start Sprint 1** - API Key Infrastructure
3. **Test Sprint 1** before moving to Sprint 2
4. **Iterate** through sprints
5. **Deploy** to production after Sprint 5

Would you like me to proceed with Sprint 1 implementation?
