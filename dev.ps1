param(
  [switch]$Fresh,
  [switch]$SkipInstall,
  [switch]$SkipPrisma,
  [switch]$Migrate,
  [switch]$Seed,
  [switch]$ClearExpo,
  [int]$ApiTimeoutSeconds = 60
)

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
$ApiUrl = 'http://localhost:3000/api'
$StartedProcesses = @()
$EventSubscriptions = @()

function Write-Header {
  Write-Host ''
  Write-Host '=======================================================' -ForegroundColor Cyan
  Write-Host ' PrintSlot Dev Runner' -ForegroundColor Cyan
  Write-Host '=======================================================' -ForegroundColor Cyan
  Write-Host ' Starts API first, waits for it, then starts Expo mobile.'
  Write-Host ' Press Ctrl+C once to stop both processes.'
  Write-Host ''
}

function Write-Step([string]$Message) {
  Write-Host ''
  Write-Host "==> $Message" -ForegroundColor Yellow
}

function Stop-StartedProcesses {
  foreach ($subscription in $EventSubscriptions) {
    try { Unregister-Event -SubscriptionId $subscription.Id -ErrorAction SilentlyContinue } catch {}
  }

  foreach ($process in $StartedProcesses) {
    if ($process -and -not $process.HasExited) {
      Write-Host "Stopping pid $($process.Id)..." -ForegroundColor DarkYellow
      try {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
      } catch {}
    }
  }
}

function Invoke-CheckedCommand([string]$Name, [string]$FilePath, [string[]]$Arguments, [string]$WorkingDirectory) {
  Write-Host "[$Name] $FilePath $($Arguments -join ' ')" -ForegroundColor DarkGray
  $process = Start-Process `
    -FilePath $FilePath `
    -ArgumentList $Arguments `
    -WorkingDirectory $WorkingDirectory `
    -NoNewWindow `
    -Wait `
    -PassThru

  if ($process.ExitCode -ne 0) {
    throw "$Name failed with exit code $($process.ExitCode)"
  }
}

function Start-ManagedProcess([string]$Name, [string]$FilePath, [string[]]$Arguments, [string]$WorkingDirectory, [ConsoleColor]$Color) {
  $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $FilePath
  $startInfo.Arguments = ($Arguments -join ' ')
  $startInfo.WorkingDirectory = $WorkingDirectory
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true

  $process = [System.Diagnostics.Process]::new()
  $process.StartInfo = $startInfo
  $process.EnableRaisingEvents = $true

  $messageData = @{ Name = $Name; Color = $Color }
  $script:EventSubscriptions += Register-ObjectEvent -InputObject $process -EventName OutputDataReceived -MessageData $messageData -Action {
    if ($EventArgs.Data) {
      Write-Host ("[{0}] {1}" -f $Event.MessageData.Name, $EventArgs.Data) -ForegroundColor $Event.MessageData.Color
    }
  }
  $script:EventSubscriptions += Register-ObjectEvent -InputObject $process -EventName ErrorDataReceived -MessageData $messageData -Action {
    if ($EventArgs.Data) {
      Write-Host ("[{0}] {1}" -f $Event.MessageData.Name, $EventArgs.Data) -ForegroundColor $Event.MessageData.Color
    }
  }

  [void]$process.Start()
  $process.BeginOutputReadLine()
  $process.BeginErrorReadLine()
  $script:StartedProcesses += $process

  Write-Host "Started $Name (pid $($process.Id))" -ForegroundColor Green
  return $process
}

function Wait-ForApi([System.Diagnostics.Process]$ApiProcess) {
  $deadline = (Get-Date).AddSeconds($ApiTimeoutSeconds)
  Write-Host "Waiting for API at $ApiUrl ..." -ForegroundColor DarkGray

  while ((Get-Date) -lt $deadline) {
    if ($ApiProcess.HasExited) {
      throw "API process exited before becoming ready. Check the [API] output above."
    }

    try {
      $response = Invoke-WebRequest -Uri $ApiUrl -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        Write-Host "API is ready: $ApiUrl" -ForegroundColor Green
        return
      }
    } catch {
      Start-Sleep -Seconds 1
    }
  }

  throw "API did not become ready within $ApiTimeoutSeconds seconds."
}

