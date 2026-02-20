
$actionsFile = "SeedData\Actions.csv"
$roleClaimsFile = "SeedData\RoleClaims.csv"
$rootPath = "f:\MIllyass\pos-with-inventory-management\SourceCode"

$actionsPath = Join-Path $rootPath $actionsFile
$roleClaimsPath = Join-Path $rootPath $roleClaimsFile

Write-Host "Reading Actions from $actionsPath..."
$actions = Import-Csv -Path $actionsPath -Encoding UTF8

$codeToActionId = @{}
foreach ($row in $actions) {
    if (![string]::IsNullOrWhiteSpace($row.Code) -and ![string]::IsNullOrWhiteSpace($row.Id)) {
        $codeToActionId[$row.Code.Trim()] = $row.Id.Trim()
    }
}

Write-Host "Loaded $($codeToActionId.Count) actions."

Write-Host "Reading RoleClaims from $roleClaimsPath..."
$roleClaims = Import-Csv -Path $roleClaimsPath -Encoding UTF8

$updatedRows = @()
$fixedCount = 0

foreach ($row in $roleClaims) {
    $claimType = $row.ClaimType.Trim()
    $currentActionId = $row.ActionId.Trim()
    
    if ($codeToActionId.ContainsKey($claimType)) {
        $correctActionId = $codeToActionId[$claimType]
        if ($currentActionId -ne $correctActionId) {
            $row.ActionId = $correctActionId
            $fixedCount++
        }
    }
    $updatedRows += $row
}

Write-Host "Fixed $fixedCount rows in RoleClaims.csv"

if ($fixedCount -gt 0) {
    $updatedRows | Export-Csv -Path $roleClaimsPath -NoTypeInformation -Encoding UTF8
    Write-Host "Updated RoleClaims.csv saved."
} else {
    Write-Host "No changes needed."
}
