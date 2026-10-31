/** DeepSeek 自研搜索/抓取（/v1/tools/search、/v1/tools/fetch）。
 *
 *  Claude Code 自带的 WebSearch/WebFetch 在抓取前要过一道域名安全校验（请求
 *  Anthropic 的校验服务）；国内网络下校验不可达，抓取会被客户端直接拒绝——
 *  哪怕底层模型是 DeepSeek。这两个工具直接打 DeepSeek 的 API，不经过那道
 *  校验：搜索、抓取完全由 DeepSeek 服务端完成，与梯子无关。
 *
 *  计费：DeepSeek 按次收（¥5 / 1000 次成功请求，失败与无结果不计费）。
 */
const BASE_URL = 'https://api.deepseek.com';
/** 单页正文上限：再长的页面进了上下文也只是噪声。 */
const MAX_CONTENT_CHARS = 200_000;

export interface DeepSeekSearchHit {
  title: string;
  url: string;
  snippet: string;
  summary: string;
  date: string | null;
}

export interface DeepSeekFetchResult {
  title: string;
  content: string;
}

async function request<T>(path: string, body: unknown, apiKey: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000)
  });
  if (!response.ok) {
    // 402（余额）、403（安全策略）、404（站点不可抓/无正文）都原样交给模型判断。
    const detail = await response.text().catch(() => '');
    throw new Error(`DeepSeek ${path} 失败（HTTP ${response.status}）${detail ? `：${detail.slice(0, 200)}` : ''}`);
  }
  return (await response.json()) as T;
}

export async function deepseekSearch(query: string, count: number, apiKey: string): Promise<DeepSeekSearchHit[]> {
  const data = await request<{ results?: Array<Record<string, unknown>> }>(
    '/v1/tools/search',
    { query, count: Math.min(10, Math.max(1, Math.round(count))), need_content: false },
    apiKey
  );
  return (data.results ?? []).map((row) => ({
    title: String(row.title ?? ''),
    url: String(row.url ?? ''),
    snippet: String(row.snippet ?? ''),
    summary: String(row.summary ?? ''),
    date: typeof row.date === 'string' ? row.date : null
  }));
}

export async function deepseekFetch(url: string, apiKey: string): Promise<DeepSeekFetchResult> {
  const data = await request<{ title?: unknown; content?: unknown }>('/v1/tools/fetch', { url }, apiKey);
  const content = String(data.content ?? '');
  return {
    title: String(data.title ?? ''),
    content: content.length > MAX_CONTENT_CHARS
      ? `${content.slice(0, MAX_CONTENT_CHARS)}\n…（正文过长，已截断）`
      : content
  };
}

/** 找到能直连 DeepSeek 官方 API 的 key：配置指向官方端点时用它的 key，
 *  否则退回环境变量里的 DeepSeek key（本地转发端点的 token 未必是官方 key）。 */
export function resolveDeepSeekToolsKey(provider: { baseUrl: string; apiKey: string }): string | undefined {
  try {
    if (new URL(provider.baseUrl).origin === 'https://api.deepseek.com') {
      const key = provider.apiKey.trim();
      if (key) return key;
    }
  } catch {
    // 非 URL 的 baseUrl 直接走环境变量兜底。
  }
  return process.env.DEEPSEEK_API_KEY?.trim() || undefined;
}