function Assert-EnvFiles {
  $apiEnv = Join-Path $Root 'apps/api/.env'
  $mobileEnv = Join-Path $Root 'apps/mobile/.env'

  if (-not (Test-Path $apiEnv)) {
    throw @"
Missing apps/api/.env

Create it from .env.example and fill the API section:
  SUPABASE_URL
  SUPABASE_ANON_KEY
  SUPABASE_SERVICE_KEY
  JWT_SECRET
  DATABASE_URL
  CLOUDINARY_*
  ADMIN_EMAIL / ADMIN_PASSWORD
"@
  }

  if (-not (Test-Path $mobileEnv)) {
    throw @"
Missing apps/mobile/.env

Create it from .env.example and fill the mobile section:
  EXPO_PUBLIC_SUPABASE_URL
  EXPO_PUBLIC_SUPABASE_ANON_KEY
  EXPO_PUBLIC_API_URL=http://localhost:3000/api

For a real phone, replace localhost with your computer LAN IP.
"@
  }

  $mobileEnvText = Get-Content -Path $mobileEnv -Raw
  if ($mobileEnvText -match 'EXPO_PUBLIC_API_URL\s*=\s*http://localhost:3000/api') {
    Write-Host 'Mobile .env uses localhost. Good for emulator/web; use LAN IP for a physical phone.' -ForegroundColor DarkYellow
  }
}

try {
  Write-Header

  Write-Step 'Checking environment files'
  Assert-EnvFiles
  Write-Host 'Environment files found.' -ForegroundColor Green

  Write-Step 'Checking dependencies'
  if (-not $SkipInstall -and ($Fresh -or -not (Test-Path (Join-Path $Root 'node_modules')))) {
    Invoke-CheckedCommand -Name 'install' -FilePath 'npm.cmd' -Arguments @('install') -WorkingDirectory $Root
  } else {
    Write-Host 'node_modules found; skipping npm install.' -ForegroundColor Green
  }

  if (-not $SkipPrisma) {
    Write-Step 'Generating Prisma client'
    Invoke-CheckedCommand -Name 'prisma:generate' -FilePath 'npm.cmd' -Arguments @('run', 'prisma:generate', '--workspace=apps/api') -WorkingDirectory $Root
  }

  if ($Migrate) {
    Write-Step 'Applying Prisma migrations'
    Invoke-CheckedCommand -Name 'prisma:migrate' -FilePath 'npm.cmd' -Arguments @('run', 'prisma:migrate', '--workspace=apps/api') -WorkingDirectory $Root
  } else {
    Write-Host 'Skipping migrations. Use .\dev.cmd --migrate to run them before startup.' -ForegroundColor DarkGray
  }

  if ($Seed) {
    Write-Step 'Seeding database'
    Invoke-CheckedCommand -Name 'prisma:seed' -FilePath 'npm.cmd' -Arguments @('run', 'prisma:seed', '--workspace=apps/api') -WorkingDirectory $Root
  } else {
    Write-Host 'Skipping seed. Use .\dev.cmd --seed to seed before startup.' -ForegroundColor DarkGray
  }

  Write-Step 'Starting API'
  $apiProcess = Start-ManagedProcess `
    -Name 'API' `
    -FilePath 'npm.cmd' `
    -Arguments @('run', 'dev', '--workspace=apps/api') `
    -WorkingDirectory $Root `
    -Color Blue

  Wait-ForApi -ApiProcess $apiProcess

  Write-Step 'Starting mobile'
  $mobileArgs = @('run', 'dev', '--workspace=apps/mobile')
  if ($ClearExpo) {
    $mobileArgs += @('--', '--clear')
  }

  $mobileProcess = Start-ManagedProcess `
    -Name 'Mobile' `
    -FilePath 'npm.cmd' `
    -Arguments $mobileArgs `
    -WorkingDirectory $Root `
    -Color Green

  Write-Host ''
  Write-Host 'Both processes are running.' -ForegroundColor Green
  Write-Host 'Expo controls: press a for Android, w for web, or scan the QR code.' -ForegroundColor Cyan
  Write-Host 'Press Ctrl+C here to stop API and mobile.' -ForegroundColor Cyan
  Write-Host ''

  while ($true) {
    if ($apiProcess.HasExited) {
      throw "API exited with code $($apiProcess.ExitCode)."
    }
    if ($mobileProcess.HasExited) {
      throw "Mobile exited with code $($mobileProcess.ExitCode)."
    }
    Start-Sleep -Seconds 1
  }
} catch {
  Write-Host ''
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
} finally {
  Stop-StartedProcesses
}
