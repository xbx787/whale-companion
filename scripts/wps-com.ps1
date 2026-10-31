# WPS COM 桥：只读访问文字/表格/演示。
# 输出统一为 JSON（UTF-8），由 wps-mcp-server.cjs 调用。
param(
  [Parameter(Mandatory = $true)][ValidateSet('list', 'read', 'sheet', 'write')][string]$Action,
  [string]$Path = '',
  [int]$Sheet = 1,
  [int]$Rows = 200,
  [int]$Row = 1,
  [int]$Column = 1,
  [string]$Text = ''
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Get-WpsApp([string]$kind) {
  switch ($kind) {
    'writer' { return New-Object -ComObject Kwps.Application }
    'sheet' { return New-Object -ComObject Ket.Application }
    'slide' { return New-Object -ComObject Kwpp.Application }
    default { return New-Object -ComObject Kwps.Application }
  }
}

function Kind-Of([string]$file) {
  $ext = [System.IO.Path]::GetExtension($file).ToLowerInvariant()
  if ($ext -in @('.xlsx', '.xls', '.et', '.csv')) { return 'sheet' }
  if ($ext -in @('.pptx', '.ppt', '.dps')) { return 'slide' }
  return 'writer'
}

try {
  switch ($Action) {
    'list' {
      $items = @()
      foreach ($kind in @('writer', 'sheet', 'slide')) {
        try {
          $app = Get-WpsApp $kind
          foreach ($doc in $app.Documents) {
            $items += [pscustomobject]@{
              name    = [string]$doc.Name
              path    = [string]$doc.FullName
              kind    = $kind
              saved   = [bool]$doc.Saved
            }
          }
        } catch { }
      }
      @{ ok = $true; documents = $items } | ConvertTo-Json -Depth 6 -Compress
    }
    'read' {
      if (-not $Path -or -not (Test-Path -LiteralPath $Path)) { @{ ok = $false; error = '文件不存在' } | ConvertTo-Json -Compress; break }
      $kind = Kind-Of $Path
      $app = Get-WpsApp $kind
      $doc = $app.Documents.Open($Path, $false, $true)
      try {
        if ($kind -eq 'sheet') {
          # 表格文档没有正文，交给 sheet 动作。
          @{ ok = $false; error = '这是表格文档，请用 wps_read_sheet' } | ConvertTo-Json -Compress
        } else {
          $text = [string]$doc.Content.Text
          @{ ok = $true; path = $Path; kind = $kind; text = $text } | ConvertTo-Json -Depth 4 -Compress
        }
      } finally { $doc.Close($false) }
    }
    'sheet' {
      if (-not $Path -or -not (Test-Path -LiteralPath $Path)) { @{ ok = $false; error = '文件不存在' } | ConvertTo-Json -Compress; break }
      $app = Get-WpsApp 'sheet'
      $doc = $app.Workbooks.Open($Path, $false, $true)
      try {
        $ws = $doc.Worksheets.Item($Sheet)
        $used = $ws.UsedRange
        $rowCount = [Math]::Min([int]$used.Rows.Count, $Rows)
        $colCount = [int]$used.Columns.Count
        $rowsOut = @()
        for ($r = 1; $r -le $rowCount; $r++) {
          $cells = @()
          for ($c = 1; $c -le $colCount; $c++) {
            $value = $ws.Cells.Item($r, $c).Text
            $cells += [string]$value
          }
          $rowsOut += , $cells
        }
        @{ ok = $true; path = $Path; sheet = $Sheet; rows = $rowsOut; truncated = ([int]$used.Rows.Count -gt $rowCount) } | ConvertTo-Json -Depth 5 -Compress
      } finally { $doc.Close($false) }
    }
    'write' {
      if (-not $Path -or -not (Test-Path -LiteralPath $Path)) { @{ ok = $false; error = '文件不存在' } | ConvertTo-Json -Compress; break }
      if ($Row -lt 1 -or $Column -lt 1) { @{ ok = $false; error = '行列从 1 开始' } | ConvertTo-Json -Compress; break }
      $app = Get-WpsApp 'sheet'
      # 写入必须可保存，所以这次不能以只读方式打开。
      $doc = $app.Workbooks.Open($Path, $false, $false)
      try {
        $ws = $doc.Worksheets.Item($Sheet)
        $ws.Cells.Item($Row, $Column).Value2 = $Text
        $doc.Save()
        @{ ok = $true; path = $Path; sheet = $Sheet; row = $Row; column = $Column; text = $Text } | ConvertTo-Json -Depth 4 -Compress
      } finally { $doc.Close($false) }
    }
  }
} catch {
  @{ ok = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress
}
