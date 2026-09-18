import type { GladiaCachedSubtitles } from "./types"
import type { SubtitlesFragment } from "@/utils/subtitles/types"
import { storage } from "#imports"

const GLADIA_CACHE_PREFIX = "local:custom_gladia_cache:"
const GLADIA_CACHE_INDEX_KEY = "local:custom_gladia_cache_index"

export async function getCachedGladiaSubtitles(
  videoId: string,
): Promise<GladiaCachedSubtitles | undefined> {
  try {
    const data = await storage.getItem<GladiaCachedSubtitles>(`${GLADIA_CACHE_PREFIX}${videoId}`)
    return data ?? undefined
  } catch (error) {
    console.error("Failed to read from Gladia cache:", error)
    return undefined
  }
}

export async function setCachedGladiaSubtitles(
  videoId: string,
  segments: SubtitlesFragment[],
  detectedLanguage: string,
): Promise<void> {
  try {
    const entry: GladiaCachedSubtitles = {
      videoId,
      segments,
      detectedLanguage,
      createdAt: Date.now(),
    }
    await storage.setItem(`${GLADIA_CACHE_PREFIX}${videoId}`, entry)

    // Maintain index for counting and clearing
    const index = (await storage.getItem<string[]>(GLADIA_CACHE_INDEX_KEY)) ?? []
    if (!index.includes(videoId)) {
      await storage.setItem(GLADIA_CACHE_INDEX_KEY, [...index, videoId])
    }
  } catch (error) {
    console.error("Failed to write to Gladia cache:", error)
  }
}

export async function clearGladiaSubtitlesCache(): Promise<void> {
  try {
    const index = (await storage.getItem<string[]>(GLADIA_CACHE_INDEX_KEY)) ?? []
    await Promise.all(index.map((id) => storage.removeItem(`${GLADIA_CACHE_PREFIX}${id}`)))
    await storage.removeItem(GLADIA_CACHE_INDEX_KEY)
  } catch (error) {
    console.error("Failed to clear Gladia cache:", error)
    throw error
  }
}

export async function getGladiaCacheCount(): Promise<number> {
  try {
    const index = (await storage.getItem<string[]>(GLADIA_CACHE_INDEX_KEY)) ?? []
    return index.length
  } catch {
    return 0
  }
}
