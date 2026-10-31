/** Self-evolution tools exposed to the model in the selfEvolve approval tier.
 *
 *  The tools only persist intent. Restarting is delegated to the main process
 *  bridge, which waits for the running turn to become idle and then relaunches
 *  (optionally into a freshly packaged version). The startup resume path reads
 *  the same task file and continues after the restart. */

import type { EvolveScheduleInput } from './evolve-store'

export interface EvolveBridge {
  /** True only while this conversation is in the selfEvolve approval tier. */
  enabled: () => boolean
  schedule: (input: EvolveScheduleInput) => Promise<unknown>
  status: () => Promise<unknown>
  /** 用户点叉时返回 cancelled；waiting 表示等当前回合结束后再重启。 */
  restart: (version?: string) => Promise<{ scheduled: boolean; waiting?: boolean; cancelled?: boolean; note?: string; version?: string }>
}

