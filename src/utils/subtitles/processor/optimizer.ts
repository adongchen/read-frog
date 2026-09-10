import type { SubtitlesFragment } from "../types"
import { PAUSE_TIMEOUT_MS, SENTENCE_TERMINATOR_PATTERN } from "@/utils/constants/subtitles"
import { getTextLength, isCJKLanguage } from "@/utils/subtitles/utils"

const STARTS_WITH_SIGN_PATTERN = /^[[(♪]/
const LEADING_CHEVRON_PATTERN = /^>>\s*/
const CHEVRON_PATTERN = />>/g
const WHITESPACE_PATTERN = /\s+/

// Preferred target bounds
const TARGET_MIN_CJK = 15 // characters
const TARGET_MAX_CJK = 25 // characters
const TARGET_MIN_NON_CJK = 11 // words
const TARGET_MAX_NON_CJK = 20 // words
const MAX_SAFE_CHARS_NON_CJK = 100 // character ceiling for single screen line
const MIN_SUBPART_CHARS = 20 // minimum characters for any subpart

export { SENTENCE_TERMINATOR_PATTERN }

/**
 * Phrases that introduce a new thought/sentence and should NEVER be glued
 * to the previous sentence's tail.
 */
export const LEADING_TRANSITION_PHRASES = [
  "for instance",
  "for example",
  "in other words",
  "on the other hand",
  "in addition",
  "as a result",
  "first",
  "secondly",
  "finally",
  "however",
  "therefore",
  "moreover",
  "furthermore",
  "meanwhile",
  "nevertheless",
]

/**
 * Conjunction phrases checked first (multi-word phrases).
 */
export const CONJUNCTION_PHRASES = [
  "and then",
  "so that",
  "in order to",
  "as well as",
  "even though",
  "even if",
  "as long as",
  "as if",
]

/**
 * Conjunctions and relative clause markers.
 */
export const CONJUNCTION_WORDS = [
  // Relatives & subordinating conjunctions
  "that",
  "which",
  "where",
  "when",
  "while",
  "because",
  "although",
  "though",
  "since",
  "unless",
  "whereas",
  "whether",
  "until",
  "before",
  "after",
  "if",
  "as",
  // Coordinating & transitions
  "and",
  "but",
  "or",
  "so",
  "then",
  "yet",
]

/**
 * Secondary prepositions used when no primary conjunction is present.
 */
export const PREPOSITIONS = ["with", "without", "about", "into", "through", "from", "for", "to"]

// Backward compatibility alias for tests
export const CONJUNCTION_PATTERNS = [...CONJUNCTION_PHRASES, ...CONJUNCTION_WORDS]

function cleanText(text: string): string {
  return text
    .replace(LEADING_CHEVRON_PATTERN, "")
    .replace(CHEVRON_PATTERN, " ")
    .replace(WHITESPACE_PATTERN, " ")
    .trim()
}

function startsWithLeadingTransition(text: string): boolean {
  const lower = text.toLowerCase().trim()
  const stripped = lower.replace(/^(and|so|but)\s+/, "")
  return LEADING_TRANSITION_PHRASES.some(
    (phrase) =>
      lower.startsWith(phrase + ",") ||
      lower.startsWith(phrase + " ") ||
      stripped.startsWith(phrase + ",") ||
      stripped.startsWith(phrase + " "),
  )
}

function shouldKeepBoundary(left: SubtitlesFragment, right: SubtitlesFragment): boolean {
  const isTimeout = right.start - left.end > PAUSE_TIMEOUT_MS
  const startsWithSign = STARTS_WITH_SIGN_PATTERN.test(right.text)
  const startsWithTransition = startsWithLeadingTransition(right.text)
  return isTimeout || startsWithSign || startsWithTransition
}

/**
 * Stage 1: Build macro sentences by true sentence terminators or natural pause gaps
 */
export function buildMacroSentences(
  fragments: SubtitlesFragment[],
  isCJK: boolean,
): SubtitlesFragment[] {
  const result: SubtitlesFragment[] = []
  let buffer: SubtitlesFragment[] = []

  const flush = () => {
    if (buffer.length === 0) return
    const separator = isCJK ? "" : " "
    const text = buffer
      .map((f) => cleanText(f.text))
      .join(separator)
      .trim()
    if (text) {
      result.push({
        text,
        start: buffer[0]!.start,
        end: buffer.at(-1)!.end,
      })
    }
    buffer = []
  }

  for (const frag of fragments) {
    const text = cleanText(frag.text)
    if (!text) continue

    const last = buffer.at(-1)
    if (last && frag.start - last.end > PAUSE_TIMEOUT_MS) {
      flush()
    }

    buffer.push({ ...frag, text })

    if (SENTENCE_TERMINATOR_PATTERN.test(text)) {
      flush()
    }
  }

  flush()
  return result
}

/**
 * Stage 2: Merge adjacent short fragments under target minimum
 */
export function mergeShortSentences(
  sentences: SubtitlesFragment[],
  isCJK: boolean,
): SubtitlesFragment[] {
  if (sentences.length <= 1) return sentences

  const separator = isCJK ? "" : " "
  const min = isCJK ? TARGET_MIN_CJK : TARGET_MIN_NON_CJK
  const max = isCJK ? TARGET_MAX_CJK : TARGET_MAX_NON_CJK

  const result: SubtitlesFragment[] = []

  let i = 0
  while (i < sentences.length) {
    let current = { ...sentences[i]! }
    let currentLength = getTextLength(current.text, isCJK)

    while (currentLength < min && i + 1 < sentences.length) {
      const next = sentences[i + 1]!
      const nextLength = getTextLength(next.text, isCJK)
      const combinedLength = currentLength + nextLength

      if (combinedLength > max || shouldKeepBoundary(current, next)) {
        break
      }

      current = {
        ...current,
        text: `${current.text}${separator}${next.text}`.trim(),
        end: next.end,
      }
      currentLength = combinedLength
      i++
    }

    result.push(current)
    i++
  }

  return result
}

interface SplitCandidate {
  splitCharIndex: number
  priority: number
}

function findSplitCandidates(text: string): SplitCandidate[] {
  const words = text.split(WHITESPACE_PATTERN)
  const candidates: SplitCandidate[] = []

  let charOffset = 0
  for (let w = 0; w < words.length; w++) {
    const word = words[w]!
    const wordStart = charOffset
    const wordEnd = charOffset + word.length
    charOffset = wordEnd + 1

    if (w === 0 || w === words.length - 1) continue

    const cleanWord = word.replace(/^[^\w]+|[^\w]+$/g, "").toLowerCase()
    const prevWord = words[w - 1]!
    const prevEndsWithPunct = /[,:;—–-]$/.test(prevWord)

    // Tier 1: Internal punctuation (comma, colon, dash)
    if (prevEndsWithPunct) {
      candidates.push({
        splitCharIndex: wordStart,
        priority: 100,
      })
      continue
    }

    // Tier 2: Multi-word conjunction phrases
    const nextWords = words
      .slice(w, w + 3)
      .join(" ")
      .toLowerCase()
    const matchedPhrase = CONJUNCTION_PHRASES.find((p) => nextWords.startsWith(p))
    if (matchedPhrase) {
      candidates.push({
        splitCharIndex: wordStart,
        priority: 85,
      })
      continue
    }

    // Tier 2: Single conjunction / relative words
    if (CONJUNCTION_WORDS.includes(cleanWord)) {
      candidates.push({
        splitCharIndex: wordStart,
        priority: 85,
      })
      continue
    }

    // Tier 3: Prepositions
    if (PREPOSITIONS.includes(cleanWord)) {
      candidates.push({
        splitCharIndex: wordStart,
        priority: 70,
      })
      continue
    }
  }

  return candidates
}

/**
 * Stage 3: Split long sentences exceeding max bound using multi-tier strategy
 */
export function splitLongSentence(
  sentence: SubtitlesFragment,
  isCJK: boolean,
): SubtitlesFragment[] {
  if (isCJK) {
    const length = getTextLength(sentence.text, true)
    if (length <= TARGET_MAX_CJK) return [sentence]

    const commaIdx = sentence.text.indexOf("，")
    if (commaIdx >= TARGET_MIN_CJK && sentence.text.length - commaIdx - 1 >= TARGET_MIN_CJK) {
      const leftText = sentence.text.slice(0, commaIdx).trim()
      const rightText = sentence.text.slice(commaIdx + 1).trim()
      const ratio = leftText.length / sentence.text.length
      const splitTime = Math.round(sentence.start + (sentence.end - sentence.start) * ratio)
      return [
        ...splitLongSentence({ text: leftText, start: sentence.start, end: splitTime }, isCJK),
        ...splitLongSentence({ text: rightText, start: splitTime, end: sentence.end }, isCJK),
      ]
    }
    return [sentence]
  }

  const wordsCount = sentence.text.split(WHITESPACE_PATTERN).length
  const exceedsWords = wordsCount > TARGET_MAX_NON_CJK
  const exceedsChars = sentence.text.length > MAX_SAFE_CHARS_NON_CJK

  if (!exceedsWords && !exceedsChars) {
    return [sentence]
  }

  const candidates = findSplitCandidates(sentence.text)
  const center = sentence.text.length / 2

  let bestCandidate: SplitCandidate | null = null
  let bestScore = -Infinity

  for (const cand of candidates) {
    const leftLen = cand.splitCharIndex
    const rightLen = sentence.text.length - cand.splitCharIndex

    if (leftLen < MIN_SUBPART_CHARS || rightLen < MIN_SUBPART_CHARS) continue

    const distanceRatio = Math.abs(cand.splitCharIndex - center) / sentence.text.length
    const score = cand.priority - distanceRatio * 60

    if (score > bestScore) {
      bestScore = score
      bestCandidate = cand
    }
  }

  // Tier 4: Center Space Fallback (triggers if words exceed max or length is very large)
  if (!bestCandidate && (exceedsWords || sentence.text.length > 135)) {
    let closestSpace = -1
    let minDist = Infinity
    for (let i = MIN_SUBPART_CHARS; i < sentence.text.length - MIN_SUBPART_CHARS; i++) {
      if (sentence.text[i] === " ") {
        const dist = Math.abs(i - center)
        if (dist < minDist) {
          minDist = dist
          closestSpace = i + 1
        }
      }
    }
    if (closestSpace !== -1) {
      bestCandidate = { splitCharIndex: closestSpace, priority: 50 }
    }
  }

  if (!bestCandidate) {
    return [sentence]
  }

  const leftText = sentence.text.slice(0, bestCandidate.splitCharIndex).trim()
  const rightText = sentence.text.slice(bestCandidate.splitCharIndex).trim()

  const ratio = leftText.length / (leftText.length + rightText.length)
  const splitTime = Math.round(sentence.start + (sentence.end - sentence.start) * ratio)

  return [
    ...splitLongSentence({ text: leftText, start: sentence.start, end: splitTime }, isCJK),
    ...splitLongSentence({ text: rightText, start: splitTime, end: sentence.end }, isCJK),
  ]
}

/**
 * Main subtitle optimization function
 */
export function optimizeSubtitles(
  fragments: SubtitlesFragment[],
  language: string,
): SubtitlesFragment[] {
  if (fragments.length === 0) return []

  const isCJK = isCJKLanguage(language)

  // 1. Build macro sentences from true sentence terminators & natural pauses
  const macroSentences = buildMacroSentences(fragments, isCJK)

  // 2. Merge short sentences under min length, protecting leading transition phrases & terminators
  const merged = mergeShortSentences(macroSentences, isCJK)

  // 3. Balanced multi-tier splitting for long sentences
  const result: SubtitlesFragment[] = []
  for (const sentence of merged) {
    result.push(...splitLongSentence(sentence, isCJK))
  }

  return result
}
