import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Product } from "./products";

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
  signIn: (email: string, password: string) => string | null;
  signUp: (u: User & { password: string }) => string | null;
  signOut: () => void;
  cart: CartItem[];
  addToCart: (p: Product, qty?: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  wishlist: Product[];
  toggleWishlist: (p: Product) => void;
  inWishlist: (id: string) => boolean;
  modal: ModalKind;
  setModal: (m: ModalKind) => void;
}

const Ctx = createContext<StoreCtx | null>(null);

// Mock user db (in-memory) — would be replaced by Firebase Auth.
const mockUsers = new Map<string, User & { password: string }>();

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [modal, setModal] = useState<ModalKind>({ kind: "none" });

  useEffect(() => {
    try {
      const u = localStorage.getItem("eh_user");
      if (u) setUser(JSON.parse(u));
    } catch {}
  }, []);

  const persistUser = (u: User | null) => {
    setUser(u);
    if (u) localStorage.setItem("eh_user", JSON.stringify(u));
    else localStorage.removeItem("eh_user");
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
  const removeFromCart = (id: string) =>
    setCart((c) => c.filter((i) => i.product.id !== id));
  const clearCart = () => setCart([]);

  const inWishlist = (id: string) => wishlist.some((p) => p.id === id);
  const toggleWishlist = (p: Product) =>
    setWishlist((w) =>
      w.some((x) => x.id === p.id) ? w.filter((x) => x.id !== p.id) : [...w, p],
    );

  return (
    <Ctx.Provider
      value={{
        user,
        signIn,
        signUp,
        signOut,
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        wishlist,
        toggleWishlist,
        inWishlist,
        modal,
        setModal,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useStore = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside StoreProvider");
  return v;
};
