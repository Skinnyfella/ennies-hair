import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { formatNaira, type Product, type Category } from "@/lib/products";

const CATS: Category[] = ["Wigs", "Bundles", "Braiding", "Accessories"];

const TEXTURES = [
  "Straight hair",
  "Wavy hair",
  "Curly hair",
  "Coily (Kinky) hair",
] as const;

type Draft = Omit<Product, "id">;

const emptyDraft: Draft = {
  name: "",
  type: "Wigs",
  price: 0,
  originalPrice: 0,
  image: "",
  thumbnails: [],
  stock: 0,
  length: "",
  texture: "",
  hairType: "Wigs",
  description: "",
};

export default function AdminProducts() {
  const { products, addProduct, updateProduct, deleteProduct } = useStore();
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(filter.toLowerCase()) ||
      p.type.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-serif text-3xl">Products & Inventory</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {products.length} products · {products.filter((p) => p.stock <= 3).length} low stock
          </p>
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
                      <img src={p.image} alt="" className="w-12 h-12 rounded-lg object-cover bg-beige" />
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.length} · {p.texture}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">{p.type}</td>
                  <td className="p-3 text-burgundy font-semibold">{formatNaira(p.price)}</td>
                  <td className="p-3">{p.stock}</td>
                  <td className="p-3">
                    <span
                      className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ${
                        status === "Out"
                          ? "bg-destructive/10 text-destructive"
                          : status === "Low"
                            ? "bg-burgundy/10 text-burgundy"
                            : "bg-beige"
                      }`}
                    >
                      {status}
                    </span>
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button onClick={() => setEditing(p)} className="text-burgundy hover:underline text-sm mr-3">
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Delete "${p.name}"?`)) return;
                        const err = await deleteProduct(p.id);
                        if (err) alert(err);
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
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No products match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(editing || creating) && (
        <ProductForm
          initial={editing ?? null}
          busy={busy}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSave={async (d) => {
            setBusy(true);
            const err = editing ? await updateProduct(editing.id, d) : await addProduct(d);
            setBusy(false);
            if (err) return alert(err);
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
  busy,
  onSave,
  onClose,
}: {
  initial: Product | null;
  busy: boolean;
  onSave: (d: Draft) => void;
  onClose: () => void;
}) {
  const { uploadProductImage } = useStore();
  const [d, setD] = useState<Draft>(initial ?? emptyDraft);
  const [uploading, setUploading] = useState<"main" | "thumb" | null>(null);
  const mainRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  const handleMain = async (file: File) => {
    setUploading("main");
    try {
      const url = await uploadProductImage(file);
      setD((p) => ({ ...p, image: url, thumbnails: p.thumbnails.length ? p.thumbnails : [url] }));
    } catch (e: any) {
      alert(e?.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const handleThumbs = async (files: FileList) => {
    setUploading("thumb");
    try {
      const urls = await Promise.all(Array.from(files).map((f) => uploadProductImage(f)));
      setD((p) => ({ ...p, thumbnails: [...p.thumbnails, ...urls] }));
    } catch (e: any) {
      alert(e?.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 sm:p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 grid place-items-center rounded-full hover:bg-beige">
          <i className="fa-solid fa-xmark" />
        </button>
        <h3 className="font-serif text-2xl">{initial ? "Edit product" : "Add product"}</h3>

        <div className="mt-6 grid sm:grid-cols-2 gap-3">
          <Field label="Name" full>
            <input className={inp} value={d.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Category">
            <select
              className={inp}
              value={d.type}
              onChange={(e) => {
                const category = e.target.value as Category;
                setD((p) => ({ ...p, type: category, hairType: category }));
              }}
            >
              {CATS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Stock">
            <input type="number" min={0} className={inp} value={d.stock || ""} placeholder="0" onChange={(e) => set("stock", e.target.value === "" ? 0 : +e.target.value)} />
          </Field>
          <Field label="Price (₦)">
            <input type="number" min={0} className={inp} value={d.price || ""} placeholder="0" onChange={(e) => set("price", e.target.value === "" ? 0 : +e.target.value)} />
          </Field>
          <Field label="Original price (₦)">
            <input type="number" min={0} className={inp} value={d.originalPrice || ""} placeholder="0" onChange={(e) => set("originalPrice", e.target.value === "" ? 0 : +e.target.value)} />
          </Field>
          <Field label="Length">
            <input className={inp} value={d.length} onChange={(e) => set("length", e.target.value)} placeholder='e.g. 22"' />
          </Field>
          <Field label="Texture">
            <select className={inp} value={d.texture} onChange={(e) => set("texture", e.target.value)}>
              <option value="">Select texture</option>
              {TEXTURES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Hair type" full>
            <input className={inp} value={d.hairType} readOnly aria-readonly />
          </Field>

          <Field label="Main image" full>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => mainRef.current?.click()}
                disabled={uploading === "main"}
                className="px-4 py-2 rounded-full bg-beige hover:bg-burgundy hover:text-primary-foreground text-burgundy text-sm transition flex items-center gap-2 disabled:opacity-50"
              >
                <i className="fa-solid fa-upload" />
                {uploading === "main" ? "Uploading…" : d.image ? "Replace image" : "Upload image"}
              </button>
              {d.image && (
                <img src={d.image} alt="preview" className="w-16 h-16 rounded-xl object-cover border border-border" />
              )}
              <input
                ref={mainRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => e.target.files?.[0] && handleMain(e.target.files[0])}
              />
            </div>
          </Field>

          <Field label="Additional thumbnails" full>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => thumbRef.current?.click()}
                disabled={uploading === "thumb"}
                className="px-4 py-2 rounded-full border border-border hover:border-burgundy hover:text-burgundy text-sm transition flex items-center gap-2 disabled:opacity-50"
              >
                <i className="fa-solid fa-images" />
                {uploading === "thumb" ? "Uploading…" : "Add thumbnails"}
              </button>
              <input
                ref={thumbRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => e.target.files && handleThumbs(e.target.files)}
              />
              <div className="flex flex-wrap gap-2">
                {d.thumbnails.map((t, i) => (
                  <div key={i} className="relative">
                    <img src={t} alt="" className="w-14 h-14 rounded-lg object-cover border border-border" />
                    <button
                      type="button"
                      onClick={() => set("thumbnails", d.thumbnails.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 grid place-items-center rounded-full bg-destructive text-destructive-foreground text-[10px]"
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </Field>

          <Field label="Description" full>
            <textarea rows={3} className={inp} value={d.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 rounded-full border border-border hover:border-burgundy transition text-sm">
            Cancel
          </button>
          <button
            disabled={busy || !!uploading}
            onClick={() => {
              if (!d.name || !d.image || d.price <= 0) {
                alert("Name, image and price are required.");
                return;
              }
              onSave(d);
            }}
            className="px-5 py-2.5 rounded-full bg-burgundy text-primary-foreground hover:bg-burgundy-dark transition text-sm disabled:opacity-50"
          >
            {busy ? "Saving…" : initial ? "Save changes" : "Create product"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inp =
  "w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-burgundy focus:outline-none focus:ring-2 focus:ring-burgundy/20";

function Field({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
