import { z } from "zod"
import { storageAdapter } from "@/utils/atoms/storage-adapter"

export const OPTIMIZER_MODE_STORAGE_KEY = "custom_subtitles_optimizer_mode"

export const optimizerModeSchema = z.enum(["enhanced", "original"])
export type OptimizerMode = z.infer<typeof optimizerModeSchema>

export const DEFAULT_OPTIMIZER_MODE: OptimizerMode = "enhanced"

let currentOptimizerMode: OptimizerMode = DEFAULT_OPTIMIZER_MODE
let initialized = false

export function initCustomOptimizerMode(): void {
  if (initialized) return
  initialized = true

  void Promise.resolve(
    storageAdapter.get<OptimizerMode>(
      OPTIMIZER_MODE_STORAGE_KEY,
      DEFAULT_OPTIMIZER_MODE,
      optimizerModeSchema,
    ),
  )
    .then((mode) => {
      if (mode) {
        currentOptimizerMode = mode
      }
    })
    .catch(() => {
      // Ignore storage read error during early init
    })

  storageAdapter.watch<OptimizerMode>(OPTIMIZER_MODE_STORAGE_KEY, (mode) => {
    if (optimizerModeSchema.safeParse(mode).success) {
      currentOptimizerMode = mode
    }
  })
}

// Auto-initialize on module load
initCustomOptimizerMode()

export function getCustomOptimizerMode(): OptimizerMode {
  return currentOptimizerMode
}

export async function setCustomOptimizerMode(mode: OptimizerMode): Promise<void> {
  currentOptimizerMode = mode
  await storageAdapter.set(OPTIMIZER_MODE_STORAGE_KEY, mode, optimizerModeSchema)
}

export function resetCustomOptimizerModeForTest(
  mode: OptimizerMode = DEFAULT_OPTIMIZER_MODE,
): void {
  currentOptimizerMode = mode
}

function isZhLanguage(): boolean {
  return globalThis.navigator?.language?.toLowerCase().startsWith("zh") ?? false
}

export function getOptimizerModeLabel(mode: OptimizerMode): string {
  const isZh = isZhLanguage()
  if (mode === "enhanced") {
    return isZh ? "增强语义分句" : "Enhanced Segmentation"
  }
  return isZh ? "原版分句" : "Original Segmentation"
}

export function getOptimizerModeToast(mode: OptimizerMode): string {
  const isZh = isZhLanguage()
  if (mode === "enhanced") {
    return isZh ? "已启用增强语义分句" : "Switched to Enhanced Segmentation"
  }
  return isZh ? "已切换为原版分句" : "Switched to Original Segmentation"
}
