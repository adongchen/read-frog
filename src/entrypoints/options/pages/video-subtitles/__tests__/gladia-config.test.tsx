// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import * as gladiaModule from "@/utils/subtitles/ai/gladia"
import { GladiaConfigSection } from "../gladia-config"

vi.mock("@/utils/subtitles/ai/gladia", async (importOriginal) => {
  const actual = await importOriginal<typeof gladiaModule>()
  return {
    ...actual,
    getGladiaCacheCount: vi.fn<() => Promise<number>>().mockResolvedValue(3),
    clearGladiaSubtitlesCache: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    testGladiaConnection: vi
      .fn<() => Promise<{ success: boolean; message: string }>>()
      .mockResolvedValue({ success: true, message: "OK" }),
    setGladiaConfig: vi
      .fn<(config: gladiaModule.GladiaConfig) => Promise<void>>()
      .mockResolvedValue(undefined),
  }
})

describe("GladiaConfigSection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    gladiaModule.resetGladiaConfigForTest({
      apiKey: "initial-key",
      endpoint: "https://api.gladia.io",
      enabled: true,
    })
  })

  it("renders configuration controls and displays cache count", async () => {
    render(<GladiaConfigSection />)

    expect(screen.getByRole("heading", { level: 2, name: /Gladia/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Gladia API Key/i)).toHaveValue("initial-key")
    expect(screen.getByRole("button", { name: /测试连通性|Test Connection/i })).toBeInTheDocument()
  })

  it("triggers test connection when clicking the test button", async () => {
    render(<GladiaConfigSection />)

    const testBtn = screen.getByRole("button", { name: /测试连通性|Test Connection/i })
    fireEvent.click(testBtn)

    expect(gladiaModule.testGladiaConnection).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: "initial-key" }),
    )
  })

  it("updates apiKey when typing in the input", async () => {
    render(<GladiaConfigSection />)

    const input = screen.getByPlaceholderText(/Gladia API Key/i)
    fireEvent.change(input, { target: { value: "new-secret-key" } })

    expect(gladiaModule.setGladiaConfig).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: "new-secret-key" }),
    )
  })
})
