param(
  [Parameter(Mandatory = $true)][string]$Path,
  [string]$Title,
  [string]$Token = $env:CYANITE_TOKEN,
  [int]$TimeoutSeconds = 180
)

# 用 Cyanite 分析一首本地 MP3：申请上传地址 → PUT 文件 → 建曲目 → 轮询分析 → 输出标签。
# Token 是 Cyanite Integrations 页面创建的 Access Token（JWT），走 GraphQL 的 Bearer 认证。
$ErrorActionPreference = 'Stop'
$api = 'https://api.cyanite.ai/graphql'
if (-not $Token) { throw '缺少 CYANITE_TOKEN 环境变量，或传 -Token。' }
if (-not (Test-Path -LiteralPath $Path)) { throw "找不到文件：$Path" }
if (-not $Title) { $Title = [IO.Path]::GetFileNameWithoutExtension($Path) }

function Invoke-Cyanite([string]$Query, [string]$Label) {
  $body = @{ query = $Query } | ConvertTo-Json -Depth 6
  try {
    return Invoke-RestMethod -Uri $api -Method Post -Headers @{ Authorization = "Bearer $Token" } -ContentType 'application/json' -Body $body -TimeoutSec 60
  } catch {
    $detail = if ($_.ErrorDetails) { $_.ErrorDetails.Message } else { $_.Exception.Message }
    throw "Cyanite $Label 失败：$detail"
  }
}

Write-Output "== 1/4 申请上传地址"
$upload = (Invoke-Cyanite 'mutation { fileUploadRequest { id uploadUrl } }' 'fileUploadRequest').data.fileUploadRequest
if (-not $upload.id) { throw '没有拿到 uploadId。' }

Write-Output "== 2/4 上传音频（$([math]::Round((Get-Item $Path).Length / 1MB, 2)) MB）"
$bytes = [IO.File]::ReadAllBytes((Resolve-Path -LiteralPath $Path))
$put = Invoke-WebRequest -Uri $upload.uploadUrl -Method Put -Body $bytes -ContentType 'audio/mpeg' -TimeoutSec 300 -UseBasicParsing
if ($put.StatusCode -ne 200) { throw "上传失败，状态码 $($put.StatusCode)。" }

Write-Output "== 3/4 创建曲目"
$safeTitle = $Title.Replace('"', '')
$create = (Invoke-Cyanite "mutation { libraryTrackCreate(input: { uploadId: `"$($upload.id)`", title: `"$safeTitle`" }) { __typename } }" 'libraryTrackCreate').data.libraryTrackCreate
if ($create.__typename -ne 'LibraryTrackCreateSuccess') { throw "创建曲目失败：$($create.__typename)" }

$list = (Invoke-Cyanite '{ libraryTracks(first: 20) { edges { node { id title } } } }' 'libraryTracks').data.libraryTracks
$track = $list.edges | ForEach-Object { $_.node } | Where-Object { $_.title -eq $safeTitle } | Select-Object -First 1
if (-not $track) { throw '创建后没有找到对应曲目。' }
Write-Output "   曲目 id：$($track.id)"

Write-Output "== 4/4 等待分析"
$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$result = $null
while ((Get-Date) -lt $deadline) {
  $query = "{ libraryTrack(id: `"$($track.id)`") { ... on LibraryTrack { audioAnalysisV6 { __typename ... on AudioAnalysisV6Finished { result { genreTags subgenreTags moodTags instrumentTags valence arousal energyLevel musicalEraTag } } } } } }"
  $analysis = (Invoke-Cyanite $query 'audioAnalysisV6').data.libraryTrack.audioAnalysisV6
  if ($analysis.__typename -eq 'AudioAnalysisV6Finished') { $result = $analysis.result; break }
  if ($analysis.__typename -eq 'AudioAnalysisV6Failed') { throw '分析失败。' }
  Start-Sleep -Seconds 5
}

if (-not $result) { throw "等待超时（$TimeoutSeconds 秒），分析还没完成。" }

[pscustomobject]@{
  曲目 = $safeTitle
  流派 = ($result.genreTags -join ', ')
  子流派 = ($result.subgenreTags -join ', ')
  情绪 = ($result.moodTags -join ', ')
  乐器 = ($result.instrumentTags -join ', ')
  能量 = $result.energyLevel
  年代 = $result.musicalEraTag
  效价 = [math]::Round($result.valence, 2)
  唤醒度 = [math]::Round($result.arousal, 2)
} | Format-List | Out-String
