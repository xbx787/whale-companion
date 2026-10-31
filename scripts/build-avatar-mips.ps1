# 头像立绘的 2 倍图：原图 1000px 级，舞台只显示 116px，直接 8 倍缩小会把
# 线稿压断。先做一次高质量重采样到 233px，浏览器只缩 2 倍，边缘稳定得多。
param([int]$TargetWidth = 233)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$assets = Join-Path $root 'src\renderer\assets'
$sources = @(Join-Path $assets 'whale-girl-ahoge-body.png') +
  @(Get-ChildItem (Join-Path $assets 'poses') -Filter *.png | ForEach-Object FullName)

Add-Type -AssemblyName System.Drawing
foreach ($source in $sources) {
  $image = [System.Drawing.Image]::FromFile($source)
  try {
    $ratio = $TargetWidth / $image.Width
    $width = $TargetWidth
    $height = [int][Math]::Round($image.Height * $ratio)
    $bitmap = New-Object System.Drawing.Bitmap $width, $height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
      $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
      $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $graphics.DrawImage($image, 0, 0, $width, $height)
    } finally { $graphics.Dispose() }

    $target = [IO.Path]::Combine(
      [IO.Path]::GetDirectoryName($source),
      [IO.Path]::GetFileNameWithoutExtension($source) + '@2x.png')
    $bitmap.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
    Write-Output "$([IO.Path]::GetFileName($target)) ${width}x${height}"
  } finally { $image.Dispose() }
}
