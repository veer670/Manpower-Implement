# Manpower Implement - local server (no install needed)
# Run:  powershell -ExecutionPolicy Bypass -File .\serve.ps1
# Then open http://localhost:8000   |  Stop with Ctrl + C

$port = 8000
$root = $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
try { $listener.Start() } catch {
  Write-Host "Port $port is busy or blocked. Close other servers and try again." -ForegroundColor Red
  exit 1
}
Write-Host "Manpower Implement running at http://localhost:$port  (press Ctrl + C to stop)" -ForegroundColor Green
Start-Process "http://localhost:$port"

$types = @{ ".html"="text/html; charset=utf-8"; ".css"="text/css"; ".js"="application/javascript";
            ".json"="application/json"; ".png"="image/png"; ".jpg"="image/jpeg"; ".svg"="image/svg+xml"; ".ico"="image/x-icon" }
try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrEmpty($path)) { $path = "index.html" }
    $file = [System.IO.Path]::GetFullPath((Join-Path $root $path))
    $res = $ctx.Response
    $res.Headers.Add("Cache-Control", "no-store")
    if ($file.StartsWith($root) -and (Test-Path $file -PathType Leaf)) {
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $ext = [System.IO.Path]::GetExtension($file).ToLower()
      $res.ContentType = $(if ($types[$ext]) { $types[$ext] } else { "application/octet-stream" })
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $res.StatusCode = 404
    }
    $res.Close()
    Write-Host "$($ctx.Request.HttpMethod) /$path  $($res.StatusCode)"
  }
} finally { $listener.Stop() }
