import { useStore } from "@/lib/store";
import { formatNaira } from "@/lib/products";

export default function AdminCustomers() {
  const { customers, orders } = useStore();

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h2 className="font-serif text-3xl">Customers</h2>
        <p className="text-sm text-muted-foreground mt-1">{customers.length} registered</p>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-beige/60 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Location</th>
              <th className="p-3">Orders</th>
              <th className="p-3">Spent</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => {
              const mine = orders.filter((o) => o.customerEmail.toLowerCase() === c.email.toLowerCase());
              const spent = mine.reduce((a, o) => a + o.total, 0);
              return (
                <tr key={c.email} className="border-t border-border hover:bg-beige/30">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-burgundy text-primary-foreground grid place-items-center text-sm font-serif">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{c.name}</span>
                    </div>
                  </td>
                  <td className="p-3">{c.email}</td>
                  <td className="p-3">{c.phone || "—"}</td>
                  <td className="p-3">{c.location || "—"}</td>
                  <td className="p-3">{mine.length}</td>
                  <td className="p-3 text-burgundy font-semibold">{formatNaira(spent)}</td>
                </tr>
              );
            })}
            {customers.length === 0 && (
              <tr><td colSpan={6} className="p-12 text-center text-muted-foreground">No customers have signed up yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
