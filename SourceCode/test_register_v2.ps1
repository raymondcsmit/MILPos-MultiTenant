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

Write-Host "Registering tenant: $subdomain ..."
try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/tenants/register" -Method Post -Body $body -ContentType "application/json"
    Write-Host "Success! Tenant ID: $($response.id)"
} catch {
    Write-Host "Error during registration."
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Response Body: $errorBody"
    } else {
        Write-Host "No response body. Exception: $($_.Exception.Message)"
    }
}
