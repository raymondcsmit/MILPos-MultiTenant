$rand = Get-Random -Minimum 1000 -Maximum 9999
$subdomain = "test$rand"
$body = @{
    name = "Test Tenant $rand"
    subdomain = $subdomain
    adminEmail = "test$rand@gmail.com"
    adminPassword = "password@123"
    phone = "1234567890"
    address = "Test Address"
    businessType = "Retail"
} | ConvertTo-Json
try {
    Write-Host "Registering tenant..."
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/tenants/register" -Method Post -Body $body -ContentType "application/json"
    $response | ConvertTo-Json -Depth 5
    
    Write-Host "`nVerifying in DB..."
    # We can check via API or simple log check if we were using diagnostics, but better to check via API if we have access.
    # Since we can run powershell, we can check the database file if it's SQLite, or just query via the API login.
    
    Write-Host "`nAttempting login for new tenant admin..."
    $loginBody = @{
        userName = "test$rand@gmail.com"
        password = "password@123"
    } | ConvertTo-Json
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/authentication/login" -Method Post -Body $loginBody -ContentType "application/json"
    $loginResponse | ConvertTo-Json -Depth 2
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Detail: $($reader.ReadToEnd())"
    }
}
