import { redirect } from "next/navigation";

export default function NewServicePage() {
  redirect("/app/services?panel=new");
}
