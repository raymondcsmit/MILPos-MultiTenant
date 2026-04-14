# Check if running as Administrator
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Warning "This script must be run as Administrator!"
    exit
}

# --- Configuration ---
$DownloadsDir = "$env:USERPROFILE\Downloads"
$LogDir = "C:\ServerSetupLogs"
$PostgresPassword = "ChangeMe123!" # CHANGE THIS PASSWORD
$PostgresVersion = "18.2-1" # Based on the search result for Feb 2026
$DotNetVersion = "10.0"

# Create directories
New-Item -ItemType Directory -Force -Path $DownloadsDir | Out-Null
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

Write-Host "Starting Server Setup..." -ForegroundColor Cyan

# --- Step 1: Install IIS ---
Write-Host "[1/3] Installing IIS and Management Tools..." -ForegroundColor Yellow
Write-Host "   Switching to DISM to avoid 'Collecting data' hangs..." -ForegroundColor Gray

# Attempt to stop Windows Update service to prevent conflicts
Stop-Service wuauserv -ErrorAction SilentlyContinue

try {
    # Install IIS WebServer with all dependencies
    Write-Host "   > Installing IIS WebServer Role..."
    $p1 = Start-Process -FilePath "dism.exe" -ArgumentList "/Online /Enable-Feature /FeatureName:IIS-WebServer /All /NoRestart" -Wait -PassThru
    if ($p1.ExitCode -ne 0 -and $p1.ExitCode -ne 3010) { throw "DISM failed (IIS-WebServer): $($p1.ExitCode)" }

    # Install Management Console
    Write-Host "   > Installing IIS Management Console..."
    $p2 = Start-Process -FilePath "dism.exe" -ArgumentList "/Online /Enable-Feature /FeatureName:IIS-ManagementConsole /All /NoRestart" -Wait -PassThru
    if ($p2.ExitCode -ne 0 -and $p2.ExitCode -ne 3010) { throw "DISM failed (IIS-ManagementConsole): $($p2.ExitCode)" }

    Write-Host "IIS Installed successfully." -ForegroundColor Green
}
catch {
    Write-Error "Failed to install IIS: $_"
    Write-Host "SUGGESTION: Restart the server and run this script again." -ForegroundColor Red
    exit
}
Start-Service wuauserv -ErrorAction SilentlyContinue

# --- Step 2: Install ASP.NET Core 10.0 Hosting Bundle ---
Write-Host "[2/3] Installing ASP.NET Core $DotNetVersion Hosting Bundle..." -ForegroundColor Yellow

# URL for the latest .NET 10.0 Hosting Bundle
# Using the aka.ms link which redirects to the latest patch version for 10.0
$DotNetUrl = "https://aka.ms/dotnet/$DotNetVersion/dotnet-hosting-win.exe"
$DotNetInstallerPath = "$DownloadsDir\dotnet-hosting-win.exe"

