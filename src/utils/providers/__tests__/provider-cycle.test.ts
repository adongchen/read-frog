import type { ProviderSelectorOption } from "@/utils/providers/provider-display"
import { describe, expect, it } from "vitest"
import { getProviderSelectorGroups } from "@/components/llm-providers/provider-selector"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { getSelectableProvidersForCapability } from "@/utils/providers/provider-registry"
import { findProviderCycleDestination, getPopupProviderCycleOptions } from "../provider-cycle"

function local(id: string): ProviderSelectorOption {
  return { id, name: id } as ProviderSelectorOption
}

function system(id: string, disabled = false): ProviderSelectorOption {
  return {
    kind: "system",
    id,
    name: id,
    logo: () => "",
    disabled,
  }
}

describe("findProviderCycleDestination", () => {
  it("moves in both directions and wraps around", () => {
    const providers = [local("first"), local("second"), local("third")]

    expect(findProviderCycleDestination(providers, "first", "next")?.id).toBe("second")
    expect(findProviderCycleDestination(providers, "first", "previous")?.id).toBe("third")
    expect(findProviderCycleDestination(providers, "third", "next")?.id).toBe("first")
  })

  it("keeps a disabled current option as the traversal anchor", () => {
    const providers = [local("first"), system("disabled-current", true), local("third")]

    expect(findProviderCycleDestination(providers, "disabled-current", "next")?.id).toBe("third")
    expect(findProviderCycleDestination(providers, "disabled-current", "previous")?.id).toBe(
      "first",
    )
  })

  it("skips disabled destinations", () => {
    const providers = [local("first"), system("disabled", true), local("third")]

    expect(findProviderCycleDestination(providers, "first", "next")?.id).toBe("third")
    expect(findProviderCycleDestination(providers, "third", "previous")?.id).toBe("first")
  })

  it("does nothing when no different selectable option exists", () => {
    expect(findProviderCycleDestination([local("only")], "only", "next")).toBeNull()
    expect(
      findProviderCycleDestination([local("current"), system("disabled", true)], "current", "next"),
    ).toBeNull()
  })

  it("preserves the Popup empty-selection behavior for a missing current option", () => {
    expect(
      findProviderCycleDestination([local("first"), local("second")], "missing", "next"),
    ).toBeNull()
  })
})

describe("getPopupProviderCycleOptions", () => {
  it.each(["pageTranslation", "videoSubtitles"] as const)(
    "keeps the Popup display order for %s",
    (feature) => {
      const popupOrder = getProviderSelectorGroups(
        getSelectableProvidersForCapability(feature, DEFAULT_CONFIG.providersConfig),
      )
        .flatMap((group) => group.providers)
        .map((provider) => provider.id)

      expect(
        getPopupProviderCycleOptions(DEFAULT_CONFIG, feature, undefined).map((p) => p.id),
      ).toEqual(popupOrder)
    },
  )
})
