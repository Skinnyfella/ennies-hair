import { createFileRoute } from "@tanstack/react-router";
import { StoreProvider } from "@/lib/store";
import AdminLayout from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin · ENNIE'S HAIR" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <StoreProvider>
      <AdminLayout />
    </StoreProvider>
  );
}
