import { useState } from "react";
import { useStore, type OrderStatus } from "@/lib/store";
import { formatNaira } from "@/lib/products";

const STATUSES: OrderStatus[] = ["Pending", "Processing", "Shipped", "Delivered"];

export default function AdminOrders() {
  const { orders, updateOrderStatus } = useStore();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderStatus | "All">("All");

  const list = filter === "All" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h2 className="font-serif text-3xl">Orders</h2>
        <p className="text-sm text-muted-foreground mt-1">{orders.length} total · {orders.filter(o => o.status === "Pending").length} pending</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["All", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 text-sm rounded-full border transition ${
              filter === s ? "bg-burgundy text-primary-foreground border-burgundy" : "border-border hover:border-burgundy hover:text-burgundy"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-beige/60 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-3">Order</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Items</th>
              <th className="p-3">Total</th>
              <th className="p-3">Date</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map((o) => [
              <tr
                key={o.id}
                onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                className="border-t border-border cursor-pointer hover:bg-beige/30"
              >
                <td className="p-3 font-mono text-xs">{o.id}</td>
                <td className="p-3">
                  <div className="font-medium">{o.customerName}</div>
                  <div className="text-xs text-muted-foreground">{o.phone}</div>
                </td>
                <td className="p-3">{o.items.reduce((a, i) => a + i.qty, 0)}</td>
                <td className="p-3 text-burgundy font-semibold">{formatNaira(o.total)}</td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</td>
                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={o.status}
                    onChange={(e) => updateOrderStatus(o.id, e.target.value as OrderStatus)}
                    className="px-2 py-1 text-xs rounded-full border border-border bg-background"
                  >
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
              </tr>,
              expanded === o.id ? (
                <tr key={o.id + "-d"} className="bg-beige/40">
                  <td colSpan={6} className="p-5">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Delivery</div>
                        <div className="text-sm">{o.customerName}</div>
                        <div className="text-sm text-muted-foreground">{o.address}</div>
                        <div className="text-sm text-muted-foreground">{o.phone} · {o.customerEmail}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Items</div>
                        <ul className="space-y-2">
                          {o.items.map((i) => (
                            <li key={i.productId} className="flex items-center gap-3 text-sm">
                              <img src={i.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                              <div className="flex-1">
                                <div>{i.name}</div>
                                <div className="text-xs text-muted-foreground">{formatNaira(i.price)} × {i.qty}</div>
                              </div>
                              <div className="text-burgundy font-medium">{formatNaira(i.price * i.qty)}</div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : null,
            ])}
            {list.length === 0 && (
              <tr><td colSpan={6} className="p-12 text-center text-muted-foreground">No orders yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