Write-Host "Downloading from $DotNetUrl..."
try {
    Invoke-WebRequest -Uri $DotNetUrl -OutFile $DotNetInstallerPath
    
    Write-Host "Installing .NET Hosting Bundle..."
    $process = Start-Process -FilePath $DotNetInstallerPath -ArgumentList "/install", "/quiet", "/norestart", "/log `"$LogDir\dotnet-install.log`"" -PassThru -Wait
    
    if ($process.ExitCode -eq 0 -or $process.ExitCode -eq 3010) { # 3010 is pending restart
        Write-Host ".NET Hosting Bundle installed." -ForegroundColor Green
    } else {
        Write-Error ".NET installation failed with exit code $($process.ExitCode). Check logs at $LogDir\dotnet-install.log"
    }
}
catch {
    Write-Error "Failed to download or install .NET Hosting Bundle: $_"
}

# --- Step 3: Install PostgreSQL ---
Write-Host "[3/3] Installing PostgreSQL $PostgresVersion..." -ForegroundColor Yellow

# URL for PostgreSQL 18.2 (EnterpriseDB)
$PgUrl = "https://get.enterprisedb.com/postgresql/postgresql-$PostgresVersion-windows-x64.exe"
$PgInstallerPath = "$DownloadsDir\postgresql-installer.exe"
$PgInstallDir = "C:\Program Files\PostgreSQL\18"
$PgDataDir = "C:\Program Files\PostgreSQL\18\data"

Write-Host "Downloading from $PgUrl..."
try {
    Invoke-WebRequest -Uri $PgUrl -OutFile $PgInstallerPath
    
    Write-Host "Installing PostgreSQL (Unattended)..."
    # Arguments for unattended installation
    $PgArgs = @(
        "--mode", "unattended",
        "--unattendedmodeui", "minimal",
        "--superpassword", $PostgresPassword,
        "--servicepassword", $PostgresPassword,
        "--prefix", "`"$PgInstallDir`"",
        "--datadir", "`"$PgDataDir`"",
        "--serverport", "5432"
    )
    
    $process = Start-Process -FilePath $PgInstallerPath -ArgumentList $PgArgs -PassThru -Wait
    
    if ($process.ExitCode -eq 0) {
        Write-Host "PostgreSQL installed successfully." -ForegroundColor Green
        
        # --- Configure Remote Access ---
        Write-Host "Configuring PostgreSQL for Remote Access..." -ForegroundColor Yellow
        $PgConfFile = "$PgDataDir\postgresql.conf"
        $PgHbaFile = "$PgDataDir\pg_hba.conf"
        
        if (Test-Path $PgConfFile) {
            # 1. Update listen_addresses in postgresql.conf
            $confContent = Get-Content $PgConfFile
            if ($confContent -notmatch "^listen_addresses = '\*'") {
                # Replace existing commented out or default listen_addresses, or append if not found
                if ($confContent -match "#listen_addresses = 'localhost'") {
                    $confContent = $confContent -replace "#listen_addresses = 'localhost'", "listen_addresses = '*'"
                } elseif ($confContent -match "listen_addresses = 'localhost'") {
                    $confContent = $confContent -replace "listen_addresses = 'localhost'", "listen_addresses = '*'"
                } else {
                    $confContent += "`nlisten_addresses = '*'"
                }
                $confContent | Set-Content $PgConfFile
                Write-Host "Updated postgresql.conf to listen on all addresses." -ForegroundColor Green
            }

            # 2. Allow incoming connections in pg_hba.conf
            # Check if rule already exists to avoid duplicates
            $hbaContent = Get-Content $PgHbaFile
            $remoteRule = "host    all             all             0.0.0.0/0               scram-sha-256"
            if ($hbaContent -notmatch "0.0.0.0/0") {
                Add-Content -Path $PgHbaFile -Value "`n# Allow remote access`n$remoteRule"
                Write-Host "Updated pg_hba.conf to allow remote connections." -ForegroundColor Green
            }

            # 3. Open Firewall Port
            $fwRuleName = "PostgreSQL-5432"
            $fwRule = Get-NetFirewallRule -DisplayName $fwRuleName -ErrorAction SilentlyContinue
            if (-not $fwRule) {
                New-NetFirewallRule -DisplayName $fwRuleName -Direction Inbound -LocalPort 5432 -Protocol TCP -Action Allow | Out-Null
                Write-Host "Opened Firewall Port 5432." -ForegroundColor Green
            }

            # 4. Restart PostgreSQL Service to apply changes
            # Service name is usually postgresql-x64-18 or similar. Let's find it.
            $pgService = Get-Service -Name "postgresql*" | Where-Object { $_.DisplayName -like "*PostgreSQL*" } | Select-Object -First 1
            if ($pgService) {
                Restart-Service -Name $pgService.Name -Force
                Write-Host "PostgreSQL Service restarted." -ForegroundColor Green
            } else {
                Write-Warning "Could not identify PostgreSQL service to restart. Please restart it manually."
            }
        } else {
            Write-Error "Could not find postgresql.conf at $PgConfFile"
        }

    } else {
        Write-Error "PostgreSQL installation failed with exit code $($process.ExitCode)."
    }
}
catch {
    Write-Error "Failed to download or install PostgreSQL: $_"
}

# --- Final Cleanup & Restart Check ---
Write-Host "------------------------------------------------"
Write-Host "Setup Complete!" -ForegroundColor Cyan
Write-Host "IMPORTANT: PostgreSQL 'postgres' user password is set to: $PostgresPassword" -ForegroundColor Red
Write-Host "Please change this password immediately after logging in."
Write-Host "A system restart is recommended to finalize IIS and .NET changes."
