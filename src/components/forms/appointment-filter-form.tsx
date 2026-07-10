import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  APPOINTMENT_ORIGIN_LABELS,
  APPOINTMENT_STATUS_LABELS,
} from "@/features/appointments/appointment-constants";

export function AppointmentFilterForm({
  defaults,
  services,
  customers,
}: {
  defaults: Record<string, string | undefined>;
  services: { id: string; name: string }[];
  customers: { id: string; name: string }[];
}) {
  return (
    <form className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
      <div className="space-y-2">
        <Label htmlFor="startDate">Data inicial</Label>
        <Input
          id="startDate"
          name="startDate"
          type="date"
          defaultValue={defaults.startDate}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="endDate">Data final</Label>
        <Input
          id="endDate"
          name="endDate"
          type="date"
          defaultValue={defaults.endDate}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select id="status" name="status" defaultValue={defaults.status}>
          <option value="">Todos</option>
          {Object.entries(APPOINTMENT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="serviceId">Serviço</Label>
        <Select
          id="serviceId"
          name="serviceId"
          defaultValue={defaults.serviceId}
        >
          <option value="">Todos</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>{service.name}</option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="customerId">Cliente</Label>
        <Select
          id="customerId"
          name="customerId"
          defaultValue={defaults.customerId}
        >
          <option value="">Todos</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>{customer.name}</option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="origin">Origem</Label>
        <Select id="origin" name="origin" defaultValue={defaults.origin}>
          <option value="">Todas</option>
          {Object.entries(APPOINTMENT_ORIGIN_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
      </div>
      <div className="md:col-span-3 xl:col-span-6">
        <Button type="submit" variant="outline">Aplicar filtros</Button>
      </div>
    </form>
  );
}
