# 1. Define your folders
$SourceFolder = "C:\Users\tarun\Translations\nmtci\translations\.backup\2026_01_25-16_32"
$ReferenceFolder = "C:\Users\tarun\Translations\nmtci\translations"

# 2. Get the list of file names from the reference folder
# We use -File to ignore subfolders
$ReferenceFileNames = (Get-ChildItem -Path $ReferenceFolder -File).Name

# 3. Get the files from the source folder
$SourceFiles = Get-ChildItem -Path $SourceFolder -File

# 4. Filter: Select files from Source where the Name is NOT IN the Reference list
$UniqueFiles = $SourceFiles | Where-Object { $_.Name -notin $ReferenceFileNames }

# 5. Output the results
Write-Host "The following files are in Source but NOT in Reference:" -ForegroundColor Cyan
$UniqueFiles.Name
