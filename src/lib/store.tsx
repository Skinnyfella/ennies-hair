import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import { products as seedProducts, type Product } from "./products";

export interface User {
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

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  phone: string;
  address: string;
  items: { productId: string; name: string; price: number; qty: number; image: string }[];
  total: number;
  status: OrderStatus;
  createdAt: number;
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
  signIn: (email: string, password: string) => string | null;
  signUp: (u: User & { password: string }) => string | null;
  signOut: () => void;
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
  // products
  products: Product[];
  addProduct: (p: Omit<Product, "id">) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  // orders
  orders: Order[];
  addOrder: (o: Omit<Order, "id" | "createdAt" | "status">) => Order;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
}

const Ctx = createContext<StoreCtx | null>(null);

// ----- Admin credentials (mock). Swap for Firebase Auth + custom claim later. -----
export const ADMIN_EMAIL = "admin@ennieshair.com";
export const ADMIN_PASSWORD = "EnniesAdmin2026";

// Mock user db (in-memory) — would be replaced by Firebase Auth.
const mockUsers = new Map<string, User & { password: string }>();
// Seed the admin account.
mockUsers.set(ADMIN_EMAIL, {
  name: "Ennie (Admin)",
  email: ADMIN_EMAIL,
  phone: "+234 802 707 0110",
  location: "Lagos HQ",
  password: ADMIN_PASSWORD,
});

const LS = {
  user: "eh_user",
  products: "eh_products",
  orders: "eh_orders",
  customers: "eh_customers",
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [modal, setModal] = useState<ModalKind>({ kind: "none" });
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);

  // hydrate
  useEffect(() => {
    try {
      const u = localStorage.getItem(LS.user);
      if (u) setUser(JSON.parse(u));
      const p = localStorage.getItem(LS.products);
      if (p) setProducts(JSON.parse(p));
      const o = localStorage.getItem(LS.orders);
      if (o) setOrders(JSON.parse(o));
      const c = localStorage.getItem(LS.customers);
      if (c) {
        const arr: (User & { password: string })[] = JSON.parse(c);
        arr.forEach((x) => mockUsers.set(x.email.toLowerCase(), x));
        setCustomers(arr.map(({ password: _p, ...rest }) => rest));
      }
    } catch {}
  }, []);

  // persist
  useEffect(() => {
    localStorage.setItem(LS.products, JSON.stringify(products));
  }, [products]);
  useEffect(() => {
    localStorage.setItem(LS.orders, JSON.stringify(orders));
  }, [orders]);

  const persistCustomers = () => {
    const arr = Array.from(mockUsers.values()).filter((u) => u.email !== ADMIN_EMAIL);
    localStorage.setItem(LS.customers, JSON.stringify(arr));
    setCustomers(arr.map(({ password: _p, ...rest }) => rest));
  };

  const persistUser = (u: User | null) => {
    setUser(u);
    if (u) localStorage.setItem(LS.user, JSON.stringify(u));
    else localStorage.removeItem(LS.user);
  };

  const signIn = (email: string, password: string) => {
    const u = mockUsers.get(email.toLowerCase());
    if (!u) return "No account found with that email.";
    if (u.password !== password) return "Incorrect password.";
    const { password: _p, ...rest } = u;
    persistUser(rest);
    return null;
  };

  const signUp = (data: User & { password: string }) => {
    const key = data.email.toLowerCase();
    if (mockUsers.has(key)) return "An account with that email already exists.";
    mockUsers.set(key, data);
    persistCustomers();
    const { password: _p, ...rest } = data;
    persistUser(rest);
    return null;
  };

  const signOut = () => persistUser(null);

  const addToCart = (p: Product, qty = 1) =>
    setCart((c) => {
      const existing = c.find((i) => i.product.id === p.id);
      if (existing)
        return c.map((i) =>
          i.product.id === p.id ? { ...i, qty: Math.min(i.qty + qty, p.stock) } : i,
        );
      return [...c, { product: p, qty }];
    });
  const removeFromCart = (id: string) => setCart((c) => c.filter((i) => i.product.id !== id));
  const clearCart = () => setCart([]);

  const inWishlist = (id: string) => wishlist.some((p) => p.id === id);
  const toggleWishlist = (p: Product) =>
    setWishlist((w) => (w.some((x) => x.id === p.id) ? w.filter((x) => x.id !== p.id) : [...w, p]));

  // products CRUD
  const addProduct = (p: Omit<Product, "id">) =>
    setProducts((prev) => [...prev, { ...p, id: `p_${Date.now()}` }]);
  const updateProduct = (id: string, patch: Partial<Product>) =>
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const deleteProduct = (id: string) =>
    setProducts((prev) => prev.filter((p) => p.id !== id));

  // orders
  const addOrder: StoreCtx["addOrder"] = (o) => {
    const order: Order = {
      ...o,
      id: `ORD-${Date.now().toString(36).toUpperCase()}`,
      createdAt: Date.now(),
      status: "Pending",
    };
    setOrders((prev) => [order, ...prev]);
    // decrement stock
    setProducts((prev) =>
      prev.map((p) => {
        const item = o.items.find((i) => i.productId === p.id);
        return item ? { ...p, stock: Math.max(0, p.stock - item.qty) } : p;
      }),
    );
    return order;
  };
  const updateOrderStatus = (id: string, status: OrderStatus) =>
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));

  const isAdmin = !!user && user.email.toLowerCase() === ADMIN_EMAIL;

  const value = useMemo<StoreCtx>(
    () => ({
      user,
      isAdmin,
      signIn,
      signUp,
      signOut,
      customers,
      cart,
      addToCart,
      removeFromCart,
      clearCart,
      wishlist,
      toggleWishlist,
      inWishlist,
      modal,
      setModal,
      products,
      addProduct,
      updateProduct,
      deleteProduct,
      orders,
      addOrder,
      updateOrderStatus,
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
