import type { GladiaConfig } from "./types"
import { z } from "zod"
import { storageAdapter } from "@/utils/atoms/storage-adapter"

export const GLADIA_CONFIG_STORAGE_KEY = "custom_gladia_config"

export const gladiaConfigSchema = z.object({
  apiKey: z.string().default(""),
  endpoint: z.string().default("https://api.gladia.io"),
  enabled: z.boolean().default(true),
})

export const DEFAULT_GLADIA_CONFIG: GladiaConfig = {
  apiKey: "",
  endpoint: "https://api.gladia.io",
  enabled: true,
}

let currentGladiaConfig: GladiaConfig = { ...DEFAULT_GLADIA_CONFIG }
let initialized = false

export function initGladiaConfig(): void {
  if (initialized) return
  initialized = true

  void Promise.resolve(
    storageAdapter.get<GladiaConfig>(
      GLADIA_CONFIG_STORAGE_KEY,
      DEFAULT_GLADIA_CONFIG,
      gladiaConfigSchema,
    ),
  )
    .then((config) => {
      if (config) {
        currentGladiaConfig = config
      }
    })
    .catch(() => {
      // Ignore storage read error during early initialization
    })

  storageAdapter.watch<GladiaConfig>(GLADIA_CONFIG_STORAGE_KEY, (config) => {
    const parsed = gladiaConfigSchema.safeParse(config)
    if (parsed.success) {
      currentGladiaConfig = parsed.data
    }
  })
}

// Auto-initialize on module load
initGladiaConfig()

export function getGladiaConfig(): GladiaConfig {
  return currentGladiaConfig
}

export async function setGladiaConfig(config: GladiaConfig): Promise<void> {
  currentGladiaConfig = config
  await storageAdapter.set(GLADIA_CONFIG_STORAGE_KEY, config, gladiaConfigSchema)
}

export function isGladiaConfigured(): boolean {
  return currentGladiaConfig.enabled && currentGladiaConfig.apiKey.trim().length > 0
}

export function resetGladiaConfigForTest(config: GladiaConfig = DEFAULT_GLADIA_CONFIG): void {
  currentGladiaConfig = { ...config }
}

function isZhLanguage(): boolean {
  return globalThis.navigator?.language?.toLowerCase().startsWith("zh") ?? false
}

export function getGladiaI18n() {
  const isZh = isZhLanguage()
  return {
    title: isZh ? "Gladia AI 字幕转录 (自用)" : "Gladia AI Subtitle Transcription",
    description: isZh
      ? "使用您自己的 Gladia API Key 转录 YouTube 视频音频，绕过官方订阅限制并享有本地永久缓存。"
      : "Transcribe YouTube video audio using your personal Gladia API Key, bypassing official subscription limits with persistent local caching.",
    enableGladia: isZh ? "启用 Gladia 转录" : "Enable Gladia Transcription",
    apiKeyLabel: isZh ? "Gladia API Key" : "Gladia API Key",
    apiKeyPlaceholder: isZh ? "输入您的 Gladia API Key..." : "Enter your Gladia API Key...",
    endpointLabel: isZh ? "API Base URL (可选)" : "API Base URL (Optional)",
    endpointPlaceholder: "https://api.gladia.io",
    testConnection: isZh ? "测试连通性" : "Test Connection",
    testing: isZh ? "正在测试..." : "Testing...",
    testSuccess: isZh ? "Gladia API 连通性测试成功！" : "Gladia API connection test succeeded!",
    testFailed: isZh ? "连通性测试失败" : "Connection test failed",
    cachedCount: (count: number) =>
      isZh
        ? `已本地缓存 ${count} 个视频的转录结果`
        : `${count} video transcriptions cached locally`,
    clearCache: isZh ? "清空转录缓存" : "Clear Transcription Cache",
    clearingCache: isZh ? "正在清理..." : "Clearing...",
    cacheCleared: isZh ? "已清空本地转录缓存" : "Local transcription cache cleared",
    processingToast: isZh
      ? "Gladia AI 正在转录视频，请稍候..."
      : "Gladia AI is transcribing the video...",
    serviceUnavailable: isZh
      ? "Gladia 转录服务暂时不可用，请检查网络或 API Key"
      : "Gladia transcription service is unavailable. Please check your network or API Key.",
    invalidKeyToast: isZh
      ? "Gladia API Key 无效或未授权，请检查设置"
      : "Gladia API Key is invalid or unauthorized. Please check settings.",
  }
}
