# Startup Loading Screen Implementation Plan

## Overview
Currently, the Electron app opens the main window immediately and then reloads it once the backend API is ready. This can lead to a flashing white screen or connection errors being visible to the user.
We will implement a **Splash Window** pattern. A lightweight "loading" window will be shown immediately upon launch. The main application window will only be created and shown once the API is fully verified to be running.

## 1. Create Splash Screen (`splash.html`)
Create a new file `angular/splash.html`. This will be the visual loader.

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: #f0f2f5;
            font-family: 'Segoe UI', sans-serif;
            overflow: hidden;
        }
        .container {
            text-align: center;
        }
        .loader {
            border: 5px solid #f3f3f3;
            border-top: 5px solid #3498db;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px auto;
        }
        .status {
            color: #555;
            font-size: 14px;
            margin-top: 10px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Optional: Add Logo Here -->
        <!-- <img src="assets/logo.png" width="100" /> -->
        <div class="loader"></div>
        <h3>Starting POS System...</h3>
        <p class="status">Initializing database and services...</p>
    </div>
</body>
</html>
```

## 2. Modify `main.js`
We will refactor `createWindow` to manage two windows: `splash` and `win`.

### Step A: Define Splash Variable
```javascript
let splash;
// existing let win;
```

### Step B: Refactor `createWindow`
Instead of creating `win` immediately, we create `splash`.

```javascript
function createWindow() {
  // 1. Create Splash Window
  splash = new BrowserWindow({
    width: 500,
    height: 300,
    frame: false, // No title bar
    alwaysOnTop: true,
    transparent: false,
    webPreferences: {
      nodeIntegration: false
    }
  });

  // 2. Load splash.html
  // Use absolute path logic similar to how index.html is loaded
  const splashPath = app.isPackaged 
    ? path.join(__dirname, 'dist/splash.html') // Ensure splash.html is copied to dist!
    : path.join(__dirname, 'splash.html'); // Or wherever you create it
    
  splash.loadFile(splashPath);

  // 3. Start API (existing function)
  startApi();
}
```

### Step C: Update `startApi` Logic
Modification inside the API stdout listener. When API is ready, create/show main window and close splash.

```javascript
// Inside apiProcess.stdout.on('data', ...)
if (data.toString().includes('Application is running on')) {
     console.log('API Server is ready.');
     appendLog('API Server is ready.');
     
     // IMPORTANT: Check if main window already exists to avoid duplicate creations
     if (!win) {
         createMainWindow(); // Helper function to create the main app window
     }
     
     // Close splash if it exists
     if (splash) {
         splash.close();
         splash = null;
     }
}
```

### Step D: Extract `createMainWindow`
Move the existing `win = new BrowserWindow(...)` logic into a separate function.

```javascript
function createMainWindow() {
    win = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false, // Don't show immediately wait for ready-to-show
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // ... Load URL/File logic ...

    win.once('ready-to-show', () => {
        win.show(); // Show only when content is rendered
        if (splash && !splash.isDestroyed()) {
             splash.close();
        }
    });
}
```

## 3. Build Configuration (`package.json`)
We need to ensure `splash.html` is included in the build.

**If `splash.html` is in `src`:**
Update `angular.json` assets to include it, OR manually copy it in `package.json` scripts.

**Simplest way**:
Place `splash.html` in `Angular/` root (same level as `main.js`).
Update `package.json` "files" section to include `splash.html`.

```json
"build": {
    "files": [
      "main.js",
      "splash.html", 
      // ... existing files
    ]
}
```

## Summary of Flow
1.  App Launch -> **Show Splash Window**.
2.  `startApi()` called.
3.  Splash stays visible while API boots (DB migration, seeding, etc.).
4.  API logs "Application is running on".
5.  **Create & Show Main Window**.
6.  **Close Splash Window**.
