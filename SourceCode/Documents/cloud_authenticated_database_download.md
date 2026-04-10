# Cloud-Authenticated Automatic Database Download - Implementation Plan

## Overview

**Concept**: Seamless first-time setup where user logs in to cloud, app automatically downloads their tenant database, then operates offline.

**User Experience**:
1. Install MIL POS from GitHub
2. Launch app → Login screen appears
3. Enter cloud credentials (email + password)
4. App authenticates, downloads database automatically
5. Shows progress/splash screen during download
6. Once complete, user works offline with local database
7. Background sync keeps data updated

---

## User Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: User Installs MIL POS                              │
│  Downloads from GitHub → Runs installer → Installs          │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 2: First Launch Detection                             │
│  App checks: Does local database exist?                     │
│  - No database found → Show login screen                    │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 3: Login Screen                                       │
│  ┌───────────────────────────────────────┐                 │
│  │  Welcome to MIL POS                   │                 │
│  │                                       │                 │
│  │  Email:    [________________]         │                 │
│  │  Password: [________________]         │                 │
│  │                                       │                 │
│  │  [x] Remember me                      │                 │
│  │                                       │                 │
│  │            [Login]                    │                 │
│  │                                       │                 │
│  │  Need help? Contact support           │                 │
│  └───────────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 4: Internet Check                                     │
│  - Check connectivity to cloud server                       │
│  - If offline → Show error, retry option                    │
│  - If online → Proceed to authentication                    │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 5: Cloud Authentication                               │
│  POST /api/auth/login                                       │
│  {                                                          │
│    "email": "user@company.com",                             │
│    "password": "***"                                        │
│  }                                                          │
│  Response:                                                  │
│  {                                                          │
│    "token": "jwt-token",                                    │
│    "tenantId": "12345678-...",                              │
│    "apiKey": "a1b2c3d4e5f6...",                             │
│    "user": { ... }                                          │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 6: Download Database (with Progress)                  │
│  ┌───────────────────────────────────────┐                 │
│  │  Setting up your workspace...         │                 │
│  │                                       │                 │
│  │  [████████████░░░░░░░░░░] 60%         │                 │
│  │                                       │                 │
│  │  Downloading your data...             │                 │
│  │  Please wait, this may take a moment  │                 │
│  └───────────────────────────────────────┘                 │
│                                                             │
│  GET /api/tenants/my-database                               │
│  Headers: Authorization: Bearer {jwt-token}                │
│  Response: SQLite database file                             │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 7: Save Configuration                                 │
│  Save to: C:\Users\{user}\AppData\Roaming\MIL POS\         │
│  - POSDb.db (downloaded database)                          │
│  - appsettings.json (TenantId, ApiKey, CloudUrl)           │
│  - auth.json (JWT token for sync)                          │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 8: Start Embedded API                                 │
│  - Launch POS.API.exe with local database                  │
│  - API runs on http://localhost:5000                        │
│  - Uses local SQLite database                               │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 9: Launch Application                                 │
│  - User logs in to LOCAL API (not cloud)                   │
│  - Works entirely offline                                   │
│  - Background sync runs periodically                        │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Future Launches: Direct to Local Login                     │
│  - Database exists → Skip cloud login                       │
│  - Show local login screen                                  │
│  - Authenticate against local database                      │
│  - Background sync keeps data updated                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### 1. First Launch Detection

**File**: `main.js` (Electron main process)

```javascript
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'POSDb.db');
const settingsPath = path.join(userDataPath, 'appsettings.json');
const authPath = path.join(userDataPath, 'auth.json');

let mainWindow = null;
let splashWindow = null;

app.whenReady().then(() => {
  if (!fs.existsSync(dbPath)) {
    // First run - show cloud login
    showCloudLoginWindow();
  } else {
    // Normal startup - start local API and show app
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

  // Load login page
  mainWindow.loadFile('login.html');
}
```

### 2. Cloud Login Screen

**File**: `login.html`

```html
<!DOCTYPE html>
<html>
<head>
  <title>MIL POS - Login</title>
  <style>
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
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo h1 {
      color: #667eea;
      margin: 0;
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      margin-bottom: 5px;
      color: #333;
      font-weight: 500;
    }
    input {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 5px;
      font-size: 14px;
      box-sizing: border-box;
    }
    input:focus {
      outline: none;
      border-color: #667eea;
    }
    button {
      width: 100%;
      padding: 12px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 5px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.3s;
    }
    button:hover {
      background: #5568d3;
    }
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    .error {
      color: #e74c3c;
      font-size: 14px;
      margin-top: 10px;
      display: none;
    }
    .help {
      text-align: center;
      margin-top: 20px;
      font-size: 12px;
      color: #666;
    }
  </style>
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

  <script>
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
        // Call Electron IPC to handle login
        const result = await window.electronAPI.login(email, password);
        
        if (result.success) {
          // Login successful, download will start automatically
          // This window will be closed by main process
        } else {
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
  </script>
</body>
</html>
```

### 3. Preload Script (IPC Bridge)

**File**: `preload.js`

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  login: (email, password) => ipcRenderer.invoke('cloud-login', { email, password }),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback)
});
```

### 4. Cloud Authentication Handler

**File**: `main.js` (continued)

```javascript
const CLOUD_API_URL = 'https://cloud.yourcompany.com'; // Or from config

