export function getPublicLinkChannelStatus(publicLinkActive: boolean) {
  return publicLinkActive
    ? {
        ready: true,
        label: "Link público ativo",
        tone: "success" as const,
      }
    : {
        ready: false,
        label: "Link público desativado",
        tone: "error" as const,
      };
}
