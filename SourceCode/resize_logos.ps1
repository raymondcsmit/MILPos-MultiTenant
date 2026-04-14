
Add-Type -AssemblyName System.Drawing

$sourcePath = "f:\MIllyass\pos-with-inventory-management\SourceCode\Mockups\MIL Logo.png"
$outputDir = "f:\MIllyass\pos-with-inventory-management\SourceCode\Angular\public\images"

Write-Host "Loading image from $sourcePath"
$image = [System.Drawing.Bitmap]::FromFile($sourcePath)

# Make transparent (assuming white background)
$image.MakeTransparent([System.Drawing.Color]::White)

$dimensions = @(
    @{ Width = 382; Height = 104 },
    @{ Width = 646; Height = 147 },
    @{ Width = 620; Height = 196 },
    @{ Width = 232; Height = 57 }
)

foreach ($dim in $dimensions) {
    $w = $dim.Width
    $h = $dim.Height
    $filename = "logo-${w}x${h}.png"
    $outputPath = Join-Path $outputDir $filename

    Write-Host "Resizing to ${w}x${h}..."

    $newBitmap = New-Object System.Drawing.Bitmap($w, $h)
    $graphics = [System.Drawing.Graphics]::FromImage($newBitmap)
    
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    # Draw image scaled
    $graphics.DrawImage($image, 0, 0, $w, $h)
    
    $newBitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graphics.Dispose()
    $newBitmap.Dispose()
    
    Write-Host "Saved to $outputPath"
}

# Also save the transparent original as logo-transparent.png and limit check
$transparentPath = Join-Path $outputDir "logo-transparent.png"
$image.Save($transparentPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved transparent original to $transparentPath"

# Overwrite the main logo.png with the transparent original?
# User said "Set this logo make its background transparent". 
# The main logo should probably be updated.
# I'll update logo.png with the transparent version (original size).
$mainLogoPath = Join-Path $outputDir "logo.png"
$image.Save($mainLogoPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Updated main logo.png"

$image.Dispose()
