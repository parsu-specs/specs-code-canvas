# Regenerate the committed PWA PNGs on Windows: powershell -File build/generatePwaAssets.ps1
& node --experimental-strip-types (Join-Path $PSScriptRoot 'generatePwaThemes.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Could not generate PWA theme colors' }
Add-Type -AssemblyName System.Drawing
$brandColors = @{ primary='#6558bd'; surface='#6558bd'; ink='#ffffff'; accent='#e8c451'; secondary='#e8c451'; background='#f6f4ed' }
$assetDirectory = Join-Path $PSScriptRoot '../public/pwa'
New-Item -ItemType Directory -Force -Path $assetDirectory | Out-Null

# Use the same Fredoka C outline as the existing two-toned CC favicon.
[xml]$favicon = Get-Content (Join-Path $PSScriptRoot '../public/favicon.svg') -Raw
$outline = $favicon.svg.defs.path.d
$tokens = [regex]::Matches($outline, '[MQZ]|-?\d+(?:\.\d+)?') | ForEach-Object { $_.Value }
$letter = [System.Drawing.Drawing2D.GraphicsPath]::new()
$i = 0
[float]$currentX = 0
[float]$currentY = 0
while ($i -lt $tokens.Count) {
    $command = $tokens[$i++]
    switch ($command) {
        'M' {
            $currentX = [float]::Parse($tokens[$i++], [cultureinfo]::InvariantCulture)
            $currentY = [float]::Parse($tokens[$i++], [cultureinfo]::InvariantCulture)
            $letter.StartFigure()
        }
        'Q' {
            $qx = [float]::Parse($tokens[$i++], [cultureinfo]::InvariantCulture)
            $qy = [float]::Parse($tokens[$i++], [cultureinfo]::InvariantCulture)
            $nextX = [float]::Parse($tokens[$i++], [cultureinfo]::InvariantCulture)
            $nextY = [float]::Parse($tokens[$i++], [cultureinfo]::InvariantCulture)
            $letter.AddBezier($currentX, $currentY,
                ($currentX + 2 * ($qx - $currentX) / 3), ($currentY + 2 * ($qy - $currentY) / 3),
                ($nextX + 2 * ($qx - $nextX) / 3), ($nextY + 2 * ($qy - $nextY) / 3), $nextX, $nextY)
            $currentX = $nextX
            $currentY = $nextY
        }
        'Z' { $letter.CloseFigure() }
        default { throw "Unsupported favicon outline command: $command" }
    }
}

function Draw-Brand($graphics, [float]$x, [float]$y, [float]$size, [bool]$splash) {
    [float]$scale = $size / 1235
    $colors = @($(if ($splash) { $brandColors.primary } else { $brandColors.ink }), $(if ($splash) { $brandColors.secondary } else { $brandColors.accent }))
    for ($index = 0; $index -lt 2; $index++) {
        $path = $letter.Clone()
        $matrix = [System.Drawing.Drawing2D.Matrix]::new($scale, 0, 0, -$scale,
            ($x + ($index * 631 - 14) * $scale), ($y + $size / 2 + 339.5 * $scale))
        $path.Transform($matrix)
        $brush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($colors[$index]))
        $graphics.FillPath($brush, $path)
        $brush.Dispose()
        $matrix.Dispose()
        $path.Dispose()
    }
}

function Save-Image([string]$name, [int]$width, [int]$height, [bool]$splash, [bool]$rounded = $false) {
    $bitmap = [System.Drawing.Bitmap]::new($width,$height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $surface = [System.Drawing.ColorTranslator]::FromHtml($(if ($splash) { $brandColors.background } else { $brandColors.surface }))
    if ($rounded) {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        [float]$diameter = $width * 0.4375
        $roundedSurface = [System.Drawing.Drawing2D.GraphicsPath]::new()
        $roundedSurface.AddArc(0, 0, $diameter, $diameter, 180, 90)
        $roundedSurface.AddArc(($width-$diameter), 0, $diameter, $diameter, 270, 90)
        $roundedSurface.AddArc(($width-$diameter), ($height-$diameter), $diameter, $diameter, 0, 90)
        $roundedSurface.AddArc(0, ($height-$diameter), $diameter, $diameter, 90, 90)
        $roundedSurface.CloseFigure()
        $surfaceBrush = [System.Drawing.SolidBrush]::new($surface)
        $graphics.FillPath($surfaceBrush, $roundedSurface)
        $surfaceBrush.Dispose()
        $roundedSurface.Dispose()
    } else {
        $graphics.Clear($surface)
    }
    $markSize = if ($splash) { [float]($width * 0.22) } else { [float]($width * 0.64) }
    Draw-Brand $graphics (($width-$markSize)/2) (($height-$markSize)/2) $markSize $splash
    $bitmap.Save((Join-Path $assetDirectory $name), [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
}
function Save-BrandAssets {
Save-Image 'icon-180.png' 180 180 $false
foreach ($size in @(192,512)) { Save-Image "icon-$size.png" $size $size $false $true }
Save-Image 'icon-maskable-512.png' 512 512 $false
foreach ($dimensions in @(@(750,1334),@(1125,2436),@(1170,2532),@(1179,2556),@(1206,2622),@(1242,2688),@(1284,2778),@(1290,2796),@(1320,2868),@(1536,2048),@(1620,2160),@(1640,2360),@(1668,2388),@(1668,2420),@(2048,2732),@(2064,2752))) {
    $w, $h = $dimensions
    Save-Image "splash-$w-$h.png" $w $h $true
    Save-Image "splash-$h-$w.png" $h $w $true
}

}
Save-BrandAssets
$baseAssetDirectory = $assetDirectory
$themeTable = Get-Content (Join-Path $PSScriptRoot '../src/data/pwaThemes.json') -Raw | ConvertFrom-Json
foreach ($themeEntry in $themeTable.PSObject.Properties) {
    $brandColors = $themeEntry.Value
    $assetDirectory = Join-Path $baseAssetDirectory ('themes/' + $themeEntry.Name)
    New-Item -ItemType Directory -Force -Path $assetDirectory | Out-Null
    Save-BrandAssets
}

$letter.Dispose()
