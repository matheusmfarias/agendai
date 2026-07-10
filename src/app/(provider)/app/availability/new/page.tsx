import { redirect } from "next/navigation";

export default function NewAvailabilityPage() {
  redirect("/app/availability?panel=new");
}
