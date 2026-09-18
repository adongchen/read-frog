import type { AiSubtitlesContext } from "@/utils/subtitles/ai/request-ai-subtitles"
import type { SubtitlesFragment } from "@/utils/subtitles/types"
import { OverlaySubtitlesError } from "@/utils/subtitles/errors"
import { optimizeSubtitles } from "@/utils/subtitles/processor/optimizer"
import { parseGladiaWordsToFragments, pollGladiaJob, submitGladiaJob } from "./client"
import { getGladiaConfig, getGladiaI18n, isGladiaConfigured } from "./config"
import { getCachedGladiaSubtitles, setCachedGladiaSubtitles } from "./db"

export async function requestGladiaSubtitles(
  ctx: AiSubtitlesContext,
  opts?: { signal?: AbortSignal },
): Promise<{ segments: SubtitlesFragment[]; detectedLanguage: string }> {
  const config = getGladiaConfig()
  const i18n = getGladiaI18n()

  if (!isGladiaConfigured()) {
    throw new OverlaySubtitlesError(i18n.invalidKeyToast)
  }

  // 1. Check local persistent cache in ReadFrogCustomSubtitlesDB
  const cached = await getCachedGladiaSubtitles(ctx.videoId)
  if (cached && cached.segments.length > 0) {
    const hasWordTimestamps = cached.segments.some((s) => s.words && s.words.length > 0)
    if (hasWordTimestamps) {
      // Reconstruct word fragments so optimizer can apply current settings with full word precision
      const wordFragments: SubtitlesFragment[] = cached.segments.flatMap((s) =>
        s.words && s.words.length > 0
          ? s.words.map((w) => {
              const end = w.end ?? w.start + 100
              return {
                text: w.text,
                start: w.start,
                end,
                words: [{ text: w.text, start: w.start, end }],
              }
            })
          : [s],
      )
      const segments = optimizeSubtitles(wordFragments, cached.detectedLanguage)
      return {
        segments,
        detectedLanguage: cached.detectedLanguage,
      }
    }

    const segments = optimizeSubtitles(cached.segments, cached.detectedLanguage)
    return {
      segments,
      detectedLanguage: cached.detectedLanguage,
    }
  }

  // 2. Submit Gladia transcription job
  const job = await submitGladiaJob(ctx.url, config, opts?.signal)

  // 3. Poll until completed
  const completed = await pollGladiaJob(
    job.result_url || job.id,
    ctx.durationSec,
    config,
    opts?.signal,
  )

  // 4. Extract word-level fragments from Gladia transcription (words from utterances or sentences)
  const transcription = completed.result?.transcription
  const utterances = transcription?.utterances
  const sentences = transcription?.sentences
  const wordFragments = parseGladiaWordsToFragments(utterances, sentences)
  const detectedLanguage =
    transcription?.languages?.[0] || utterances?.[0]?.language || sentences?.[0]?.language || "en"

  // 5. Connect word fragments to local pipeline optimizer to build macro sentences,
  // merge short lines, and split long lines using true word-level timestamps.
  const segments = optimizeSubtitles(wordFragments, detectedLanguage)

  // 6. Save optimized segments to local persistent cache
  if (segments.length > 0) {
    void setCachedGladiaSubtitles(ctx.videoId, segments, detectedLanguage)
  }

  return {
    segments,
    detectedLanguage,
  }
}
