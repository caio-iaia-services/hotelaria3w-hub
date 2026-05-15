param(
    [string]$msg = ""
)

if ($msg -eq "") {
    $msg = Read-Host "Descricao da mudanca (ou Enter para data/hora)"
    if ($msg -eq "") {
        $msg = "deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    }
}

Write-Host ""
Write-Host "Enviando deploy..." -ForegroundColor Cyan

git add -A
git commit -m $msg
git push

Write-Host ""
Write-Host "Pronto! Vercel vai publicar em ~30 segundos." -ForegroundColor Green
Write-Host "Acompanhe em: https://vercel.com/caio-iaia-services/hotelaria3w-hub" -ForegroundColor DarkGray
