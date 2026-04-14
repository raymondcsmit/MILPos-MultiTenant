$user = "test4179@gmail.com"
$pass = "password@123"

# 1. Login
$loginBody = @{
    userName = $user
    password = $pass
} | ConvertTo-Json

try {
    Write-Host "Logging in as $user ..."
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/authentication/login" -Method Post -Body $loginBody -ContentType "application/json"
    Write-Host "Login Response Type: $($loginResponse.GetType().FullName)"
    Write-Host "Success: $($loginResponse.success)"
    Write-Host "Errors: $($loginResponse.errors)"
    
    # Try different casing
    $token = $loginResponse.bearerToken
    if (-not $token) { $token = $loginResponse.BearerToken }

    Write-Host "Token: $token"
    
    if (-not $token) {
        Write-Host "NO TOKEN FOUND. Dumping response:"
        $loginResponse | Format-List *
        exit
    }

    # Decode JWT (simple)
    $payload = $token.Split('.')[1]
    # Pad if necessary
    switch ($payload.Length % 4) {
        2 { $payload += "==" }
        3 { $payload += "=" }
    }
    $decodedBytes = [System.Convert]::FromBase64String($payload)
    $decodedText = [System.Text.Encoding]::UTF8.GetString($decodedBytes)
    Write-Host "Token Payload: $decodedText"

    # 2. Get Product Categories
    Write-Host "`nFetching Product Categories..."
    $categories = Invoke-RestMethod -Uri "http://localhost:5000/api/ProductCategories" -Method Get -Headers @{ Authorization = "Bearer $token" }
    
    if ($categories) {
        Write-Host "Categories Response Type: $($categories.GetType().FullName)"
        $categories | ConvertTo-Json -Depth 2
    } else {
        Write-Host "Categories response is null or empty."
    }
    
    # 3. Get Brands
    Write-Host "`nFetching Brands..."
    $brands = Invoke-RestMethod -Uri "http://localhost:5000/api/Brands" -Method Get -Headers @{ Authorization = "Bearer $token" }
    
    if ($brands) {
        $list = $brands
        if ($brands.data) { $list = $brands.data }
        
        if ($list -and $list.Count -gt 0) {
            Write-Host "Count: $($list.Count)"
            $list | Select-Object -First 5 | ForEach-Object { Write-Host "- $($_.name)" }
        } else {
             Write-Host "No brands found."
        }
    }

} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Detail: $($reader.ReadToEnd())"
    }
}
