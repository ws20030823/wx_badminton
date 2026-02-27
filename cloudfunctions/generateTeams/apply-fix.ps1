$path = Join-Path $PSScriptRoot 'index.js'
$content = Get-Content -Path $path -Raw -Encoding Default
# Disable even check so the error is never returned
$content = $content.Replace("type === 'doubles' && firstSize % 2 !== 0", "false")
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Host Done
