const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const url = require('url');
const { spawn } = require('child_process');
const fs = require('fs');

let win;
let apiProcess;

function startApi() {
  const isDev = process.argv.includes('--dev');
  if (isDev) return;

  if (app.isPackaged) {
    const apiPath = path.join(process.resourcesPath, 'api', 'POS.API.exe');
    console.log(`Starting API from: ${apiPath}`);

    // Determine the user data directory (writable)
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'POSDb.db');
    const sourceDbPath = path.join(process.resourcesPath, 'api', 'POSDb.db');
    
    // Setup logging first
    const logTrace = path.join(userDataPath, 'api-debug.log');
    // Ensure log file exists or is created
    try {
        if (!fs.existsSync(logTrace)) {
             fs.writeFileSync(logTrace, `[${new Date().toISOString()}] LOG START\n`);
        }
    } catch(e) { console.error("Failed to init log", e); }

    const appendLog = (msg) => {
        try {
            fs.appendFileSync(logTrace, `[${new Date().toISOString()}] ${msg}\n`);
        } catch(e) { console.error("Log failed", e); }
    };

    appendLog(`STARTUP: API Path: ${apiPath}`);
    appendLog(`STARTUP: Resources Path: ${process.resourcesPath}`);

    // Check directory content
    try {
        const apiDir = path.dirname(apiPath);
        if (fs.existsSync(apiDir)) {
             const files = fs.readdirSync(apiDir);
             appendLog(`DEBUG: API Directory Content: ${files.join(', ')}`);
        } else {
             appendLog(`ERROR: API Directory NOT FOUND at ${apiDir}`);
        }
    } catch (e) {
        appendLog(`ERROR: Failed to list API directory: ${e}`);
    }

    // Check executable
    if (!fs.existsSync(apiPath)) {
        const msg = `API Executable not found at: ${apiPath}`;
        console.error(msg);
        appendLog(`ERROR: ${msg}`);
        dialog.showErrorBox('Startup Error', msg);
        return;
    }

    // Copy database if it doesn't exist
    if (!fs.existsSync(dbPath)) {
      if (fs.existsSync(sourceDbPath)) {
        try {
          fs.copyFileSync(sourceDbPath, dbPath);
          console.log(`Database copied to: ${dbPath}`);
          appendLog(`Database copied to: ${dbPath}`);
        } catch (err) {
          console.error(`Failed to copy database: ${err}`);
          appendLog(`ERROR: Failed to copy database: ${err}`);
        }
      } else {
        console.error(`Source database not found at: ${sourceDbPath}`);
        appendLog(`ERROR: Source database not found at: ${sourceDbPath}`);
      }
    }

    // Construct the connection string for the user data database
    const connectionString = `Data Source=${dbPath}`;

    // Spawn the API process with the overridden connection string
    try {
      apiProcess = spawn(apiPath, [
        `--ConnectionStrings:SqliteConnectionString=${connectionString}`
      ], {
        cwd: path.dirname(apiPath),
        env: { ...process.env, ASPNETCORE_ENVIRONMENT: 'Desktop' }
      });
      
      appendLog(`Process spawned with PID: ${apiProcess.pid}`);

      apiProcess.stdout.on('data', (data) => {
        console.log(`API Output: ${data}`);
        appendLog(`STDOUT: ${data}`);
        if (data.toString().includes('Application is running on')) {
           if (win) {
             console.log('API Server is ready. Reloading window...');
             appendLog('API Server is ready. Reloading window...');
             win.reload();
           }
        }
      });

      apiProcess.stderr.on('data', (data) => {
        console.error(`API Error Output: ${data}`);
        appendLog(`STDERR: ${data}`);
      });

      apiProcess.on('error', (err) => {
        console.error(`Failed to start API process: ${err}`);
        appendLog(`ERROR: Failed to launch process: ${err}`);
        dialog.showErrorBox('API Launch Error', `Failed to launch API: ${err}`);
      });

      apiProcess.on('exit', (code) => {
        console.log(`API process exited with code ${code}`);
        appendLog(`EXIT: Process exited with code ${code}`);
      });

    } catch (e) {
       appendLog(`CRITICAL: Spawn failed: ${e}`);
       dialog.showErrorBox('Spawn Error', `Critical error spawning API: ${e}`);
    }
  }
}

function createWindow() {
  startApi();

  win = new BrowserWindow({
    width: 1200,
    height: 800,
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
      // Use absolute path for packaged app
      indexPath = path.join(process.resourcesPath, 'app.asar/dist/index.html');
      console.log('Loading packaged index from:', indexPath);
    } else {
      indexPath = path.join(__dirname, '../SQLAPI/POS.API/ClientApp/browser/index.html');
      console.log('Loading dev index from:', indexPath);
    }

    win.loadFile(indexPath).catch(e => {
        console.error('Failed to load file:', e);
        // Fallback for different path structures
        if (app.isPackaged) {
             const fallbackPath = path.join(__dirname, 'dist/index.html');
             console.log('Trying fallback path:', fallbackPath);
             win.loadFile(fallbackPath);
        }
    });
  }

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
