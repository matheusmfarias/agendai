export function getProviderDisplayName(tenant: {
  name: string;
  publicDisplayName?: string | null;
}) {
  return tenant.publicDisplayName || tenant.name;
}

export function getProviderLogoFallbackText(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return (words[0] ?? name).slice(0, 2).toUpperCase();
}
