import re

file_path = r'f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.API\Controllers\ImportExportController.cs'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r'return BadRequest\(new \{ error = "([^"]+)" \}\);',
    r'return ReturnFormattedResponse(ServiceResponse<object>.ReturnFailed(400, "\1"));',
    content
)

content = re.sub(
    r'return StatusCode\(500, new \{ error = "([^"]+)", message = ex\.Message \}\);',
    r'return ReturnFormattedResponse(ServiceResponse<object>.ReturnFailed(500, $"\1: {ex.Message}"));',
    content
)

content = re.sub(
    r'return Ok\(new\s*\{\s*success = result\.IsSuccess,\s*totalRecords = result\.TotalRecords,\s*successCount = result\.SuccessCount,\s*failureCount = result\.FailureCount,\s*errors = result\.Errors\s*\}\);',
    r'''return ReturnFormattedResponse(ServiceResponse<object>.ReturnResultWith200(new
                {
                    success = result.IsSuccess,
                    totalRecords = result.TotalRecords,
                    successCount = result.SuccessCount,
                    failureCount = result.FailureCount,
                    errors = result.Errors
                }));''',
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
