# Electron Version Troubleshooting

If you are experiencing issues running the Electron version of the POS system, please review the following points.

## 1. i18n Translation Files Not Found
If you see an error like `GET file:///C:/i18n/en.json net::ERR_FILE_NOT_FOUND`, it means the application is looking for translation files at the root of your hard drive.

- **Fix**: Ensure the conversion prefix in `app.config.ts` is relative (e.g., `./i18n/` instead of `/i18n/`).

## 2. API Connection Refused
If you see `net::ERR_CONNECTION_REFUSED` for `http://localhost:5000`, the backend API is not responding.

### In Development (`npm run electron`)
When running in development mode, the Electron process **does not** automatically start the backend API.
- **Action**: Open a separate terminal, navigate to `SQLAPI/POS.API`, and run `dotnet run`.

### In Production (Installed Version)
The installed version should start the API automatically. If it fails:
- Check if another application is using port 5000.
- Check the log files (if any) in the application's data folder (usually `%APPDATA%\pos`).
- Ensure the database file `POSDb.db` exists or can be created in the data folder.

## 3. Building the Application
To correctly package the application for Windows:
1. Navigate to the `Angular` folder.
2. Run `npm run electron:package`.
   - This script will publish the API and then build/package the Electron app.
