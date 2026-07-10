import { PageHeading } from "@/components/layout/page-heading";
import { TypebotSimulator } from "@/features/typebot-simulator/simulator";

export const metadata = { title: "Simulador Typebot" };

export default function TypebotSimulatorPage() {
  return (
    <>
      <PageHeading
        title="Simulador Typebot"
        description="Simule o fluxo WhatsApp via Typebot para validar serviços, horários e credenciais dos prestadores."
      />
      <TypebotSimulator />
    </>
  );
}
