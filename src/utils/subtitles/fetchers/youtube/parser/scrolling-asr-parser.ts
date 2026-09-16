import type { SubtitlesFragment, SubtitleWord } from "../../../types"
import type { YoutubeTimedText } from "../types"
import { SENTENCE_TERMINATOR_PATTERN } from "@/utils/subtitles/processor/pipeline-optimizer"
import { getMaxLength, getTextLength, isCJKLanguage } from "@/utils/subtitles/utils"

const ESTIMATED_WORD_DURATION_MS = 200

function isSpecialTag(text: string): boolean {
  return text.startsWith("[") && text.endsWith("]")
}

function pushFragment(result: SubtitlesFragment[], fragment: SubtitlesFragment) {
  // Fix previous fragment's end time to avoid overlap
  const last = result.at(-1)
  if (last && last.end > fragment.start) {
    last.end = fragment.start
  }
  result.push(fragment)
}

function flushPendingFragment(
  result: SubtitlesFragment[],
  currentText: string,
  currentStart: number,
  lastSegEnd: number,
  currentWords?: SubtitleWord[],
): boolean {
  const trimmed = currentText.trim()
  if (trimmed && !isSpecialTag(trimmed)) {
    const fragment: SubtitlesFragment = {
      text: trimmed,
      start: currentStart,
      end: lastSegEnd,
    }
    if (currentWords && currentWords.length > 0) {
      fragment.words = [...currentWords]
    }
    pushFragment(result, fragment)
    return true
  }
  return false
}

/**
 * Parse ASR scrolling subtitle format
 * 1. Accumulate text across events until separator
 * 2. Use separator events to determine actual end time and trigger output
 * 3. Mark pending split at sentence boundaries, output when separator arrives
 * 4. Filter special tags and preserve word-level timestamps
 */
export function parseScrollingAsrSubtitles(
  events: YoutubeTimedText[],
  lang?: string,
): SubtitlesFragment[] {
  const result: SubtitlesFragment[] = []
  const isSpaceSeparated = lang?.startsWith("en") || false
  const isCJK = isCJKLanguage(lang)
  const maxLength = getMaxLength(isCJK)

  // Cross-event buffer
  let currentText = ""
  let currentStart = 0
  let lastSegEnd = 0
  let isFirstSeg = true
  let pendingSplit = false
  let currentWords: SubtitleWord[] = []

  for (const event of events) {
    // Separator: update end time and output if pending split
    if (event.aAppend === 1) {
      if (currentText) {
        lastSegEnd = event.tStartMs + (event.dDurationMs || 0)

        if (pendingSplit) {
          flushPendingFragment(result, currentText, currentStart, lastSegEnd, currentWords)
          currentText = ""
          currentWords = []
          isFirstSeg = true
          pendingSplit = false
        }
      }
      continue
    }

    if (!event.segs || event.segs.length === 0) continue

    // If pending split and starting new event, output current fragment first
    if (pendingSplit && currentText) {
      flushPendingFragment(result, currentText, currentStart, lastSegEnd, currentWords)
      currentText = ""
      currentWords = []
      isFirstSeg = true
      pendingSplit = false
    }

    const segs = event.segs
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i]
      const text = seg!.utf8 || ""
      const offsetMs = seg!.tOffsetMs || 0
      const segStart = event.tStartMs + offsetMs

      // If pending split and this is a new seg, output current fragment first
      if (pendingSplit && currentText) {
        flushPendingFragment(result, currentText, currentStart, lastSegEnd, currentWords)
        currentText = ""
        currentWords = []
        isFirstSeg = true
        pendingSplit = false
      }

      if (isFirstSeg && text.trim()) {
        currentStart = segStart
        isFirstSeg = false
      }

      // For space-separated languages (English), add space when merging across events
      if (isSpaceSeparated && currentText && text && i === 0) {
        const needsSpace = !currentText.endsWith(" ") && !text.startsWith(" ")
        if (needsSpace) {
          currentText += " "
        }
      }

      currentText += text
      lastSegEnd = segStart + ESTIMATED_WORD_DURATION_MS

      // Record word timestamp
      const trimmedWord = text.trim()
      if (trimmedWord && !isSpecialTag(trimmedWord)) {
        const parts = trimmedWord.split(/\s+/)
        if (parts.length === 1) {
          currentWords.push({ text: trimmedWord, start: segStart })
        } else {
          for (let p = 0; p < parts.length; p++) {
            currentWords.push({
              text: parts[p]!,
              start: segStart + p * ESTIMATED_WORD_DURATION_MS,
            })
          }
        }
      }

      const isSentenceEnd = SENTENCE_TERMINATOR_PATTERN.test(text.trim())
      const textLength = getTextLength(currentText, isCJK)

      // Mark pending split at sentence boundaries (or CJK fallback for punctuation-less lyrics)
      if (isSentenceEnd || (isCJK && textLength >= maxLength)) {
        pendingSplit = true
      }
    }
  }

  // Handle remaining text after all events
  flushPendingFragment(result, currentText, currentStart, lastSegEnd, currentWords)

  return result
}
