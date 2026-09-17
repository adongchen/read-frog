// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { toastManager } from "@/components/ui/base-ui/toast"
import {
  getCustomOptimizerMode,
  resetCustomOptimizerModeForTest,
} from "@/utils/subtitles/processor/optimizer"
import { OptimizerModeToggle } from "../optimizer-mode-toggle"

const resegmentCurrentSubtitlesMock = vi.hoisted(() => vi.fn<() => Promise<void>>())

vi.mock("../../../subtitles-ui-context", () => ({
  useSubtitlesUI: () => ({
    resegmentCurrentSubtitles: resegmentCurrentSubtitlesMock,
  }),
}))

vi.mock("@/components/ui/base-ui/toast", () => ({
  toastManager: {
    add: vi.fn<(options: { type: string; title: string }) => void>(),
  },
}))

vi.mock("@/utils/atoms/storage-adapter", () => ({
  storageAdapter: {
    get: vi.fn<() => Promise<string>>().mockResolvedValue("enhanced"),
    set: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    watch: vi.fn<() => () => void>().mockReturnValue(() => {}),
  },
}))

describe("OptimizerModeToggle", () => {
  beforeEach(() => {
    resetCustomOptimizerModeForTest("enhanced")
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
    resetCustomOptimizerModeForTest("enhanced")
  })

  it("renders with switch checked by default (enhanced mode)", () => {
    render(<OptimizerModeToggle />)
    const switchEl = screen.getByRole("switch")
    expect(switchEl).toBeInTheDocument()
    expect(switchEl).toHaveAttribute("aria-checked", "true")
  })

  it("toggles mode to original on switch click, triggers toast and resegmentation", async () => {
    render(<OptimizerModeToggle />)
    const switchEl = screen.getByRole("switch")

    await act(async () => {
      fireEvent.click(switchEl)
    })

    expect(getCustomOptimizerMode()).toBe("original")
    expect(toastManager.add).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "info",
      }),
    )
    expect(resegmentCurrentSubtitlesMock).toHaveBeenCalledTimes(1)
  })

  it("toggles back to enhanced when clicked while in original mode", async () => {
    resetCustomOptimizerModeForTest("original")
    render(<OptimizerModeToggle />)
    const switchEl = screen.getByRole("switch")
    expect(switchEl).toHaveAttribute("aria-checked", "false")

    await act(async () => {
      fireEvent.click(switchEl)
    })

    expect(getCustomOptimizerMode()).toBe("enhanced")
    expect(toastManager.add).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "info",
      }),
    )
    expect(resegmentCurrentSubtitlesMock).toHaveBeenCalledTimes(1)
  })
})
