# POS Application Deployment Guide

This guide explains how to deploy the POS application from your local machine to a remote Windows Server using the scripts in this kit.

## Folder Structure

- **Server**: Contains scripts to run ONCE on the remote Windows Server to prepare it.
- **Local**: Contains scripts to run on your development machine to build and deploy the app.

---

## Part 1: Server Setup (Run Once)

**Where:** Remote Windows Server (via Remote Desktop)
**User:** Administrator

1.  **Copy Files**: Copy the file `Server/1-setup-server.ps1` to the remote server (e.g., `C:\Deployment`).
2.  **Open PowerShell**: Right-click PowerShell and select **Run as Administrator**.
3.  **Run Script**:
    ```powershell
    cd C:\Deployment
    .\1-setup-server.ps1
    ```
4.  **Verify Output**:
    - Ensure it says `SUCCESS: Listener is active on Port 8888`.
    - Ensure it says `Configuration Complete!`.

**What this does:**
- Enables WinRM on Port **8888** (bypassing common firewall blocks).
- Opens Windows Firewall for Port 8888.
- Creates the IIS Website (`POS-App`) and App Pool (`POS-Pool`).

---

## Part 2: Local Deployment (Run Every Time)

**Where:** Your Local Machine
**User:** You

1.  **Configure Script** (If Server Changed):
    - Open `Local/2-deploy-app.ps1` in a text editor.
    - Update `$ServerIP` to your server's IP address.
    - Update `$Password` if changed.

2.  **Trust the Server**:
    - Open PowerShell as Administrator.
    - Run this command (replace `YOUR_SERVER_IP`):
      ```powershell
      Set-Item WSMan:\localhost\Client\TrustedHosts -Value "YOUR_SERVER_IP" -Concatenate -Force
      ```

3.  **Run Deployment**:
    - Open PowerShell in the project root.
    - Run:
      ```powershell
      .\Deployment-Kit\Local\2-deploy-app.ps1
      ```

**What this does:**
1.  Builds the Angular Front-end.
2.  Builds the .NET Back-end.
3.  Copies Angular files to the .NET wwwroot.
4.  Compresses everything into a Zip file.
5.  Connects to the server on Port **8888**.
6.  Uploads and unzips the files.
7.  Restarts the IIS Application Pool.

---

## Troubleshooting

### Connection Failed
- **Check Firewall**: Ensure your cloud provider (AWS/Azure/VPS) allows Inbound TCP traffic on Port **8888**.
- **Check TrustedHosts**: Run `Get-Item WSMan:\localhost\Client\TrustedHosts` locally to see if the server IP is listed.

### "Access Denied" or "Auth Failed"
- Ensure the password in `2-deploy-app.ps1` is correct.
- Ensure you are using the `Administrator` account.

### "Listener Conflict" / Error 183
- Rerun `1-setup-server.ps1` on the server. It now includes a "Deep Clean" step to fix this automatically.
