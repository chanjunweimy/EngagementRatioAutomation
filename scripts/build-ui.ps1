Set-Location -Path "$PSScriptRoot\..\CommitmentReport.Ui"
yarn
ng build --prod
Copy-Item "wwwroot" "../CommitmentReport.Host/CommitmentReport" -Recurse -Force