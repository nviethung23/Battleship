# Script to compare local files with AWS EC2
# Usage: .\compare-with-aws.ps1

$AWS_HOST = "ubuntu@54.206.81.220"
$AWS_KEY = "C:\Users\ADMIN\Downloads\battleship-key.pem"
$AWS_PATH = "~/battleship"
$LOCAL_PATH = "D:\battleship"

Write-Host "=== COMPARING LOCAL vs AWS EC2 FILES ===" -ForegroundColor Cyan
Write-Host ""

# Important files to check
$filesToCheck = @(
    "server/controllers/adminController.js",
    "server/controllers/authController.js",
    "server/server.js",
    "package.json",
    ".env"
)

foreach ($file in $filesToCheck) {
    Write-Host "Checking: $file" -ForegroundColor Yellow
    
    # Get file from AWS
    $awsContent = ssh -i $AWS_KEY $AWS_HOST "cat $AWS_PATH/$file" 2>$null
    
    # Get local file
    $localFile = Join-Path $LOCAL_PATH $file
    
    if (Test-Path $localFile) {
        $localContent = Get-Content $localFile -Raw
        
        # Compare
        if ($awsContent -eq $localContent) {
            Write-Host "  ✅ IDENTICAL" -ForegroundColor Green
        } else {
            Write-Host "  ❌ DIFFERENT" -ForegroundColor Red
            
            # Show file sizes
            $awsSize = $awsContent.Length
            $localSize = $localContent.Length
            Write-Host "    AWS size: $awsSize bytes" -ForegroundColor Gray
            Write-Host "    Local size: $localSize bytes" -ForegroundColor Gray
            
            # Check last modified date
            $localModified = (Get-Item $localFile).LastWriteTime
            Write-Host "    Local modified: $localModified" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ⚠️  LOCAL FILE NOT FOUND" -ForegroundColor Magenta
    }
    
    Write-Host ""
}

Write-Host "=== CHECKING FOR NEW LOCAL FILES NOT ON AWS ===" -ForegroundColor Cyan
Write-Host ""

# Get list of files on AWS
$awsFiles = ssh -i $AWS_KEY $AWS_HOST "cd $AWS_PATH && find . -type f \( -name '*.js' -o -name '*.json' -o -name '*.md' \) | grep -v node_modules | sort"

# Get list of local files
$localFiles = Get-ChildItem -Path $LOCAL_PATH -Recurse -File -Include *.js,*.json,*.md | 
    Where-Object { $_.FullName -notmatch "node_modules" } |
    ForEach-Object { $_.FullName.Replace($LOCAL_PATH, ".").Replace("\", "/") } |
    Sort-Object

# Compare lists
$awsFileArray = $awsFiles -split "`n" | Where-Object { $_ }
$newLocalFiles = $localFiles | Where-Object { $_ -notin $awsFileArray }

if ($newLocalFiles) {
    Write-Host "NEW files in local (not on AWS):" -ForegroundColor Yellow
    foreach ($file in $newLocalFiles) {
        Write-Host "  📄 $file" -ForegroundColor Cyan
    }
} else {
    Write-Host "✅ No new files in local" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== SUMMARY ===" -ForegroundColor Cyan
Write-Host "Run these commands to sync:" -ForegroundColor Yellow
Write-Host "  scp -i `"$AWS_KEY`" D:\battleship\[FILE] $AWS_HOST``:$AWS_PATH/[FILE]" -ForegroundColor Gray
Write-Host ""
Write-Host "Or upload entire project:" -ForegroundColor Yellow
Write-Host "  scp -i `"$AWS_KEY`" -r D:\battleship\* $AWS_HOST``:$AWS_PATH/" -ForegroundColor Gray
