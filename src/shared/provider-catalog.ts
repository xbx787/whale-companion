/** The built-in vendor list behind the model form: pick a vendor, pick one of
 *  its standard models — no URLs or ids to type. Every vendor here speaks the
 *  Anthropic Messages protocol, which is what lets Claude Code CLI-talk to it
 *  (Kimi and Zhipu document this access mode for Claude Code directly).
 *  Model ids follow each vendor's docs as of 2026-10-10; they change over
 *  time, which is why the form always keeps a custom path available. */

export interface CatalogModel {
  id: string
  name: string
}

export interface CatalogProvider {
  id: string
  name: string
  /** Anthropic-compatible base URL; requests go to `${baseUrl}/v1/messages`. */
  baseUrl: string
  /** Default small/fast model for the Haiku slot and subagents. */
  smallModel?: string
  models: CatalogModel[]
}

export const PROVIDER_CATALOG: CatalogProvider[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/anthropic',
    smallModel: 'deepseek-flash',
    models: [
      { id: 'deepseek-flash[1m]', name: 'DeepSeek Flash（1M 上下文）' },
      { id: 'deepseek-chat', name: 'DeepSeek Chat' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner（推理）' }
    ]
  }
]
