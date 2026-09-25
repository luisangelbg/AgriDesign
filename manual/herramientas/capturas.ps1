# Toma las capturas del manual a partir de herramientas/capturas.txt.
# El servidor local de la app tiene que estar en marcha (server.ps1, puerto 8800).
#
#   powershell -ExecutionPolicy Bypass -File herramientas/capturas.ps1
#   powershell -ExecutionPolicy Bypass -File herramientas/capturas.ps1 -Solo b5-anova
#   powershell -ExecutionPolicy Bypass -File herramientas/capturas.ps1 -Solo "b6-*"
#   powershell -ExecutionPolicy Bypass -File herramientas/capturas.ps1 -Idioma en -Destino ..\img-en
#
# Cada imagen se guarda primero en una carpeta temporal sin espacios (Edge no escribe
# el archivo si la ruta los tiene) y de ahi se copia a img/.

param(
  [string]$Solo = '*',
  [string]$Idioma = 'es',
  [string]$Destino = '',
  [int]$Puerto = 8800,
  [string]$Temporal = 'C:\Temp\agricap'
)

$raiz = Split-Path -Parent $PSScriptRoot
if (-not $Destino) { $Destino = Join-Path $raiz 'img' }
$recetas = Join-Path $PSScriptRoot 'capturas.txt'
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
if (-not (Test-Path $edge)) { $edge = 'C:\Program Files\Microsoft\Edge\Application\msedge.exe' }
if (-not (Test-Path $edge)) { Write-Host 'No se encontro msedge.exe' -ForegroundColor Red; exit 1 }
New-Item -ItemType Directory -Force -Path $Temporal, $Destino | Out-Null

try { Invoke-WebRequest -Uri "http://localhost:$Puerto/index.html" -UseBasicParsing -TimeoutSec 5 | Out-Null }
catch { Write-Host "El servidor no responde en el puerto $Puerto. Ejecuta server.ps1 primero." -ForegroundColor Red; exit 1 }

$lineas = Get-Content $recetas -Encoding UTF8 | Where-Object { $_ -match '\S' -and $_ -notmatch '^\s*#' }
$hechas = 0; $fallidas = @()
foreach ($l in $lineas) {
  $p = $l -split '\|', 4
  if ($p.Count -lt 4) { continue }
  $nombre = $p[0].Trim(); $w = $p[1].Trim(); $h = $p[2].Trim(); $receta = $p[3].Trim()
  if ($nombre -notlike $Solo) { continue }

  $png = Join-Path $Temporal "$nombre.png"
  if (Test-Path $png) { Remove-Item $png -Force }
  $url = "http://localhost:$Puerto/manual/herramientas/captura.html?lang=$Idioma&w=$w&h=$h&do=$receta"
  # Con un vigilante: si una receta deja la pagina a medias, Edge puede quedarse esperando.
  $argumentos = @('--headless=new','--disable-gpu','--hide-scrollbars',"--window-size=$w,$h",
            '--force-device-scale-factor=2','--virtual-time-budget=40000',
            "--screenshot=$png", $url)
  $proc = Start-Process -FilePath $edge -ArgumentList $argumentos -PassThru -WindowStyle Hidden
  if (-not $proc.WaitForExit(90000)) {
    try { $proc.Kill() } catch {}
    Write-Host ("  {0,-24} COLGADA (90 s)" -f $nombre) -ForegroundColor Yellow
  }

  if (Test-Path $png) {
    $kb = [int]((Get-Item $png).Length / 1KB)
    Copy-Item $png (Join-Path $Destino "$nombre.png") -Force
    Write-Host ("  {0,-24} {1,5} KB  {2}x{3}" -f $nombre, $kb, $w, $h)
    $hechas++
  } else {
    Write-Host ("  {0,-24} FALLO" -f $nombre) -ForegroundColor Red
    $fallidas += $nombre
  }
}
Write-Host ""
Write-Host "$hechas capturas en $Destino" -ForegroundColor Green
if ($fallidas.Count) { Write-Host ("Fallaron: " + ($fallidas -join ', ')) -ForegroundColor Red }
