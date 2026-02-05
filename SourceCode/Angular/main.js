const { app, BrowserWindow, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const url = require('url');
const { spawn } = require('child_process');
const fs = require('fs');

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
  
  // ... (rest of logic)
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
      const connectionString = `Data Source=${dbPath}`;
      apiProcess = spawn(apiPath, [
        `--ConnectionStrings:SqliteConnectionString=${connectionString}`
      ], {
        cwd: path.dirname(apiPath),
        env: { ...process.env, ASPNETCORE_ENVIRONMENT: 'Desktop' } // Ensure this env var doesn't break things
      });
      
      appendLog(`Process spawned with PID: ${apiProcess.pid}`);

      apiProcess.stdout.on('data', (data) => {
        const output = data.toString();
        // appendLog(`STDOUT: ${output}`); // Comment out to reduce noise if needed, or keep for debug
        
        if (!win && (output.includes('Application is running on') || output.includes('Now listening on:'))) {
           appendLog('API Server reported ready.');
           clearTimeout(startupTimeout);
           createMainWindow();
           if (splash) { splash.close(); splash = null; }
        }
      });

      apiProcess.stderr.on('data', (data) => {
        appendLog(`STDERR: ${data}`);
      });

      apiProcess.on('error', (err) => {
        clearTimeout(startupTimeout);
        appendLog(`ERROR: Process spawn error: ${err}`);
        dialog.showErrorBox('API Launch Error', `Failed to start background service: ${err}`);
        if (!win) createMainWindow(); // Try to open anyway
        if (splash) splash.close();
      });

      apiProcess.on('exit', (code) => {
        appendLog(`EXIT: Process exited with code ${code}`);
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
