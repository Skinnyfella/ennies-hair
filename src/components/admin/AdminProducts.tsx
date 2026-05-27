import { useState } from "react";
import { useStore } from "@/lib/store";
import { formatNaira, type Product, type Category } from "@/lib/products";

const CATS: Category[] = ["Wigs", "Bundles", "Braiding", "Accessories"];

type Draft = Omit<Product, "id" | "thumbnails"> & { thumbnails: string };

const emptyDraft: Draft = {
  name: "",
  type: "Wigs",
  price: 0,
  originalPrice: 0,
  image: "",
  thumbnails: "",
  stock: 0,
  length: "",
  texture: "",
  hairType: "",
  description: "",
};

export default function AdminProducts() {
  const { products, addProduct, updateProduct, deleteProduct } = useStore();
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState("");

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(filter.toLowerCase()) ||
    p.type.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-serif text-3xl">Products & Inventory</h2>
          <p className="text-sm text-muted-foreground mt-1">{products.length} products · {products.filter(p => p.stock <= 3).length} low stock</p>
        </div>
        <div className="flex gap-2">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search…"
            className="px-4 py-2 text-sm rounded-full border border-border bg-background focus:border-burgundy focus:outline-none"
          />
          <button
            onClick={() => setCreating(true)}
            className="px-5 py-2 rounded-full bg-burgundy text-primary-foreground hover:bg-burgundy-dark transition text-sm flex items-center gap-2"
          >
            <i className="fa-solid fa-plus" /> Add product
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-beige/60 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-3">Product</th>
              <th className="p-3">Category</th>
              <th className="p-3">Price</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const status = p.stock === 0 ? "Out" : p.stock <= 3 ? "Low" : "In stock";
              return (
                <tr key={p.id} className="border-t border-border hover:bg-beige/30">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <img src={p.image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.length} · {p.texture}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">{p.type}</td>
                  <td className="p-3 text-burgundy font-semibold">{formatNaira(p.price)}</td>
                  <td className="p-3">{p.stock}</td>
                  <td className="p-3">
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ${
                      status === "Out" ? "bg-destructive/10 text-destructive"
                      : status === "Low" ? "bg-burgundy/10 text-burgundy"
                      : "bg-beige"
                    }`}>{status}</span>
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button onClick={() => setEditing(p)} className="text-burgundy hover:underline text-sm mr-3">Edit</button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${p.name}"?`)) deleteProduct(p.id);
                      }}
                      className="text-destructive hover:underline text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No products match.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {(editing || creating) && (
        <ProductForm
          initial={editing ?? null}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={(d) => {
            const payload: Omit<Product, "id"> = {
              ...d,
              thumbnails: d.thumbnails
                ? d.thumbnails.split(",").map((s) => s.trim()).filter(Boolean)
                : [d.image].filter(Boolean),
            };
            if (editing) updateProduct(editing.id, payload);
            else addProduct(payload);
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function ProductForm({
  initial,
  onSave,
  onClose,
}: {
  initial: Product | null;
  onSave: (d: Draft) => void;
  onClose: () => void;
}) {
  const [d, setD] = useState<Draft>(
    initial
      ? { ...initial, thumbnails: initial.thumbnails.join(", ") }
      : emptyDraft,
  );
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="bg-card rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 sm:p-8 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 grid place-items-center rounded-full hover:bg-beige">
          <i className="fa-solid fa-xmark" />
        </button>
        <h3 className="font-serif text-2xl">{initial ? "Edit product" : "Add product"}</h3>

        <div className="mt-6 grid sm:grid-cols-2 gap-3">
          <Field label="Name" full><input className={inp} value={d.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Category">
            <select className={inp} value={d.type} onChange={(e) => set("type", e.target.value as Category)}>
              {CATS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Stock"><input type="number" min={0} className={inp} value={d.stock} onChange={(e) => set("stock", +e.target.value)} /></Field>
          <Field label="Price (₦)"><input type="number" min={0} className={inp} value={d.price} onChange={(e) => set("price", +e.target.value)} /></Field>
          <Field label="Original price (₦)"><input type="number" min={0} className={inp} value={d.originalPrice} onChange={(e) => set("originalPrice", +e.target.value)} /></Field>
          <Field label="Length"><input className={inp} value={d.length} onChange={(e) => set("length", e.target.value)} placeholder='e.g. 22"' /></Field>
          <Field label="Texture"><input className={inp} value={d.texture} onChange={(e) => set("texture", e.target.value)} /></Field>
          <Field label="Hair type" full><input className={inp} value={d.hairType} onChange={(e) => set("hairType", e.target.value)} /></Field>
          <Field label="Main image URL" full><input className={inp} value={d.image} onChange={(e) => set("image", e.target.value)} placeholder="https://… or /assets/…" /></Field>
          <Field label="Thumbnail URLs (comma-separated)" full><input className={inp} value={d.thumbnails} onChange={(e) => set("thumbnails", e.target.value)} /></Field>
          <Field label="Description" full>
            <textarea rows={3} className={inp} value={d.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
        </div>

        {d.image && (
          <div className="mt-4 flex items-center gap-3">
            <img src={d.image} alt="preview" className="w-20 h-20 rounded-xl object-cover border border-border" />
            <span className="text-xs text-muted-foreground">Image preview</span>
          </div>
        )}

        <div className="mt-6 flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 rounded-full border border-border hover:border-burgundy transition text-sm">Cancel</button>
          <button
            onClick={() => {
              if (!d.name || !d.image || d.price <= 0) {
                alert("Name, image and price are required.");
                return;
              }
              onSave(d);
            }}
            className="px-5 py-2.5 rounded-full bg-burgundy text-primary-foreground hover:bg-burgundy-dark transition text-sm"
          >
            {initial ? "Save changes" : "Create product"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inp = "w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-burgundy focus:outline-none focus:ring-2 focus:ring-burgundy/20";

function Field({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
