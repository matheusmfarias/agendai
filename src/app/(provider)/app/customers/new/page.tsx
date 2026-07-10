import { redirect } from "next/navigation";

export const metadata = { title: "Novo cliente" };

export default function NewCustomerPage() {
  redirect("/app/customers?panel=new");
}
