import { redirect } from "next/navigation";

export const metadata = { title: "Catálogo de serviços" };

type CategoriesSearchParams = {
  panel?: string;
  categoryId?: string;
  mode?: string;
  success?: string;
};

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<CategoriesSearchParams>;
}) {
  const params = await searchParams;
  const search = new URLSearchParams();

  if (params.panel === "new") {
    search.set("panel", "category");
  }
  if (params.categoryId) {
    search.set("categoryId", params.categoryId);
  }
  if (params.mode) {
    search.set("mode", params.mode);
  }
  if (params.success) {
    search.set("success", params.success);
  }

  const query = search.toString();
  redirect(query ? `/app/services?${query}` : "/app/services");
}