ipcMain.handle('cloud-login', async (event, { email, password }) => {
  try {
    // Check internet connectivity first
    const isOnline = await checkInternetConnection();
    if (!isOnline) {
      return { 
        success: false, 
        error: 'No internet connection. Please check your network.' 
      };
    }

    // Authenticate with cloud
    const response = await axios.post(`${CLOUD_API_URL}/api/auth/login`, {
      email,
      password
    });

    const { token, tenantId, apiKey, user } = response.data;

    // Save auth info
    const authData = {
      token,
      tenantId,
      apiKey,
      cloudApiUrl: CLOUD_API_URL,
      user
    };
    fs.writeFileSync(authPath, JSON.stringify(authData, null, 2));

    // Close login window and show download splash
    mainWindow.close();
    showDownloadSplash();

    // Start database download
    await downloadTenantDatabase(token, tenantId, apiKey);

    // Close splash and start app
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
```

### 5. Download Splash Screen

**File**: `splash.html`

```html
<!DOCTYPE html>
<html>
<head>
  <title>Setting up...</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
    }
    .splash-container {
      background: white;
      padding: 60px;
      border-radius: 10px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      text-align: center;
      width: 400px;
    }
    .logo {
      font-size: 48px;
      color: #667eea;
      margin-bottom: 20px;
    }
    .progress-container {
      width: 100%;
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
      margin: 30px 0;
    }
    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      width: 0%;
      transition: width 0.3s ease;
    }
    .status {
      color: #666;
      font-size: 14px;
      margin-top: 10px;
    }
    .spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #667eea;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 20px auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
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
      const progressBar = document.getElementById('progressBar');
      const statusText = document.getElementById('statusText');
      
      progressBar.style.width = data.percent + '%';
      statusText.textContent = data.message;
    });
  </script>
</body>
</html>
```

### 6. Database Download with Progress

**File**: `main.js` (continued)

```javascript
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

