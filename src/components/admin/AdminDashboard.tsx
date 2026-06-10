import { useStore } from "@/lib/store";
import { formatNaira } from "@/lib/products";
import { Card } from "./AdminLayout";

type Tab = "dashboard" | "products" | "orders" | "customers";

export default function AdminDashboard({ onJump }: { onJump: (t: Tab) => void }) {
  const { products, orders, customers } = useStore();
  const lowStock = products.filter((p) => p.stock <= 3).length;
  const outOfStock = products.filter((p) => p.stock === 0).length;
  const revenue = orders.reduce((a, o) => a + o.total, 0);
  const pending = orders.filter((o) => o.status === "Pending").length;

  const stats = [
    { label: "Products", value: products.length, icon: "fa-bag-shopping", tab: "products" as Tab },
    { label: "Low Stock", value: lowStock, icon: "fa-triangle-exclamation", tab: "products" as Tab, danger: lowStock > 0 },
    { label: "Total Orders", value: orders.length, icon: "fa-receipt", tab: "orders" as Tab },
    { label: "Customers", value: customers.length, icon: "fa-users", tab: "customers" as Tab },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="font-serif text-3xl">Welcome back</h2>
        <p className="text-sm text-muted-foreground mt-1">Here's what's happening with your store today.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <button
            key={s.label}
            onClick={() => onJump(s.tab)}
            className="text-left bg-card border border-border rounded-2xl p-5 hover:border-burgundy hover:shadow-md transition"
          >
            <div className={`w-10 h-10 grid place-items-center rounded-xl ${s.danger ? "bg-destructive/10 text-destructive" : "bg-burgundy/10 text-burgundy"}`}>
              <i className={`fa-solid ${s.icon}`} />
            </div>
            <div className="mt-4 text-3xl font-serif">{s.value}</div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{s.label}</div>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-xl">Revenue</h3>
            <span className="text-xs text-muted-foreground">All-time (mock)</span>
          </div>
          <div className="mt-4 text-4xl font-serif text-burgundy">{formatNaira(revenue)}</div>
          <div className="mt-2 text-sm text-muted-foreground">
            {orders.length} order{orders.length === 1 ? "" : "s"} placed · {pending} pending
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-serif text-xl">Inventory health</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex justify-between"><span>Out of stock</span><span className={outOfStock ? "text-destructive font-semibold" : ""}>{outOfStock}</span></li>
            <li className="flex justify-between"><span>Low stock (≤3)</span><span className={lowStock ? "text-burgundy font-semibold" : ""}>{lowStock}</span></li>
            <li className="flex justify-between"><span>Healthy</span><span>{products.length - lowStock}</span></li>
          </ul>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-xl">Recent orders</h3>
          <button onClick={() => onJump("orders")} className="text-sm text-burgundy hover:underline">View all →</button>
        </div>
        {orders.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No orders yet. They'll appear here as customers check out.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {orders.slice(0, 5).map((o) => (
              <li key={o.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{o.customerName}</div>
                  <div className="text-xs text-muted-foreground">{o.id} · {new Date(o.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-burgundy font-semibold">{formatNaira(o.total)}</span>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-beige">{o.status}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
