import { getProviderLogoFallbackText } from "@/lib/provider-brand";

export function getPublicBusinessInitials(name: string) {
  return getProviderLogoFallbackText(name);
}
