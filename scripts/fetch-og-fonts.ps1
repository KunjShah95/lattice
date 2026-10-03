<#
.SYNOPSIS
    Fetch the IBM Plex source TTFs the Open Graph card subsetter needs.

.DESCRIPTION
    Google Fonts no longer serves TTF to any current user agent — the CSS API
    returns woff2 for modern UAs and woff for a spoofed old one — and both
    fontTools and Satori want a real TTF. The upstream IBM/plex repository
    publishes complete TTFs per family, which is the reliable source.

    Run this, then run the subsetter:

        pwsh scripts/fetch-og-fonts.ps1
        python scripts/subset-og-fonts.py .fonttmp

    The subsetter writes into assets/og/, which is committed because those
    files are build *inputs*. Nothing in the build reads .fonttmp.

.NOTES
    Only needed when the upstream release moves or a face is added. The three
    subsets currently in assets/og/ total ~187 KB against Satori's 500 KB
    per-route ceiling, so there is room to add a face if one is ever justified.
#>
$ErrorActionPreference = "Stop"

$tmp = Join-Path (Split-Path $PSScriptRoot -Parent) ".fonttmp"
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

$base = "https://raw.githubusercontent.com/IBM/plex/master/packages"
$faces = @{
    "IBMPlexSerif-Medium.ttf"  = "$base/plex-serif/fonts/complete/ttf/IBMPlexSerif-Medium.ttf"
    "IBMPlexSans-SemiBold.ttf" = "$base/plex-sans/fonts/complete/ttf/IBMPlexSans-SemiBold.ttf"
    "IBMPlexMono-Medium.ttf"   = "$base/plex-mono/fonts/complete/ttf/IBMPlexMono-Medium.ttf"
}

foreach ($name in $faces.Keys) {
    $dest = Join-Path $tmp $name
    Invoke-WebRequest -Uri $faces[$name] -OutFile $dest -UseBasicParsing -TimeoutSec 90
    "{0,-30} {1,10:N0} b" -f $name, (Get-Item $dest).Length
}

Write-Host ""
Write-Host "now run:  python scripts/subset-og-fonts.py .fonttmp"