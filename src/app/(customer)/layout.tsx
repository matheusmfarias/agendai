import { requireCustomer } from "@/features/auth/permissions";
import { CustomerBottomNav } from "@/features/customer-portal/customer-bottom-nav";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCustomer();

  return (
    <div className="min-h-screen bg-background">
      {children}
      <CustomerBottomNav />
    </div>
  );
}
