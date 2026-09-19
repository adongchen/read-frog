import { toastManager } from "@/components/ui/base-ui/toast"
import { getFeatureLabelI18nKey } from "@/utils/constants/feature-providers"
import { i18n } from "@/utils/i18n"
import { onMessage } from "@/utils/message"

export function registerProviderCycleToast() {
  return onMessage("showProviderCycleToast", (message) => {
    const { feature, providerName } = message.data
    const featureLabel = i18n.t(getFeatureLabelI18nKey(feature))
    toastManager.add({ type: "success", title: `${featureLabel}：${providerName}` })
  })
}
