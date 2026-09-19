$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://127.0.0.1:8000/")
$listener.Start()
Write-Host "Server running at http://127.0.0.1:8000/"

while ($true) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $path = $request.Url.LocalPath
    if ($path -eq "/") { $path = "/index.html" }

    $filePath = "C:\Users\daryl\OneDrive\Desktop\CC_Workspace\ToDo$path"

    if (Test-Path $filePath) {
        $content = [System.IO.File]::ReadAllBytes($filePath)
        $ext = [System.IO.Path]::GetExtension($filePath)

        $contentType = "text/html"
        if ($ext -eq ".js") { $contentType = "application/javascript" }
        elseif ($ext -eq ".css") { $contentType = "text/css" }
        elseif ($ext -eq ".json") { $contentType = "application/json" }

        $response.ContentType = $contentType
        $response.OutputStream.Write($content, 0, $content.Length)
    } else {
        $response.StatusCode = 404
        $response.OutputStream.Write([System.Text.Encoding]::UTF8.GetBytes("Not found"), 0, 9)
    }

    $response.OutputStream.Close()
}
