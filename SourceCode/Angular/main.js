const { app, BrowserWindow } = require('electron');
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
    
    // Copy database if it doesn't exist
    if (!fs.existsSync(dbPath)) {
      if (fs.existsSync(sourceDbPath)) {
        try {
          fs.copyFileSync(sourceDbPath, dbPath);
          console.log(`Database copied to: ${dbPath}`);
        } catch (err) {
          console.error(`Failed to copy database: ${err}`);
        }
      } else {
        console.error(`Source database not found at: ${sourceDbPath}`);
      }
    }

    // Construct the connection string for the user data database
    const connectionString = `Data Source=${dbPath}`;

    // Spawn the API process with the overridden connection string
    apiProcess = spawn(apiPath, [
      `--ConnectionStrings:SqliteConnectionString=${connectionString}`
    ], {
      cwd: path.dirname(apiPath)
    });

    apiProcess.stdout.on('data', (data) => {
      console.log(`API: ${data}`);
    });

    apiProcess.stderr.on('data', (data) => {
      console.error(`API Error: ${data}`);
    });
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
      indexPath = path.join(__dirname, 'dist/index.html');
    } else {
      indexPath = path.join(__dirname, '../SQLAPI/POS.API/ClientApp/browser/index.html');
    }

    win.loadURL(
      url.format({
        pathname: indexPath,
        protocol: 'file:',
        slashes: true
      })
    );
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
