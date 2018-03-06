Write-Host "Welcome! Make sure the template is not in use!"

$solutionName = ""
$originalSolutionName = ""
$projectName = ""
$originalProjectName = ""

while ($solutionName -eq "") {
	$solutionName = Read-Host -Prompt 'Input your solution name'
}

$originalSolutionName = "EngagementRatioAutomation"
Write-Host "You are going to change the solution name from '$originalSolutionName' to '$solutionName'"

while ($projectName -eq "") {
	$projectName = Read-Host -Prompt 'Input your project name'
}

$originalProjectName = "EngagementRatioAutomation"
Write-Host "You are going to change the project name from '$originalProjectName' to '$projectName'"
Write-Host "Changing..."

Get-ChildItem -Path "." -recurse -File -Exclude "*.ps1" | 
Foreach-Object {
	$nameTokens = $_.FullName.Split("\")
	
	if ($_.FullName.EndsWith(".sln")) {
		$nameTokens[-1] = $nameTokens[-1] -replace $originalSolutionName, $solutionName
	} else {
		$nameTokens[-1] = $nameTokens[-1] -replace $originalProjectName, $projectName
	}
	
	$fileName = $nameTokens -join "\"	
	
	if ($_.Name.EndsWith(".md") -Or $_.Name.EndsWith(".gitignore")) {
		$fileName = $_.FullName
	}
	
	(Get-Content $_.FullName).replace($originalProjectName, $projectName) | Set-Content $fileName
	
	if ($fileName -ne $_.FullName) {
		Remove-Item $_.FullName
	}
}

Get-ChildItem -Path "." -recurse -Directory | 
Foreach-Object {
	$fileName = $_.Name -replace $originalProjectName, $projectName
	if ($fileName -ne $_.Name) {
		Rename-Item -path $_.FullName -newName $fileName
	}
}

Write-Host "Done!"
Write-Host "Please rename the parent folder manually!"