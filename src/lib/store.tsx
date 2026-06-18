import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { dbToProduct, productToDb, type Product } from "./products";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
}

export interface CartItem {
  product: Product;
  qty: number;
}

export type OrderStatus = "Pending" | "Processing" | "Shipped" | "Delivered";

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  image: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  phone: string;
  address: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
}

type ModalKind =
  | { kind: "none" }
  | { kind: "auth"; tab: "login" | "signup" }
  | { kind: "cart" }
  | { kind: "wishlist" }
  | { kind: "profile" }
  | { kind: "product"; product: Product }
  | { kind: "order"; product: Product; qty: number }
  | { kind: "thanks" };

interface StoreCtx {
  user: User | null;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (u: { name: string; email: string; phone: string; location: string; password: string }) => Promise<string | null>;
  signOut: () => Promise<void>;
  customers: User[];
  cart: CartItem[];
  addToCart: (p: Product, qty?: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  wishlist: Product[];
  toggleWishlist: (p: Product) => void;
  inWishlist: (id: string) => boolean;
  modal: ModalKind;
  setModal: (m: ModalKind) => void;
  products: Product[];
  refreshProducts: () => Promise<void>;
  addProduct: (p: Omit<Product, "id">) => Promise<string | null>;
  updateProduct: (id: string, patch: Partial<Product>) => Promise<string | null>;
  deleteProduct: (id: string) => Promise<string | null>;
  uploadProductImage: (file: File) => Promise<string>;
  orders: Order[];
  addOrder: (o: Omit<Order, "id" | "createdAt" | "status">) => Promise<Order | null>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
}

const Ctx = createContext<StoreCtx | null>(null);

function mapOrder(r: any): Order {
  return {
    id: r.id,
    customerName: r.customer_name,
    customerEmail: r.customer_email,
    phone: r.phone,
    address: r.address,
    items: r.items ?? [],
    total: Number(r.total),
    status: r.status as OrderStatus,
    createdAt: r.created_at,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // SECURITY: never seed from client storage — always derive from server role query.
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [modal, setModal] = useState<ModalKind>({ kind: "none" });
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);

  // --- Products (public read) ---
  const refreshProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: true });
    if (!error && data) setProducts(data.map(dbToProduct));
  }, []);

  useEffect(() => {
    refreshProducts();
    const channel = supabase
      .channel("products-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => { refreshProducts(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refreshProducts]);

  // --- Auth ---
  const loadProfile = useCallback(async (uid: string) => {
    // Fire both queries in parallel; update isAdmin as soon as it resolves
    const profilePromise = supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();
    const rolePromise = supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid);

    rolePromise.then(({ data: roles }) => {
      const admin = !!roles?.some((r: any) => r.role === "admin");
      setIsAdmin(admin);
    });

    const { data: profile } = await profilePromise;
    if (profile) {
      setUser({
        id: profile.id,
        name: profile.name || "",
        email: profile.email,
        phone: profile.phone || "",
        location: profile.location || "",
      });
    }
  }, []);

  useEffect(() => {
    // Set listener FIRST, then check current session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // defer to avoid deadlock
        setTimeout(() => loadProfile(session.user.id), 0);
      } else {
        setUser(null);
        setIsAdmin(false);
        setCustomers([]);
        setOrders([]);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadProfile(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  // --- Load orders & customers based on role ---
  const refreshOrders = useCallback(async () => {
    if (!user) return setOrders([]);
    const { data } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setOrders(data.map(mapOrder));
  }, [user]);

  const refreshCustomers = useCallback(async () => {
    if (!isAdmin) return setCustomers([]);
    const { data } = await supabase.from("profiles").select("*");
    if (data) {
      setCustomers(
        data.map((p: any) => ({
          id: p.id,
          name: p.name || "",
          email: p.email,
          phone: p.phone || "",
          location: p.location || "",
        })),
      );
    }
  }, [isAdmin]);

  useEffect(() => { refreshOrders(); }, [refreshOrders]);

  // --- 30-minute inactivity auto-logout ---
  useEffect(() => {
    if (!user) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { supabase.auth.signOut(); }, 30 * 60 * 1000);
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [user]);
  useEffect(() => { refreshCustomers(); }, [refreshCustomers]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  };

  const signUp: StoreCtx["signUp"] = async (d) => {
    const redirectUrl = `${window.location.origin}/auth/callback`;
    const { data, error } = await supabase.auth.signUp({
      email: d.email,
      password: d.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { name: d.name, phone: d.phone, location: d.location },
      },
    });
    if (!error) {
      if (data.user && !data.session) return "VERIFY_EMAIL_SENT";
      return null;
    }
    if (/weak|pwned|compromised/i.test(error.message)) {
      return "Password is too weak. Use at least 8 characters with an uppercase letter, lowercase letter, number, and special character.";
    }
    return error.message;
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  // --- Cart / wishlist (local) ---
  const addToCart = (p: Product, qty = 1) =>
    setCart((c) => {
      const existing = c.find((i) => i.product.id === p.id);
      if (existing) return c.map((i) => i.product.id === p.id ? { ...i, qty: Math.min(i.qty + qty, p.stock) } : i);
      return [...c, { product: p, qty }];
    });
  const removeFromCart = (id: string) => setCart((c) => c.filter((i) => i.product.id !== id));
  const clearCart = () => setCart([]);

  const inWishlist = (id: string) => wishlist.some((p) => p.id === id);
  const toggleWishlist = (p: Product) => {
    const exists = wishlist.some((x) => x.id === p.id);
    setWishlist((w) => (exists ? w.filter((x) => x.id !== p.id) : [...w, p]));
    if (!user) return;
    if (exists) {
      supabase.from("wishlists").delete().eq("user_id", user.id).eq("product_id", p.id).then(({ error }) => {
        if (error) setWishlist((w) => (w.some((x) => x.id === p.id) ? w : [...w, p]));
      });
    } else {
      supabase.from("wishlists").insert({ user_id: user.id, product_id: p.id } as any).then(({ error }) => {
        if (error && !/duplicate/i.test(error.message)) setWishlist((w) => w.filter((x) => x.id !== p.id));
      });
    }
  };

  // Load wishlist from DB on sign-in; clear on sign-out. Reconcile when products load.
  useEffect(() => {
    if (!user) { setWishlist([]); return; }
    let cancelled = false;
    supabase.from("wishlists").select("product_id").eq("user_id", user.id).then(({ data }) => {
      if (cancelled || !data) return;
      const ids = new Set(data.map((r: any) => r.product_id));
      setWishlist((current) => {
        const fromProducts = products.filter((p) => ids.has(p.id));
        // keep any local items already present that match db
        const merged = fromProducts.length ? fromProducts : current.filter((p) => ids.has(p.id));
        return merged;
      });
    });
    return () => { cancelled = true; };
  }, [user, products]);

  // --- Product CRUD (admin). Use .select() so RLS silent rejections surface as errors. ---
  const addProduct = async (p: Omit<Product, "id">) => {
    const { data, error } = await supabase.from("products").insert(productToDb(p) as any).select();
    if (error) return error.message;
    if (!data || data.length === 0) return "Not allowed: you must be signed in as an admin to add products.";
    await refreshProducts();
    return null;
  };
  const updateProduct = async (id: string, patch: Partial<Product>) => {
    const { data, error } = await supabase.from("products").update(productToDb(patch) as any).eq("id", id).select();
    if (error) return error.message;
    if (!data || data.length === 0) return "No changes saved. Make sure you are signed in as an admin.";
    await refreshProducts();
    return null;
  };
  const deleteProduct = async (id: string) => {
    const { data, error } = await supabase.from("products").delete().eq("id", id).select();
    if (error) return error.message;
    if (!data || data.length === 0) return "Delete blocked. Make sure you are signed in as an admin.";
    await refreshProducts();
    return null;
  };

  const uploadProductImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      throw new Error("Please choose an image file (JPG, PNG, WebP, etc.).");
    }
    const MAX_MB = 10;
    if (file.size > MAX_MB * 1024 * 1024) {
      throw new Error(`Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Please upload an image under ${MAX_MB} MB.`);
    }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${user?.id ?? "anon"}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
    if (error) {
      if (/row-level security|not authorized|permission/i.test(error.message)) {
        throw new Error("You don't have permission to upload. Please sign in as an admin.");
      }
      throw new Error(error.message || "Upload failed. Please try again.");
    }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  };

  // --- Orders ---
  const addOrder: StoreCtx["addOrder"] = async (o) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        customer_name: o.customerName,
        customer_email: o.customerEmail || user.email,
        phone: o.phone,
        address: o.address,
        items: o.items as any,
        total: o.total,
        status: "Pending",
      } as any)
      .select()
      .single();
    if (error || !data) return null;

    // Decrement stock for each item (admin-only on server; fine if it fails for non-admin)
    await Promise.all(
      o.items.map(async (it) => {
        const p = products.find((pr) => pr.id === it.productId);
        if (p) await supabase.from("products").update({ stock: Math.max(0, p.stock - it.qty) }).eq("id", p.id);
      }),
    );
    await refreshProducts();
    await refreshOrders();
    return mapOrder(data);
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    await supabase.from("orders").update({ status }).eq("id", id);
    await refreshOrders();
  };

  const value = useMemo<StoreCtx>(
    () => ({
      user, isAdmin, signIn, signUp, signOut,
      customers, cart, addToCart, removeFromCart, clearCart,
      wishlist, toggleWishlist, inWishlist,
      modal, setModal,
      products, refreshProducts, addProduct, updateProduct, deleteProduct, uploadProductImage,
      orders, addOrder, updateOrderStatus,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, isAdmin, customers, cart, wishlist, modal, products, orders],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside StoreProvider");
  return v;
};
