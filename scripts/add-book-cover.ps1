# 표지 이미지를 서재에 넣는다.
#   powershell -NoProfile -File scripts/add-book-cover.ps1 -Image <원본 경로> -Slug <책 slug>
# 하는 일
#   1. 높이 900px 이하 JPEG 로 줄여 content/library/covers/<slug>.jpg 에 저장
#   2. 표지에서 가장 넓게 쓰인 색을 골라 책등 색(spine)으로 출력
# 출력: {"cover":"<slug>.jpg","spine":"#rrggbb","width":..,"height":..}
param(
  [Parameter(Mandatory = $true)][string]$Image,
  [Parameter(Mandatory = $true)][string]$Slug
)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

if ($Slug -notmatch '^[a-z0-9]+(-[a-z0-9]+)*$') { throw "slug 는 영문 소문자, 숫자, 하이픈만 쓴다: $Slug" }
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root "content/library/covers"
New-Item -ItemType Directory -Force $outDir | Out-Null
$outPath = Join-Path $outDir "$Slug.jpg"

$src = [System.Drawing.Image]::FromFile((Resolve-Path $Image))
try {
  $scale = [Math]::Min(1.0, 900.0 / $src.Height)
  $w = [int][Math]::Round($src.Width * $scale)
  $h = [int][Math]::Round($src.Height * $scale)
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($src, 0, 0, $w, $h)
  $g.Dispose()
} finally { $src.Dispose() }

try {
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
  $params = New-Object System.Drawing.Imaging.EncoderParameters 1
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 88L
  $bmp.Save($outPath, $codec, $params)

  # 작은 사본에서 색을 4비트씩 묶어 세고, 가장 많은 묶음의 평균색을 고른다.
  $small = New-Object System.Drawing.Bitmap $bmp, 48, 72
  $buckets = @{}
  for ($y = 0; $y -lt $small.Height; $y++) {
    for ($x = 0; $x -lt $small.Width; $x++) {
      $c = $small.GetPixel($x, $y)
      $key = (($c.R -shr 4) -shl 8) -bor (($c.G -shr 4) -shl 4) -bor ($c.B -shr 4)
      if (-not $buckets.ContainsKey($key)) { $buckets[$key] = @(0, 0, 0, 0) }
      $b = $buckets[$key]; $b[0] += $c.R; $b[1] += $c.G; $b[2] += $c.B; $b[3] += 1
    }
  }
  $small.Dispose()
  $top = $buckets.Values | Sort-Object { $_[3] } -Descending | Select-Object -First 1
  $spine = "#{0:x2}{1:x2}{2:x2}" -f [int]($top[0] / $top[3]), [int]($top[1] / $top[3]), [int]($top[2] / $top[3])
  [pscustomobject]@{ cover = "$Slug.jpg"; spine = $spine; width = $w; height = $h } | ConvertTo-Json -Compress
} finally { $bmp.Dispose() }