async function downloadTenantDatabase(token, tenantId, apiKey) {
  try {
    // Update progress: Starting
    splashWindow.webContents.send('download-progress', {
      percent: 10,
      message: 'Connecting to server...'
    });

    // Download database file
    const response = await axios({
      method: 'GET',
      url: `${CLOUD_API_URL}/api/tenants/my-database`,
      headers: {
        'Authorization': `Bearer ${token}`
      },
      responseType: 'stream'
    });

    const totalSize = parseInt(response.headers['content-length'], 10);
    let downloadedSize = 0;

    const writer = fs.createWriteStream(dbPath);

    response.data.on('data', (chunk) => {
      downloadedSize += chunk.length;
      const percent = Math.round((downloadedSize / totalSize) * 70) + 10; // 10-80%
      
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

    // Update progress: Configuring
    splashWindow.webContents.send('download-progress', {
      percent: 85,
      message: 'Configuring application...'
    });

    // Create appsettings.json
    const settings = {
      TenantId: tenantId,
      ApiKey: apiKey,
      SyncSettings: {
        CloudApiUrl: CLOUD_API_URL,
        SyncIntervalMinutes: 15,
        AutoSync: true
      },
      DatabaseProvider: 'Sqlite',
      ConnectionStrings: {
        SqliteConnectionString: `Data Source=${dbPath}`
      }
    };

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

    // Update progress: Complete
    splashWindow.webContents.send('download-progress', {
      percent: 100,
      message: 'Setup complete! Starting application...'
    });

    // Wait a moment for user to see completion
    await new Promise(resolve => setTimeout(resolve, 1000));

  } catch (error) {
    console.error('Download error:', error);
    
    // Show error dialog
    const { dialog } = require('electron');
    dialog.showErrorBox('Download Failed', 
      'Failed to download database. Please check your internet connection and try again.');
    
    app.quit();
  }
}
```

### 7. Start Local Mode

**File**: `main.js` (continued)

```javascript
function startLocalMode() {
  // Read settings
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  
  // Start embedded API server
  startApiServer(settings);
  
  // Create main application window
  createMainWindow();
}

function startApiServer(settings) {
  const { spawn } = require('child_process');
  const apiPath = path.join(process.resourcesPath, 'api', 'POS.API.exe');
  
  const env = {
    ...process.env,
    ASPNETCORE_ENVIRONMENT: 'Production',
    ASPNETCORE_URLS: 'http://localhost:5000',
    USER_DATA_PATH: userDataPath
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

  // Wait for API to be ready
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:5000');
  }, 3000);
}
```

---

## Backend API Endpoint

### Download My Database Endpoint

**File**: [TenantsController.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Controllers/TenantsController.cs)

```csharp
[HttpGet("my-database")]
[Authorize]
public async Task<IActionResult> DownloadMyDatabase()
{
    // Get current user's tenant from JWT
    var tenantIdClaim = User.FindFirst("TenantId");
    if (tenantIdClaim == null || !Guid.TryParse(tenantIdClaim.Value, out var tenantId))
    {
        return Unauthorized("Invalid tenant");
    }
    
    // Export tenant database
    var command = new ExportTenantToSqliteCommand { TenantId = tenantId };
    var result = await _mediator.Send(command);
    
    if (!result.Success)
        return BadRequest(result.Errors);
    
    // Return database file
    var fileBytes = await System.IO.File.ReadAllBytesAsync(result.Data.FilePath);
    
    // Clean up temp file
    System.IO.File.Delete(result.Data.FilePath);
    
    return File(fileBytes, "application/x-sqlite3", $"POSDb_{DateTime.Now:yyyyMMdd}.db");
}
```

---

## Security Considerations

### 1. Credential Storage

**auth.json** (stored in user data directory):
```json
{
  "token": "jwt-token-here",
  "tenantId": "12345678-...",
  "apiKey": "a1b2c3d4e5f6...",
  "cloudApiUrl": "https://cloud.yourcompany.com",
  "user": {
    "id": "user-id",
    "email": "user@company.com",
    "name": "John Doe"
  }
}
```

**Security Measures**:
- ✅ File stored in user's AppData (protected by OS)
- ✅ JWT token used only for background sync
- ✅ API key used for sync authentication
- ⚠️ Consider encrypting auth.json with machine-specific key

### 2. Token Refresh

For background sync, implement token refresh:

```javascript
async function refreshToken() {
  const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
  
  try {
    const response = await axios.post(`${auth.cloudApiUrl}/api/auth/refresh`, {
      token: auth.token
    });
    
    auth.token = response.data.token;
    fs.writeFileSync(authPath, JSON.stringify(auth, null, 2));
    
    return auth.token;
  } catch (error) {
    // Token refresh failed - user needs to login again
    return null;
  }
}
```

---

## Offline Operation

### Local Authentication

After database is downloaded, user authenticates against **local database**:

1. User opens app
2. App starts local API (http://localhost:5000)
3. Login screen connects to local API
4. Credentials validated against local database
5. User works entirely offline

### Background Sync

**Important**: The .NET API already has background jobs (Hangfire) for automatic sync. The Electron app doesn't need to schedule sync - it just needs to provide credentials to the API.

**How it works**:

1. Electron starts embedded .NET API with credentials
2. .NET API's Hangfire jobs automatically sync every 15 minutes
3. No additional sync scheduling needed in Electron

**Implementation**:

```javascript
function startApiServer(settings) {
  const { spawn } = require('child_process');
  const apiPath = path.join(process.resourcesPath, 'api', 'POS.API.exe');
  
  // Read auth config (will be decrypted if using machine-specific encryption)
  const auth = readAuthConfig();
  
  const env = {
    ...process.env,
    ASPNETCORE_ENVIRONMENT: 'Production',
    ASPNETCORE_URLS: 'http://localhost:5000',
    USER_DATA_PATH: userDataPath,
    
    // Pass credentials to API for Hangfire sync jobs
    TENANT_ID: auth.tenantId,
    API_KEY: auth.apiKey,
    CLOUD_API_URL: auth.cloudApiUrl
  };
  
  apiProcess = spawn(apiPath, [], { env });
}
```

**Result**: .NET API's existing Hangfire jobs handle all sync automatically using provided credentials.


---

## Error Handling

### No Internet on First Launch

```javascript
if (!isOnline) {
  dialog.showMessageBox({
    type: 'error',
    title: 'No Internet Connection',
    message: 'Internet connection is required for first-time setup.',
    detail: 'Please connect to the internet and try again.',
    buttons: ['Retry', 'Exit']
  }).then((result) => {
    if (result.response === 0) {
      // Retry
      showCloudLoginWindow();
    } else {
      app.quit();
    }
  });
}
```

### Invalid Credentials

Show error message on login screen (already implemented in login.html).

### Download Failure

```javascript
catch (error) {
  dialog.showMessageBox({
    type: 'error',
    title: 'Download Failed',
    message: 'Failed to download your database.',
    detail: error.message,
    buttons: ['Retry', 'Exit']
  }).then((result) => {
    if (result.response === 0) {
      downloadTenantDatabase(token, tenantId, apiKey);
    } else {
      app.quit();
    }
  });
}
```

---

## Advantages of This Approach

### ✅ User Experience
- **Seamless**: Login once, everything automatic
- **No manual steps**: No ZIP files to manage
- **Professional**: Looks like enterprise software
- **Progress feedback**: User sees what's happening

### ✅ Security
- **Authenticated download**: Only authorized users get database
- **Encrypted transfer**: HTTPS for download
- **API key embedded**: Ready for sync
- **No manual credential entry**: Less error-prone

### ✅ Scalability
- **Single installer**: One installer for all tenants
- **Cloud-managed**: SuperAdmin doesn't send files
- **Easy updates**: App updates via GitHub, data via sync

### ✅ Maintenance
- **Centralized**: All databases on cloud
- **Audit trail**: Track who downloaded what
- **Version control**: Can track database versions

---

## Comparison: Manual vs Automatic

| Aspect | Manual ZIP | Automatic Download |
|--------|-----------|-------------------|
| **User Steps** | 3 steps | 1 step (login) |
| **Internet Required** | No | Yes (first time) |
| **SuperAdmin Work** | Send ZIP files | None |
| **User Experience** | ⚠️ Manual | ✅ Seamless |
| **Security** | ⚠️ File transfer | ✅ Authenticated |
| **Scalability** | ❌ Manual | ✅ Automatic |
| **Error Prone** | ⚠️ Medium | ✅ Low |

---

## Implementation Checklist

### Phase 1: Electron UI (Week 1)
- [ ] Create login.html with styling
- [ ] Create splash.html with progress bar
- [ ] Implement preload.js IPC bridge
- [ ] Add first-launch detection
- [ ] Test UI flows

### Phase 2: Authentication (Week 1-2)
- [ ] Implement cloud login handler
- [ ] Add internet connectivity check
- [ ] Implement error handling
- [ ] Store auth credentials
- [ ] Test authentication

### Phase 3: Database Download (Week 2)
- [ ] Implement download with progress
- [ ] Create appsettings.json automatically
- [ ] Handle download errors
- [ ] Test large database downloads
- [ ] Verify file integrity

### Phase 4: Backend API (Week 2)
- [ ] Create `/api/tenants/my-database` endpoint
- [ ] Add authentication check
- [ ] Implement database export
- [ ] Test endpoint performance
- [ ] Add rate limiting

### Phase 5: Local Mode (Week 3)
- [ ] Start embedded API with local database
- [ ] Implement local login
- [ ] Test offline operation
- [ ] Verify data persistence

### Phase 6: Background Sync (Week 3)
- [ ] Implement sync scheduler
- [ ] Add token refresh
- [ ] Handle sync errors
- [ ] Test sync reliability

### Phase 7: Testing & Polish (Week 4)
- [ ] End-to-end testing
- [ ] Error scenario testing
- [ ] Performance optimization
- [ ] User acceptance testing

---

## Recommendation

✅ **STRONGLY RECOMMENDED**: Automatic Cloud-Authenticated Download

**Reasons**:
1. **Superior UX**: Single login vs manual file management
2. **More Secure**: Authenticated download vs file transfer
3. **Scalable**: Works for 1 or 1000 tenants
4. **Professional**: Enterprise-grade experience
5. **Less Support**: Fewer user errors

**Trade-off**: Requires internet on first launch (acceptable for modern apps)

---

## Next Steps

1. Review and approve this plan
2. Decide on implementation timeline
3. Start with Phase 1 (Electron UI)
4. Iterate and test each phase
5. Deploy to production

Would you like me to proceed with implementation?
