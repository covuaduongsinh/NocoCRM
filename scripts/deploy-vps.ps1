param(
  [string]$VpsIp = "217.15.160.118",
  [string]$SshUser = "root",
  [string]$SshKey = "C:\Users\duongsinh\.ssh\id_ed25519",
  [string]$ContainerName = "compose-quantify-haptic-feed-dgisax-app-1"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  NocoCRM: Fast Build & Deploy to VPS" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Build standalone bundle
Write-Host "[1/5] Building standalone Linux-x64 bundle..." -ForegroundColor Yellow
pnpm build

$tarPath = "storage/exports/dist.tar.gz"
if (!(Test-Path $tarPath)) {
  Write-Error "Build output not found at $tarPath"
  exit 1
}

# 2. Get next release version from VPS
Write-Host "[2/5] Determining next release version on VPS..." -ForegroundColor Yellow
$currentRelease = ssh -i $SshKey -o StrictHostKeyChecking=no "$SshUser@$VpsIp" "ls -1 /srv/nococrm-dsc/releases 2>/dev/null | grep -E '^v[0-9]+$' | sort -V | tail -n 1"
$nextNum = 2
if ($currentRelease -match '^v(\d+)$') {
  $nextNum = [int]$matches[1] + 1
}
$releaseName = "v$nextNum"
Write-Host "Target Release: $releaseName" -ForegroundColor Green

# 3. Upload bundle to VPS
Write-Host "[3/5] Uploading bundle ($releaseName)..." -ForegroundColor Yellow
ssh -i $SshKey -o StrictHostKeyChecking=no "$SshUser@$VpsIp" "mkdir -p /srv/nococrm-dsc/releases/$releaseName"
scp -i $SshKey -o StrictHostKeyChecking=no $tarPath "${SshUser}@${VpsIp}:/srv/nococrm-dsc/releases/$releaseName/dist.tar.gz"

# 4. Extract bundle and update symlink
Write-Host "[4/5] Extracting on VPS and updating current symlink..." -ForegroundColor Yellow
ssh -i $SshKey -o StrictHostKeyChecking=no "$SshUser@$VpsIp" "cd /srv/nococrm-dsc/releases/$releaseName && tar -xzf dist.tar.gz && if [ -d dist/dist ]; then mv dist/dist dist_temp && rm -rf dist && mv dist_temp dist; fi && rm -f dist.tar.gz && ln -sfn /srv/nococrm-dsc/releases/$releaseName /srv/nococrm-dsc/releases/current"

# 5. Restart container
Write-Host "[5/5] Restarting container..." -ForegroundColor Yellow
ssh -i $SshKey -o StrictHostKeyChecking=no "$SshUser@$VpsIp" "docker restart $ContainerName"

# 6. Verify health
Start-Sleep -Seconds 3
Write-Host "Verifying service status..." -ForegroundColor Yellow
$health = ssh -i $SshKey -o StrictHostKeyChecking=no "$SshUser@$VpsIp" "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:13000/api/auth/*"
if ($health -eq "200") {
  Write-Host "Deployment Successful! Service is Healthy (HTTP 200)." -ForegroundColor Green
  Write-Host "Access at: https://nococrm.dsc.edu.vn" -ForegroundColor Cyan
} else {
  Write-Host "Warning: Service responded with HTTP $health. Checking container logs..." -ForegroundColor Yellow
  ssh -i $SshKey -o StrictHostKeyChecking=no "$SshUser@$VpsIp" "docker logs --tail 20 $ContainerName"
}
