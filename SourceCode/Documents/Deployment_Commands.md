# Database Migration and Deployment Commands

## 1. Database Migration (Sync Support)

### Create Migration
```powershell
# Navigate to SQLAPI folder
cd F:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI

# Create migration for sync support
dotnet ef migrations add AddSyncSupport --project POS.Domain --startup-project POS.API --context POSDbContext
```

### Apply Migration to SQLite (Desktop)
```powershell
# Update SQLite database with sync columns
dotnet ef database update --project POS.Domain --startup-project POS.API --context POSDbContext --connection "Data Source=pos.db"
```

### Apply Migration to SQL Server (Cloud)
```powershell
# Update SQL Server database with sync columns
dotnet ef database update --project POS.Domain --startup-project POS.API --context POSDbContext
```

---

## 2. Desktop Build & Electron Installer

### Build Desktop Version
```powershell
# Run the desktop build script
.\build-desktop.ps1
```

This script will:
- Build Angular frontend
- Build .NET API
- Copy Angular dist to API wwwroot
- Create Desktop deployment package in `Builds/Desktop/`

### Run Desktop Locally (Development)
```powershell
# Set environment to Desktop
$env:ASPNETCORE_ENVIRONMENT="Desktop"

# Run the API (which serves Angular from wwwroot)
dotnet run --project POS.API/POS.API.csproj
```

### Create Electron Installer

**Step 1: Install Electron Packager**
```powershell
npm install -g electron-packager
```

**Step 2: Create Electron Wrapper** (if not exists)

Create `electron-app/main.js`:
```javascript
const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let mainWindow;
let apiProcess;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // Start .NET API
    const apiPath = path.join(__dirname, 'api', 'POS.API.exe');
    apiProcess = spawn(apiPath, [], {
        env: { ...process.env, ASPNETCORE_ENVIRONMENT: 'Desktop' }
    });

    // Wait for API to start, then load
    setTimeout(() => {
        mainWindow.loadURL('http://localhost:5000');
    }, 3000);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (apiProcess) {
        apiProcess.kill();
    }
    app.quit();
});
```

**Step 3: Package Electron App**
```powershell
# Package for Windows
electron-packager . POSDesktop --platform=win32 --arch=x64 --out=dist --overwrite --icon=icon.ico

# Create installer using Inno Setup or NSIS
# Or use electron-builder for more advanced packaging
```

**Alternative: Using Electron Builder**
```powershell
# Install electron-builder
npm install -g electron-builder

# Create installer
electron-builder --win --x64
```

---

## 3. Cloud Deployment

### Build Cloud Version
```powershell
# Run the cloud build script
.\build-cloud.ps1
```

This script will:
- Build Angular frontend separately
- Build .NET API separately
- Create Cloud deployment packages in `Builds/Cloud/API/` and `Builds/Cloud/Angular/`

### Deploy to Azure App Service

**Deploy API:**
```powershell
# Login to Azure
az login

# Create resource group (if not exists)
az group create --name pos-rg --location eastus

# Create App Service plan
az appservice plan create --name pos-plan --resource-group pos-rg --sku B1 --is-linux

# Create Web App for API
az webapp create --name pos-api --resource-group pos-rg --plan pos-plan --runtime "DOTNETCORE:10.0"

# Deploy API
cd Builds/Cloud/API
az webapp deployment source config-zip --resource-group pos-rg --name pos-api --src api.zip

# Set environment variables
az webapp config appsettings set --resource-group pos-rg --name pos-api --settings ASPNETCORE_ENVIRONMENT=Cloud
```

**Deploy Angular (Static Web App or Storage):**
```powershell
# Option 1: Azure Static Web Apps
az staticwebapp create --name pos-frontend --resource-group pos-rg --source Builds/Cloud/Angular --location eastus

# Option 2: Azure Blob Storage + CDN
az storage account create --name posstorage --resource-group pos-rg --location eastus --sku Standard_LRS
az storage blob service-properties update --account-name posstorage --static-website --index-document index.html

# Upload Angular files
az storage blob upload-batch --account-name posstorage --destination '$web' --source Builds/Cloud/Angular
```

### Deploy to IIS (Windows Server)

**API Deployment:**
```powershell
# Copy API files to IIS
Copy-Item -Path "Builds/Cloud/API/*" -Destination "C:\inetpub\wwwroot\pos-api" -Recurse -Force

# Create IIS Application Pool
New-WebAppPool -Name "POSAPIPool" -Force
Set-ItemProperty IIS:\AppPools\POSAPIPool -Name "managedRuntimeVersion" -Value ""

# Create IIS Website
New-Website -Name "POS-API" -Port 5000 -PhysicalPath "C:\inetpub\wwwroot\pos-api" -ApplicationPool "POSAPIPool" -Force

# Set environment variable
[Environment]::SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Cloud", "Machine")
```

**Angular Deployment:**
```powershell
# Copy Angular files to IIS
Copy-Item -Path "Builds/Cloud/Angular/*" -Destination "C:\inetpub\wwwroot\pos-frontend" -Recurse -Force

# Create IIS Website for Angular
New-Website -Name "POS-Frontend" -Port 80 -PhysicalPath "C:\inetpub\wwwroot\pos-frontend" -Force
```

---

## 4. Quick Reference Commands

### Development
```powershell
# Desktop Development
$env:ASPNETCORE_ENVIRONMENT="Desktop"
dotnet run --project POS.API/POS.API.csproj

# Cloud Development
$env:ASPNETCORE_ENVIRONMENT="Cloud"
dotnet run --project POS.API/POS.API.csproj
```

### Build
```powershell
# Build Desktop
.\build-desktop.ps1

# Build Cloud
.\build-cloud.ps1

# Build Both
.\build-all.ps1
```

### Database
```powershell
# Create Migration
dotnet ef migrations add MigrationName --project POS.Domain --startup-project POS.API

# Update Database
dotnet ef database update --project POS.Domain --startup-project POS.API

# Remove Last Migration
dotnet ef migrations remove --project POS.Domain --startup-project POS.API
```

---

## 5. Configuration Files

### Desktop (appsettings.Desktop.json)
```json
{
  "TenantId": "00000000-0000-0000-0000-000000000001",
  "ConnectionStrings": {
    "SqliteConnectionString": "Data Source=pos.db"
  },
  "DeploymentSettings": {
    "DeploymentMode": "Desktop",
    "MultiTenancy": {
      "Enabled": false
    }
  },
  "SyncSettings": {
    "CloudApiUrl": "https://your-api.azurewebsites.net",
    "SyncIntervalMinutes": 5
  }
}
```

### Cloud (appsettings.Cloud.json)
```json
{
  "ConnectionStrings": {
    "DbConnectionString": "Server=your-server.database.windows.net;Database=POSDB;User Id=admin;Password=***;"
  },
  "DeploymentSettings": {
    "DeploymentMode": "Cloud",
    "MultiTenancy": {
      "Enabled": true
    }
  },
  "CloudSettings": {
    "CorsOrigins": ["https://your-frontend.azurestaticapps.net"]
  }
}
```

---

## 6. Testing Sync

### Test Manual Sync
```powershell
# From Desktop, trigger manual sync
curl -X POST http://localhost:5000/api/sync/now?direction=Bidirectional
```

### Check Sync Status
```powershell
curl http://localhost:5000/api/sync/status
```

---

## Notes

- **Desktop**: Uses SQLite, single-tenant, embedded Angular
- **Cloud**: Uses SQL Server, multi-tenant, separate Angular deployment
- **Sync**: Desktop pulls/pushes to Cloud using TenantId authentication
- **Migration**: Run on both SQLite and SQL Server databases
