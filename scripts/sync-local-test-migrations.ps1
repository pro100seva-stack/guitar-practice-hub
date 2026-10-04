# Copies real timestamped root migrations (20260914+) into the local-test workdir.
$root = Split-Path $PSScriptRoot -Parent
$dest = Join-Path $root 'supabase\local-test\supabase\migrations'
Get-ChildItem (Join-Path $root 'supabase\migrations') -Filter '2*.sql' |
  Where-Object { $_.Name -ge '20260914' } |
  ForEach-Object { Copy-Item $_.FullName (Join-Path $dest $_.Name) -Force }
