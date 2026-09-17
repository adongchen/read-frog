import type { SubtitlesFragment } from "../../types"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  getCustomOptimizerMode,
  getOptimizerModeLabel,
  getOptimizerModeToast,
  OPTIMIZER_MODE_STORAGE_KEY,
  resetCustomOptimizerModeForTest,
  setCustomOptimizerMode,
} from "../custom-optimizer-mode"
import { optimizeSubtitles } from "../optimizer"
import * as pipelineOptimizer from "../pipeline-optimizer"

const { getMock, setMock, watchMock } = vi.hoisted(() => ({
  getMock: vi.fn<() => Promise<string>>().mockResolvedValue("enhanced"),
  setMock: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  watchMock: vi.fn<() => () => void>().mockReturnValue(() => {}),
}))

vi.mock("@/utils/atoms/storage-adapter", () => ({
  storageAdapter: {
    get: getMock,
    set: setMock,
    watch: watchMock,
  },
}))

describe("custom-optimizer-mode", () => {
  beforeEach(() => {
    resetCustomOptimizerModeForTest("enhanced")
    vi.clearAllMocks()
  })

  afterEach(() => {
    resetCustomOptimizerModeForTest("enhanced")
  })

  it("defaults to enhanced mode", () => {
    expect(getCustomOptimizerMode()).toBe("enhanced")
  })

  it("updates mode and writes to storageAdapter on setCustomOptimizerMode", async () => {
    await setCustomOptimizerMode("original")
    expect(getCustomOptimizerMode()).toBe("original")
    expect(setMock).toHaveBeenCalledWith(OPTIMIZER_MODE_STORAGE_KEY, "original", expect.anything())
  })

  it("routes optimizeSubtitles to optimizeSubtitlesV2 when in enhanced mode", () => {
    resetCustomOptimizerModeForTest("enhanced")
    const spyV2 = vi.spyOn(pipelineOptimizer, "optimizeSubtitles")
    const fragments: SubtitlesFragment[] = [
      { text: "Hello world this is a test fragment.", start: 0, end: 1000 },
    ]

    const result = optimizeSubtitles(fragments, "en")
    expect(spyV2).toHaveBeenCalledWith(fragments, "en")
    expect(result.length).toBeGreaterThan(0)
    spyV2.mockRestore()
  })

  it("routes optimizeSubtitles to optimizeSubtitlesOriginal when in original mode", () => {
    resetCustomOptimizerModeForTest("original")
    const spyV2 = vi.spyOn(pipelineOptimizer, "optimizeSubtitles")
    const fragments: SubtitlesFragment[] = [{ text: "Hello world.", start: 0, end: 1000 }]

    const result = optimizeSubtitles(fragments, "en")
    expect(spyV2).not.toHaveBeenCalled()
    expect(result.length).toBeGreaterThan(0)
    spyV2.mockRestore()
  })

  it("supports explicit overrideMode in optimizeSubtitles", () => {
    resetCustomOptimizerModeForTest("enhanced")
    const spyV2 = vi.spyOn(pipelineOptimizer, "optimizeSubtitles")
    const fragments: SubtitlesFragment[] = [{ text: "Hello world.", start: 0, end: 1000 }]

    // Override with original even though global is enhanced
    const result = optimizeSubtitles(fragments, "en", "original")
    expect(spyV2).not.toHaveBeenCalled()
    expect(result.length).toBeGreaterThan(0)
    spyV2.mockRestore()
  })

  it("provides user-friendly labels and toast messages", () => {
    expect(getOptimizerModeLabel("enhanced")).toBeTruthy()
    expect(getOptimizerModeLabel("original")).toBeTruthy()
    expect(getOptimizerModeToast("enhanced")).toBeTruthy()
    expect(getOptimizerModeToast("original")).toBeTruthy()
  })
})
