const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const url = require('url');
const { spawn } = require('child_process');
const fs = require('fs');
const axios = require('axios');
const AdmZip = require('adm-zip');
const { encryptData, decryptData, isEncrypted } = require('./encryption');

const authPath = path.join(app.getPath('userData'), 'auth.json');

let win;
let splash;
let apiProcess;

// Shared logging function
function logToFile(msg) {
    try {
        const userDataPath = app.getPath('userData');
        const logTrace = path.join(userDataPath, 'api-debug.log');
        fs.appendFileSync(logTrace, `[${new Date().toISOString()}] ${msg}\n`);
    } catch(e) { 
        console.error("Log failed", e); 
    }
}

/**
 * Reads and decrypts auth configuration
 * @returns {object} - Decrypted auth data
 */
function readAuthConfig() {
  try {
    if (!fs.existsSync(authPath)) {
      return null;
    }

    const authData = JSON.parse(fs.readFileSync(authPath, 'utf8'));

    // Decrypt sensitive fields if they appear to be encrypted
    return {
      token: isEncrypted(authData.token) 
        ? decryptData(authData.token) 
        : authData.token,
      apiKey: isEncrypted(authData.apiKey) 
        ? decryptData(authData.apiKey) 
        : authData.apiKey,
      tenantId: authData.tenantId,
      cloudApiUrl: authData.cloudApiUrl,
      user: {
        id: authData.user?.id && isEncrypted(authData.user.id) 
          ? decryptData(authData.user.id) 
          : authData.user?.id,
        email: authData.user?.email,
        name: authData.user?.name
      }
    };
  } catch (error) {
    console.error('Failed to read auth config:', error);
    
    // If decryption fails, the credentials might be from another machine or corrupted
    if (error.message.includes('decrypt') || error.message.includes('machine mismatch')) {
      logToFile('CRITICAL: Auth decryption failed (machine mismatch?). Clearing credentials.');
      try {
        fs.unlinkSync(authPath);
      } catch (e) {}
      return null;
    }
    
    return null;
  }
}

/**
 * Saves and encrypts auth configuration
 * @param {object} config - Plain text auth data from login
 */
function saveAuthConfig(config) {
  try {
    const encryptedData = {
      token: encryptData(config.token),
      apiKey: encryptData(config.apiKey),
      tenantId: config.tenantId,
      cloudApiUrl: config.cloudApiUrl,
      user: {
        id: encryptData(config.user?.id),
        email: config.user?.email,
        name: config.user?.name
      },
      savedAt: new Date().toISOString()
    };

    fs.writeFileSync(authPath, JSON.stringify(encryptedData, null, 2));
    logToFile('Auth configuration saved and encrypted.');
    return true;
  } catch (error) {
    console.error('Failed to save auth config:', error);
    logToFile(`ERROR: Failed to save auth config: ${error.message}`);
    return false;
  }
}

// IPC Handlers for Cloud Authentication
ipcMain.handle('save-auth', async (event, config) => {
  return saveAuthConfig(config);
});

ipcMain.handle('get-auth', async (event) => {
  return readAuthConfig();
});

ipcMain.handle('clear-auth', async (event) => {
  try {
    if (fs.existsSync(authPath)) fs.unlinkSync(authPath);
    return true;
  } catch (e) {
    return false;
  }
});

const CLOUD_API_URL = 'http://208.110.72.211'; // Production Cloud API

