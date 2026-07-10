import { redirect } from "next/navigation";

export default function NewCategoryPage() {
  redirect("/app/services?panel=category");
}
