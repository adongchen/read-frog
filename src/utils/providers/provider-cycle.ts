import type { Config } from "@/types/config/config"
import type { HostedAiStatus } from "@/utils/hosted-ai/types"
import type { ProviderSelectorOption } from "@/utils/providers/provider-display"
import { isLLMProviderConfig, isPureTranslateProviderConfig } from "@/types/config/provider"
import {
  getHostedFeatureForCapability,
  isProviderIdDurablyUnusable,
} from "@/utils/providers/provider-availability"
import { isSystemProviderSelectorItem } from "@/utils/providers/provider-display"
import { getSelectableProvidersForCapability } from "@/utils/providers/provider-registry"
import { providerSupportsTranslationOnlyMode } from "@/utils/providers/translation-only-gate"

export type ProviderCycleFeature = "pageTranslation" | "videoSubtitles"
export type ProviderCycleDirection = "previous" | "next"

function orderLikePopup(providers: ProviderSelectorOption[]): ProviderSelectorOption[] {
  const llmProviders = providers.filter(
    (provider) => !isSystemProviderSelectorItem(provider) && isLLMProviderConfig(provider),
  )
  const pureTranslateProviders = providers.filter(
    (provider) =>
      !isSystemProviderSelectorItem(provider) && isPureTranslateProviderConfig(provider),
  )
  const builtInProviders = providers.filter(isSystemProviderSelectorItem)

  return [...llmProviders, ...pureTranslateProviders, ...builtInProviders]
}

/** Mirrors the provider options and ordering rendered by the Popup selector. */
export function getPopupProviderCycleOptions(
  config: Config,
  feature: ProviderCycleFeature,
  hostedAiStatus: HostedAiStatus | undefined,
): ProviderSelectorOption[] {
  let providers = getSelectableProvidersForCapability(feature, config.providersConfig)

  if (feature === "pageTranslation" && config.pageTranslation.mode === "translationOnly") {
    providers = providers.filter(
      (provider) =>
        isSystemProviderSelectorItem(provider) ||
        providerSupportsTranslationOnlyMode(provider.provider),
    )
  }

  const hostedFeature = getHostedFeatureForCapability(feature)
  const withPopupAvailability = providers.map((provider) => {
    if (!isSystemProviderSelectorItem(provider) || !hostedFeature) {
      return provider
    }

    return {
      ...provider,
      disabled: isProviderIdDurablyUnusable(provider.id, feature, hostedAiStatus),
    }
  })

  return orderLikePopup(withPopupAvailability)
}

export function findProviderCycleDestination(
  providers: ProviderSelectorOption[],
  currentProviderId: string,
  direction: ProviderCycleDirection,
): ProviderSelectorOption | null {
  const currentIndex = providers.findIndex((provider) => provider.id === currentProviderId)
  if (currentIndex === -1) return null

  const offset = direction === "next" ? 1 : -1
  for (let step = 1; step <= providers.length; step++) {
    const index = (currentIndex + offset * step + providers.length) % providers.length
    const provider = providers[index]!
    if (provider.id === currentProviderId) return null
    if (!isSystemProviderSelectorItem(provider) || provider.disabled !== true) {
      return provider
    }
  }

  return null
}