ipcMain.handle('cloud-login', async (event, { email, password }) => {
  try {
    logToFile(`CLOUD LOGIN: Attempting login for ${email}`);
    
    // 1. Authenticate with Cloud
    const response = await axios.post(`${CLOUD_API_URL}/api/authentication`, {
      userName: email,
      password
    });

    const { bearerToken, tenantId, apiKey, user } = response.data;
    
    if (!bearerToken) {
       throw new Error('Authentication failed: No token received');
    }

    // 2. Save Auth Info (Encrypted)
    const authData = {
      token: bearerToken,
      tenantId,
      apiKey,
      cloudApiUrl: CLOUD_API_URL,
      user
    };
    saveAuthConfig(authData);

    // 3. Transition to Setup Splash
    if (win) win.close();
    showSetupSplash();

    // 4. Download and Extract Database
    await downloadAndSetupDatabase(bearerToken);

    // 5. Cleanup and Start regular API
    logToFile('CLOUD LOGIN: Setup complete. Starting regular API.');
    if (splash) splash.close();
    startApi();

    return { success: true };

  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message || 'Login failed';
    logToFile(`ERROR: Cloud login failed: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
});

function showSetupSplash() {
    splash = new BrowserWindow({
      width: 500,
      height: 400,
      frame: false,
      resizable: false,
      alwaysOnTop: true,
      icon: path.join(__dirname, 'icon.png'),
      webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, 'preload.js')
      }
    });

    splash.loadFile(path.join(__dirname, 'setup-splash.html'));
}

async function downloadAndSetupDatabase(token) {
    const userDataPath = app.getPath('userData');
    const tempZipPath = path.join(userDataPath, 'setup_package.zip');
    const dbPath = path.join(userDataPath, 'POSDb.db');
    
    try {
        logToFile('DOWNLOAD: Starting database download...');
        splash.webContents.send('download-progress', { 
            percent: 10, 
            header: 'Connecting...', 
            detail: 'Requesting secure database package' 
        });

        const response = await axios({
            method: 'GET',
            url: `${CLOUD_API_URL}/api/tenants/my-database`,
            headers: { 'Authorization': `Bearer ${token}` },
            responseType: 'stream'
        });

        const totalLength = response.headers['content-length'];
        let downloadedLength = 0;

        const writer = fs.createWriteStream(tempZipPath);
        
        response.data.on('data', (chunk) => {
            downloadedLength += chunk.length;
            const progress = totalLength ? Math.round((downloadedLength / totalLength) * 70) + 10 : 40;
            splash.webContents.send('download-progress', { 
                percent: progress, 
                header: 'Downloading...', 
                detail: `Received ${Math.round(downloadedLength / 1024)} KB` 
            });
        });

        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        logToFile('DOWNLOAD: Extraction started.');
        splash.webContents.send('download-progress', { 
            percent: 85, 
            header: 'Extracting...', 
            detail: 'Configuring local workspace' 
        });

        // Extract ZIP
        const zip = new AdmZip(tempZipPath);
        zip.extractAllTo(userDataPath, true);

        // Cleanup
        fs.unlinkSync(tempZipPath);
        
        splash.webContents.send('download-progress', { 
            percent: 100, 
            header: 'Complete', 
            detail: 'Starting MIL POS...' 
        });
        
        await new Promise(r => setTimeout(r, 1000));

    } catch (error) {
        logToFile(`ERROR: Database setup failed: ${error.message}`);
        dialog.showErrorBox('Setup Failed', `Failed to download or configure your workspace: ${error.message}`);
        app.quit();
    }
}

function startApi() {
  const isDev = process.argv.includes('--dev');
  
  // Handling for Dev mode or Unpackaged mode where we just want the window
  if (isDev) {
    console.log('Dev mode detected. Opening main window immediately.');
    createMainWindow();
    if (splash) { splash.close(); splash = null; }
    return;
  }

  let apiPath;
  let sourceDbPath;
  const userDataPath = app.getPath('userData');
  const appendLog = logToFile;

  if (app.isPackaged) {
      apiPath = path.join(process.resourcesPath, 'api', 'POS.API.exe');
      sourceDbPath = path.join(process.resourcesPath, 'api', 'POSDb.db');
  } else {
      // Local Debug Mode (Simulation of Prod)
      // Path based on package.json build script
      apiPath = path.join(__dirname, '../SQLAPI/POS.API/bin/Release/net10.0/win-x64/publish/POS.API.exe');
      sourceDbPath = path.join(__dirname, '../SQLAPI/POS.API/bin/Release/net10.0/win-x64/publish/POSDb.db');
      console.log('Running in Local Production Simulation Mode');
      appendLog('STARTUP: Running in Unpackaged (Local) Mode');
  }

  appendLog(`STARTUP: Attempting to start API from ${apiPath}`);
  
  // Safety Timeout: Guarantee main window opens even if API fails silently or hangs
  const startupTimeout = setTimeout(() => {
      const msg = 'Startup timeout (60s). Forcing application open.';
      console.warn(msg);
      appendLog(`WARNING: ${msg}`);
      if (!win) createMainWindow();
      if (splash) { splash.close(); splash = null; }
  }, 60000); // 60 seconds

  // 1. Check executable existence
  if (!fs.existsSync(apiPath)) {
      clearTimeout(startupTimeout);
      const msg = `API Executable not found at: ${apiPath}. \nMake sure to run 'npm run build:api' first.`;
      console.error(msg);
      appendLog(`ERROR: ${msg}`);
      dialog.showErrorBox('Startup Error', msg);
      if (splash) splash.close(); 
      // Only quit if packaged, otherwise we might want to keep the window open for manual debug
      if (app.isPackaged) app.quit();
      return;
  }
  
  // 2. Database setup
  const dbPath = path.join(userDataPath, 'POSDb.db');
  
  // First Run Check: If no DB exists, show Cloud Login
  if (!fs.existsSync(dbPath)) {
      clearTimeout(startupTimeout);
      logToFile('STARTUP: No database found. Triggering Cloud Login Flow.');
      
      // Close splash before showing login to prevent layering issues
      if (splash) {
          splash.close();
          splash = null;
      }
      
      showCloudLogin();
      return;
  }

    if (!fs.existsSync(dbPath) && fs.existsSync(sourceDbPath)) {
        try {
            fs.copyFileSync(sourceDbPath, dbPath);
            appendLog(`Database copied to: ${dbPath}`);
        } catch (err) {
            appendLog(`ERROR: Failed to copy database: ${err}`);
        }
    }

    // 3. Spawn Process
    try {
      const auth = readAuthConfig();
      const connectionString = `Data Source=${dbPath}`;
      
      const env = { 
        ...process.env, 
        ASPNETCORE_ENVIRONMENT: 'Desktop',
        // Pass credentials to API via environment variables
        TENANT_ID: auth?.tenantId || '',
        API_KEY: auth?.apiKey || '',
        CLOUD_API_URL: auth?.cloudApiUrl || ''
      };

      apiProcess = spawn(apiPath, [
        `--ConnectionStrings:SqliteConnectionString=${connectionString}`
      ], {
        cwd: path.dirname(apiPath),
        env: env,
        shell: false
      });
      
      appendLog(`Process spawned with PID: ${apiProcess.pid}`);

      apiProcess.stdout.on('data', (data) => {
        const output = data.toString();
        appendLog(`API [STDOUT]: ${output.trim()}`); 
        
        if (!win && (output.includes('Application is running on') || output.includes('Now listening on:'))) {
           appendLog('API Server reported ready.');
           clearTimeout(startupTimeout);
           createMainWindow();
           if (splash) { splash.close(); splash = null; }
        }
      });

      apiProcess.stderr.on('data', (data) => {
        appendLog(`API [STDERR]: ${data.toString().trim()}`);
      });

      apiProcess.on('error', (err) => {
        clearTimeout(startupTimeout);
        appendLog(`ERROR: Process spawn error: ${err}`);
        dialog.showErrorBox('API Launch Error', `Failed to start background service: ${err}`);
        if (!win) createMainWindow(); // Try to open anyway
        if (splash) splash.close();
      });

      apiProcess.on('exit', (code, signal) => {
        appendLog(`EXIT: Process exited with code ${code} and signal ${signal}`);
        // If it exits early, we should probably warn the user
        // But the timeout will handle the window opening if it hasn't already
      });

    } catch (e) {
       clearTimeout(startupTimeout);
       appendLog(`CRITICAL: Exception spawning process: ${e}`);
       dialog.showErrorBox('Spawn Exception', `Critical error: ${e}`);
       if (!win) createMainWindow();
       if (splash) splash.close();
    }
}


function checkForUpdates() {
    if (!app.isPackaged) {
        logToFile('UPDATE: Skipping update check (Dev Mode)');
        return;
    }

    logToFile('UPDATE: Checking for updates...');
    
    // Bypass signature verification for unsigned builds
    autoUpdater.verifyUpdateCodeSignature = false;

    try {
        autoUpdater.checkForUpdatesAndNotify();
    } catch (e) {
        logToFile(`UPDATE: Check failed: ${e}`);
    }

    autoUpdater.on('checking-for-update', () => {
        logToFile('UPDATE: Checking for update...');
    });

    autoUpdater.on('update-available', (info) => {
        logToFile(`UPDATE: Update available: ${info.version}`);
    });

    autoUpdater.on('update-not-available', (info) => {
        logToFile('UPDATE: Update not available.');
    });

    autoUpdater.on('error', (err) => {
        logToFile(`UPDATE: Error in auto-updater. ${err}`);
    });

    autoUpdater.on('download-progress', (progressObj) => {
        let log_message = "Download speed: " + progressObj.bytesPerSecond;
        log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
        log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
        // logToFile(log_message); // Too verbose for file log? maybe just log every 10%?
    });

    autoUpdater.on('update-downloaded', (info) => {
        logToFile('UPDATE: Update downloaded. Prompting restart.');
        dialog.showMessageBox({
            type: 'info',
            title: 'Update Ready',
            message: 'A new version of MIL POS has been downloaded. The application will restart to apply updates.',
            buttons: ['Restart Now', 'Later']
        }).then((returnValue) => {
            if (returnValue.response === 0) {
                logToFile('UPDATE: User accepted restart.');
                if (apiProcess) apiProcess.kill();
                autoUpdater.quitAndInstall(false, true);
            }
        });
    });
}

function createWindow() {
  splash = new BrowserWindow({
    width: 600,
    height: 400,
    transparent: false,
    frame: false,
    alwaysOnTop: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
        nodeIntegration: false
    }
  });

  const splashPath = app.isPackaged
      ? path.join(__dirname, 'splash.html') 
      : path.join(__dirname, 'splash.html');

  splash.loadFile(splashPath);

  startApi();
  checkForUpdates();
}

function createMainWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Wait for ready-to-show
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const isDev = process.argv.includes('--dev');

  if (isDev) {
    win.loadURL('http://localhost:4200');
    win.webContents.openDevTools();
  } else {
    let indexPath;
    if (app.isPackaged) {
      indexPath = path.join(__dirname, 'dist/index.html'); // Corrected path mainly for packaged app
    } else {
      indexPath = path.join(__dirname, '../SQLAPI/POS.API/ClientApp/browser/index.html');
    }

    win.loadFile(indexPath).catch(e => {
        console.error('Failed to load file:', e);
        // Fallback or log error
    });
  }

  win.once('ready-to-show', () => {
      win.show();
  });

  win.on('closed', () => {
    win = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (apiProcess) {
    apiProcess.kill();
  }
});

app.on('activate', () => {
  if (win === null) {
    createWindow();
  }
});

function showCloudLogin() {
    win = new BrowserWindow({
      width: 450,
      height: 600,
      frame: false,
      resizable: false,
      transparent: true,
      icon: path.join(__dirname, 'icon.png'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        devTools: false // Explicitly enable DevTools
      }
    });

    // Open DevTools for debugging
    win.webContents.openDevTools({ mode: 'detach' });

    win.loadFile(path.join(__dirname, 'login-cloud.html'));
    
    win.on('closed', () => {
      win = null;
    });
}
