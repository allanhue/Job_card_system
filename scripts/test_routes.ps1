$ErrorActionPreference = "Stop"

$baseInput = Read-Host "Base URL (default http://localhost:8000)"
$base = if ($baseInput) { $baseInput } else { "http://localhost:8000" }
$email = Read-Host "Login email"
$password = Read-Host "Login password"
$invoiceIdInput = Read-Host "Invoice ID for job card (default 1)"
$invoiceId = if ($invoiceIdInput) { [int]$invoiceIdInput } else { 1 }
$testEmail = Read-Host "Test email recipient"
$runZohoSyncInput = Read-Host "Run Zoho Books sync? (y/n, default n)"
$runZohoSync = ($runZohoSyncInput -eq "y" -or $runZohoSyncInput -eq "Y")

Write-Host "1) Health"
Invoke-RestMethod -Method Get -Uri "$base/health" | Format-List

Write-Host "2) Login"
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" `
  -ContentType "application/json" `
  -Body "{`"email`":`"$email`",`"password`":`"$password`"}"

$token = $login.access_token
if (-not $token) { throw "Login failed: no access_token returned" }
$headers = @{ Authorization = "Bearer $token" }
Write-Host "Token acquired"

Write-Host "3) Current user"
Invoke-RestMethod -Method Get -Uri "$base/auth/me" -Headers $headers | Format-List

Write-Host "4) Invoices list"
Invoke-RestMethod -Method Get -Uri "$base/invoices" -Headers $headers | Format-Table

Write-Host "5) Invoice analytics"
Invoke-RestMethod -Method Get -Uri "$base/invoices/analytics/overview" -Headers $headers | Format-List

if ($runZohoSync) {
  Write-Host "5b) Zoho Books sync"
  Invoke-RestMethod -Method Post -Uri "$base/zoho_books/books/invoices/sync" -Headers $headers | Format-List
}

Write-Host "6) Single invoice"
Invoke-RestMethod -Method Get -Uri "$base/invoices/$invoiceId" -Headers $headers | Format-List

Write-Host "7) Create job card"
Invoke-RestMethod -Method Post -Uri "$base/job-cards/invoice/$invoiceId" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body "{`"email`":`"$testEmail`",`"status`":`"pending`",`"notes`":`"test job card`",`"selected_items`":[]}" | Format-List

Write-Host "8) Recent job cards"
Invoke-RestMethod -Method Get -Uri "$base/job-cards/recent?limit=6" -Headers $headers | Format-Table

Write-Host "9) Send test email"
Invoke-RestMethod -Method Post -Uri "$base/mail/send-confirmation" `
  -ContentType "application/json" `
  -Body "{`"email`":`"$testEmail`",`"subject`":`"Test`",`"body`":`"Hello from Brevo`"}" | Format-List

Write-Host "All tests completed."
