export type PublicAddressTenant = {
  address?: string | null;
  neighborhood?: string | null;
  addressComplement?: string | null;
  city?: string | null;
  state?: string | null;
};

export function formatPublicAddress(tenant: PublicAddressTenant) {
  const address = tenant.address?.trim();
  const neighborhood = tenant.neighborhood?.trim();
  const complement = tenant.addressComplement?.trim();
  const city = tenant.city?.trim();
  const state = tenant.state?.trim();
  const cityState = city && state ? `${city}/${state}` : city || state || "";
  const street = [address, complement].filter(Boolean).join(", ");
  const local = [street, neighborhood].filter(Boolean).join(" - ");

  if (local && cityState) return `${local}, ${cityState}`;
  return local || cityState || null;
}
