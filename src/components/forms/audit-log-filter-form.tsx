"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { auditLogFiltersSchema } from "@/features/audit/audit-schemas";

type FilterValues = z.infer<typeof auditLogFiltersSchema>;

type AuditLogFilterFormProps = {
  tenants: Array<{ id: string; name: string }>;
  defaultValues: FilterValues;
};

export function AuditLogFilterForm({
  tenants,
  defaultValues,
}: AuditLogFilterFormProps) {
  const router = useRouter();
  const form = useForm<FilterValues>({
    resolver: zodResolver(auditLogFiltersSchema),
    defaultValues,
  });

  function onSubmit(values: FilterValues) {
    const params = new URLSearchParams();
    Object.entries(values).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    router.push(`/admin/audit-logs?${params.toString()}`);
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="grid gap-4 md:grid-cols-5"
    >
      <div className="space-y-2">
        <Label htmlFor="tenantId">Tenant</Label>
        <Select id="tenantId" {...form.register("tenantId")}>
          <option value="">Todos</option>
          {tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="eventType">Evento</Label>
        <Input
          id="eventType"
          placeholder="TENANT_UPDATED"
          {...form.register("eventType")}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="actorType">Ator</Label>
        <Select id="actorType" {...form.register("actorType")}>
          <option value="">Todos</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="TENANT_USER">Usuário do tenant</option>
          <option value="SYSTEM">Sistema</option>
          <option value="CUSTOMER">Cliente</option>
          <option value="TYPEBOT">Typebot</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="startDate">Data inicial</Label>
        <Input id="startDate" type="date" {...form.register("startDate")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="endDate">Data final</Label>
        <Input id="endDate" type="date" {...form.register("endDate")} />
      </div>
      <div className="flex gap-2 md:col-span-5">
        <Button type="submit">Filtrar</Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            form.reset({
              tenantId: "",
              eventType: "",
              actorType: "",
              startDate: "",
              endDate: "",
            });
            router.push("/admin/audit-logs");
          }}
        >
          Limpar
        </Button>
      </div>
    </form>
  );
}
