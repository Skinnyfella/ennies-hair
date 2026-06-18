import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import emailjs from "@emailjs/browser";
import { StoreProvider, useStore } from "@/lib/store";
import { formatNaira, type Category, type Product } from "@/lib/products";
import { supabase } from "@/integrations/supabase/client";
import {
  getPublicConfig,
  verifyPaystackAndCreateOrder,
} from "@/lib/payments.functions";
import logo from "/logo.png?url";

declare global {
  interface Window {
    PaystackPop?: {
      setup: (opts: {
        key: string;
        email: string;
        amount: number;
        currency?: string;
        ref?: string;
        callback: (resp: { reference: string }) => void;
        onClose: () => void;
      }) => { openIframe: () => void };
    };
  }
}

function loadPaystackScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("No window"));
    if (window.PaystackPop) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://js.paystack.co/v1/inline.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Paystack")));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v1/inline.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Paystack"));
    document.body.appendChild(s);
  });
}

/* ---------- Navbar ---------- */
function Navbar() {
  const { user, cart, wishlist, signOut, setModal } = useStore();
  const cartCount = cart.reduce((a, i) => a + i.qty, 0);
  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-background/85 border-b border-border">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <a href="#top" className="font-serif">
          <span className="text-2xl tracking-wide text-burgundy font-semibold">ENNIE'S</span>
          <span className="ml-2 text-xs tracking-[0.3em] text-muted-foreground uppercase">Hair</span>
        </a>
        <nav className="flex items-center gap-3">
          {user ? (
            <>
              <button
                onClick={() => setModal({ kind: "profile" })}
                className="hidden sm:inline text-sm text-foreground hover:text-burgundy transition"
              >
                Hi, {user.name.split(" ")[0]}
              </button>
              <IconBtn label="Wishlist" badge={wishlist.length} onClick={() => setModal({ kind: "wishlist" })}>
                <i className="fa-regular fa-heart" />
              </IconBtn>
              <IconBtn label="Cart" badge={cartCount} onClick={() => setModal({ kind: "cart" })}>
                <i className="fa-solid fa-bag-shopping" />
              </IconBtn>
              <IconBtn label="Sign out" onClick={signOut}>
                <i className="fa-solid fa-arrow-right-from-bracket" />
              </IconBtn>
            </>
          ) : (
            <>
              <button
                onClick={() => setModal({ kind: "auth", tab: "login" })}
                className="px-4 py-2 text-sm rounded-full border border-border hover:border-burgundy hover:text-burgundy transition flex items-center gap-2"
              >
                <i className="fa-regular fa-user" /> Login
              </button>
              <button
                onClick={() => setModal({ kind: "auth", tab: "signup" })}
                className="px-4 py-2 text-sm rounded-full bg-burgundy text-primary-foreground hover:bg-burgundy-dark transition"
              >
                Sign Up
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function IconBtn({
  children,
  badge,
  onClick,
  label,
}: {
  children: React.ReactNode;
  badge?: number;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="relative w-10 h-10 grid place-items-center rounded-full border border-border hover:border-burgundy hover:text-burgundy text-foreground transition"
    >
      {children}
      {!!badge && badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-burgundy text-primary-foreground text-[10px] font-semibold grid place-items-center">
          {badge}
        </span>
      )}
    </button>
  );
}

/* ---------- Hero + Logo Banner ---------- */
function LogoBanner() {
  return (
    <section className="pt-10 pb-2 grid place-items-center">
      <img src={logo} alt="ENNIE'S HAIR logo" width={140} height={140} className="w-32 h-32 object-contain drop-shadow-sm" />
    </section>
  );
}

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-beige-light via-background to-background" />
      <div aria-hidden className="absolute top-20 -left-24 w-96 h-96 rounded-full bg-burgundy/10 blur-3xl animate-blob" />
      <div aria-hidden className="absolute bottom-0 -right-24 w-[28rem] h-[28rem] rounded-full bg-beige/60 blur-3xl animate-blob" style={{ animationDelay: "3s" }} />
      <div className="max-w-5xl mx-auto px-6 py-20 sm:py-28 text-center fade-up">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-beige border border-border text-xs uppercase tracking-[0.25em] text-burgundy">
          <i className="fa-solid fa-crown" /> Premium Hair Collection
        </span>
        <h1 className="mt-8 font-serif italic font-medium text-5xl sm:text-7xl lg:text-8xl text-burgundy leading-[1.05]">
          Confidence.<span className="block sm:inline">Beauty.</span>Luxury
        </h1>
        <p className="mt-6 max-w-xl mx-auto text-muted-foreground">
          Discover our luxurious collection of wigs, bundles, and braiding hair. Quality you can feel, beauty you can see.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href="#shop" className="px-7 py-3 rounded-full bg-burgundy text-primary-foreground hover:bg-burgundy-dark transition flex items-center gap-2 shadow-lg shadow-burgundy/20">
            <i className="fa-solid fa-arrow-down" /> Shop Now
          </a>
          <button onClick={() => document.querySelector<HTMLButtonElement>("[data-join]")?.click()} className="px-7 py-3 rounded-full border border-border hover:border-burgundy hover:text-burgundy transition flex items-center gap-2">
            <i className="fa-regular fa-user" /> Join Us
          </button>
        </div>
        <div className="mt-12 grid grid-cols-3 max-w-2xl mx-auto gap-3 sm:gap-4">
          {[
            { n: "100+", l: "Happy Clients" },
            { n: "100%", l: "Virgin Hair" },
            { n: "Fast", l: "Delivery" },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl bg-card border border-border px-3 py-5 shadow-sm">
              <div className="font-serif text-2xl sm:text-3xl text-burgundy">{s.n}</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Marquee ---------- */
function Marquee() {
  const items = ["Luxurious Collection", "New Arrivals Every Week", "100% Virgin & Remy Hair", "Exclusive Deals Up to 30% Off"];
  const row = [...items, ...items, ...items, ...items];
  return (
    <div className="bg-burgundy text-primary-foreground py-3 overflow-hidden">
      <div className="flex animate-marquee whitespace-nowrap">
        {row.map((t, i) => (
          <span key={i} className="flex items-center text-xs sm:text-sm font-medium uppercase tracking-[0.2em]">
            <span className="mx-6 text-beige">✦</span>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- Shop ---------- */
const CATS: (Category | "All")[] = ["All", "Wigs", "Bundles", "Braiding", "Accessories"];

function Shop() {
  const { products } = useStore();
  const [cat, setCat] = useState<(Category | "All")>("All");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);
  const filtered = useMemo(() => (cat === "All" ? products : products.filter((p) => p.type === cat)), [cat, products]);

  return (
    <section id="shop" className="py-20 px-5 sm:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <span className="inline-block px-4 py-1 rounded-full bg-beige border border-border text-[11px] uppercase tracking-[0.25em] text-burgundy">Our Collection</span>
          <h2 className="mt-5 font-serif text-4xl sm:text-5xl">
            Find Your <em className="text-burgundy not-italic font-medium" style={{ fontStyle: "italic" }}>Perfect</em> Hair
          </h2>
          <p className="mt-3 text-muted-foreground">Handpicked quality, every strand tells a story</p>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-5 py-2 rounded-full text-sm border transition ${
                cat === c
                  ? "bg-burgundy text-primary-foreground border-burgundy"
                  : "bg-card text-foreground border-border hover:border-burgundy hover:text-burgundy"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-7">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-beige/60 aspect-[3/4] animate-pulse" />
              ))
            : filtered.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </section>
  );
}

function ProductCard({ product }: { product: Product }) {
  const { setModal, user, toggleWishlist, inWishlist } = useStore();
  const discount = Math.round((1 - product.price / product.originalPrice) * 100);
  const fav = inWishlist(product.id);
  const outOfStock = product.stock <= 0;
  return (
    <article
      onClick={() => { if (!outOfStock) setModal({ kind: "product", product }); }}
      aria-disabled={outOfStock}
      className={`group rounded-2xl bg-card border border-border overflow-hidden transition fade-up ${
        outOfStock
          ? "opacity-50 grayscale cursor-not-allowed"
          : "cursor-pointer hover:border-burgundy hover:shadow-xl hover:shadow-burgundy/10"
      }`}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-beige">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className={`w-full h-full object-cover transition duration-500 ${outOfStock ? "" : "group-hover:scale-105"}`}
        />
        {discount > 0 && !outOfStock && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-burgundy text-primary-foreground text-xs font-semibold">
            -{discount}%
          </span>
        )}
        {outOfStock ? (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-foreground text-background text-[10px] font-semibold uppercase tracking-wider">
            Out of stock
          </span>
        ) : (
          <span
            className={`absolute top-3 right-12 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
              product.stock <= 3
                ? "bg-destructive/10 text-destructive"
                : "bg-success/10 text-success"
            }`}
          >
            {product.stock <= 3 ? `Only ${product.stock} left!` : `${product.stock} in stock`}
          </span>
        )}
        {!outOfStock && (
          <button
            aria-label="Add to wishlist"
            onClick={(e) => {
              e.stopPropagation();
              if (!user) return setModal({ kind: "auth", tab: "login" });
              toggleWishlist(product);
            }}
            className={`absolute top-3 right-3 w-9 h-9 grid place-items-center rounded-full backdrop-blur bg-card/80 border border-border transition ${
              fav ? "text-burgundy" : "text-foreground hover:text-burgundy"
            }`}
          >
            <i className={fav ? "fa-solid fa-heart" : "fa-regular fa-heart"} />
          </button>
        )}
      </div>
      <div className="p-4">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{product.type}</div>
        <h3 className="font-serif text-lg mt-1">{product.name}</h3>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-burgundy font-semibold">{formatNaira(product.price)}</span>
          <span className="text-xs text-muted-foreground line-through">{formatNaira(product.originalPrice)}</span>
        </div>
        <button
          disabled={outOfStock}
          onClick={(e) => {
            e.stopPropagation();
            if (outOfStock) return;
            setModal({ kind: "product", product });
          }}
          className="mt-4 w-full py-2.5 rounded-full bg-beige hover:bg-burgundy hover:text-primary-foreground text-burgundy text-sm font-medium transition flex items-center justify-center gap-2 disabled:hover:bg-beige disabled:hover:text-burgundy disabled:cursor-not-allowed"
        >
          {outOfStock ? "Sold Out" : <>Order <i className="fa-solid fa-arrow-right text-xs" /></>}
        </button>
      </div>
    </article>
  );
}

/* ---------- Trust Strip ---------- */
function Trust() {
  const items = [
    { i: "fa-shield-halved", t: "Authentic Hair", s: "100% Virgin & Remy" },
    { i: "fa-truck-fast", t: "Fast Delivery", s: "Nationwide shipping" },
    { i: "fa-rotate-left", t: "Easy Returns", s: "7-day hassle-free" },
    { i: "fa-headset", t: "24/7 Support", s: "Always here for you" },
  ];
  return (
    <section className="py-14 px-5 bg-beige/60 border-y border-border">
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        {items.map((x) => (
          <div key={x.t}>
            <div className="w-12 h-12 mx-auto rounded-xl bg-card grid place-items-center text-burgundy shadow-sm">
              <i className={`fa-solid ${x.i}`} />
            </div>
            <div className="mt-3 font-serif text-lg">{x.t}</div>
            <div className="text-xs text-muted-foreground">{x.s}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */
function Footer() {
  return (
    <footer className="bg-[oklch(0.2_0.02_20)] text-beige-light pt-14 pb-8 px-5">
      <div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-10">
        <div>
          <div className="font-serif text-2xl text-beige">ENNIE'S HAIR</div>
          <p className="mt-3 text-sm text-beige/70 max-w-xs">
            Premium hair collections for the modern woman. Quality you can feel, beauty you can see.
          </p>
          <div className="mt-5 flex gap-3 text-burgundy">
            <a href="#" aria-label="Instagram" className="w-9 h-9 grid place-items-center rounded-full bg-beige/10 hover:bg-burgundy hover:text-primary-foreground transition"><i className="fa-brands fa-instagram" /></a>
            <a href="#" aria-label="TikTok" className="w-9 h-9 grid place-items-center rounded-full bg-beige/10 hover:bg-burgundy hover:text-primary-foreground transition"><i className="fa-brands fa-tiktok" /></a>
            <a href="https://wa.me/2348027070110" aria-label="WhatsApp" className="w-9 h-9 grid place-items-center rounded-full bg-beige/10 hover:bg-burgundy hover:text-primary-foreground transition"><i className="fa-brands fa-whatsapp" /></a>
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-beige/60">Shop</div>
          <ul className="mt-4 space-y-2 text-sm">
            <li><a href="#shop" className="hover:text-burgundy">Wigs</a></li>
            <li><a href="#shop" className="hover:text-burgundy">Bundles</a></li>
            <li><a href="#shop" className="hover:text-burgundy">Braiding Hair</a></li>
            <li><a href="#shop" className="hover:text-burgundy">Accessories</a></li>
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-beige/60">Contact</div>
          <ul className="mt-4 space-y-2 text-sm">
            <li><i className="fa-brands fa-whatsapp mr-2 text-burgundy" />+234 802 707 0110</li>
            <li><i className="fa-solid fa-location-dot mr-2 text-burgundy" />Lagos, Nigeria</li>
          </ul>
        </div>
      </div>
      <div className="mt-12 text-center text-xs text-beige/50">
        © 2025 ENNIE'S HAIR. All rights reserved. · Made with <span className="text-burgundy">♥</span> for beautiful queens
      </div>
    </footer>
  );
}

/* ---------- Modal shell ---------- */
function ModalShell({ children, onClose, wide = false }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm grid place-items-center p-4 fade-up" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-card rounded-3xl shadow-2xl w-full ${wide ? "max-w-5xl" : "max-w-md"} max-h-[92vh] overflow-y-auto relative`}
      >
        <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 w-9 h-9 grid place-items-center rounded-full hover:bg-beige z-10">
          <i className="fa-solid fa-xmark" />
        </button>
        {children}
      </div>
    </div>
  );
}

/* ---------- Auth modal ---------- */
function checkPasswordStrength(password: string) {
  return {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

function PasswordStrengthHint({ password }: { password: string }) {
  const checks = checkPasswordStrength(password);
  const strong = Object.values(checks).every(Boolean);
  const items = [
    { ok: checks.minLength, label: "8+ characters" },
    { ok: checks.uppercase, label: "Uppercase letter" },
    { ok: checks.lowercase, label: "Lowercase letter" },
    { ok: checks.number, label: "Number" },
    { ok: checks.special, label: "Special character" },
  ];

  return (
    <div className="mt-1.5 px-1">
      <p className={`text-xs font-medium ${strong ? "text-emerald-700" : "text-burgundy"}`}>
        {strong ? "Strong password" : "Password not strong yet"}
      </p>
      <ul className="mt-1 space-y-0.5">
        {items.map((item) => (
          <li
            key={item.label}
            className={`text-xs flex items-center gap-1.5 ${item.ok ? "text-emerald-700" : "text-muted-foreground"}`}
          >
            <i className={`fa-solid ${item.ok ? "fa-circle-check" : "fa-circle"} text-[10px]`} />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AuthModal({ initialTab }: { initialTab: "login" | "signup" }) {
  const { signIn, signUp, setModal } = useStore();
  const [tab, setTab] = useState<"login" | "signup" | "forgot">(initialTab);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ name: "", email: "", phone: "", location: "", password: "" });
  const [forgotEmail, setForgotEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setInfo("");
    setBusy(true);
    try {
      if (tab === "login") {
        const m = await signIn(loginForm.email, loginForm.password);
        if (m) return setErr(m);
        setModal({ kind: "none" });
      } else if (tab === "signup") {
        if (!signupForm.name || !signupForm.email || !signupForm.password) return setErr("Please fill all required fields.");
        const m = await signUp(signupForm);
        if (m) return setErr(m);
        setModal({ kind: "none" });
      } else {
        if (!forgotEmail) return setErr("Enter your email.");
        const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) return setErr(error.message);
        setInfo("Check your email for a reset link.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-8">
      <button data-join hidden onClick={() => setTab("signup")} />
      <h2 className="font-serif text-3xl text-center">
        {tab === "forgot" ? "Reset password" : "Welcome"}
      </h2>
      {tab !== "forgot" && (
        <div className="mt-6 grid grid-cols-2 p-1 rounded-full bg-beige">
          {(["login", "signup"] as const).map((t) => (
            <button key={t} type="button" onClick={() => { setTab(t); setErr(""); setInfo(""); }} className={`py-2 text-sm rounded-full transition ${tab === t ? "bg-card text-burgundy shadow-sm" : "text-muted-foreground"}`}>
              {t === "login" ? "Login" : "Sign Up"}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={submit} className="mt-6 space-y-3">
        {tab === "signup" && (
          <Input placeholder="Full name *" value={signupForm.name} onChange={(v) => setSignupForm({ ...signupForm, name: v })} />
        )}
        {tab === "forgot" ? (
          <Input type="email" placeholder="Email *" value={forgotEmail} onChange={setForgotEmail} />
        ) : (
          <Input type="email" placeholder="Email *" value={tab === "login" ? loginForm.email : signupForm.email} onChange={(v) => (tab === "login" ? setLoginForm({ ...loginForm, email: v }) : setSignupForm({ ...signupForm, email: v }))} />
        )}
        {tab === "signup" && (
          <>
            <Input placeholder="Phone number" value={signupForm.phone} onChange={(v) => setSignupForm({ ...signupForm, phone: v })} />
            <div>
              <Input placeholder="Location / Address" value={signupForm.location} onChange={(v) => setSignupForm({ ...signupForm, location: v })} />
              {signupForm.location.length > 0 && (
                <p className="mt-1.5 px-1 text-xs text-muted-foreground">
                  Use your real delivery address (street, area, city). Avoid placeholders like &quot;No 1&quot; or fake locations.
                </p>
              )}
            </div>
          </>
        )}
        {tab !== "forgot" && (
          <div>
            <PasswordInput
              placeholder="Password *"
              value={tab === "login" ? loginForm.password : signupForm.password}
              onChange={(v) => (tab === "login" ? setLoginForm({ ...loginForm, password: v }) : setSignupForm({ ...signupForm, password: v }))}
              show={showPassword}
              onToggle={() => setShowPassword((s) => !s)}
            />
            {tab === "signup" && signupForm.password.length > 0 && (
              <PasswordStrengthHint password={signupForm.password} />
            )}
          </div>
        )}
        {err && <p className="text-sm text-destructive">{err}</p>}
        {info && <p className="text-sm text-burgundy">{info}</p>}
        <button disabled={busy} className="w-full py-3 rounded-full bg-burgundy text-primary-foreground hover:bg-burgundy-dark transition disabled:opacity-60">
          {busy ? "Please wait…" : tab === "login" ? "Sign In" : tab === "signup" ? "Create Account" : "Send reset link"}
        </button>
        {tab === "login" && (
          <p className="text-center text-xs">
            <button type="button" onClick={() => { setTab("forgot"); setErr(""); setInfo(""); }} className="text-burgundy hover:underline">
              Forgot password?
            </button>
          </p>
        )}
        <p className="text-center text-sm text-muted-foreground">
          {tab === "forgot" ? (
            <>
              Remembered it?{" "}
              <button type="button" onClick={() => { setTab("login"); setErr(""); setInfo(""); }} className="text-burgundy hover:underline">Back to login</button>
            </>
          ) : tab === "login" ? (
            <>No account? <button type="button" onClick={() => setTab("signup")} className="text-burgundy hover:underline">Sign up</button></>
          ) : (
            <>Already have an account? <button type="button" onClick={() => setTab("login")} className="text-burgundy hover:underline">Sign in</button></>
          )}
        </p>
      </form>
    </div>
  );
}

function Input({
  value,
  onChange,
  ...rest
}: { value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <input
      {...rest}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-burgundy focus:outline-none focus:ring-2 focus:ring-burgundy/20 text-sm"
    />
  );
}

function PasswordInput({
  value,
  onChange,
  show,
  onToggle,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "value">) {
  return (
    <div className="relative">
      <input
        {...rest}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 pr-12 rounded-xl border border-border bg-background focus:border-burgundy focus:outline-none focus:ring-2 focus:ring-burgundy/20 text-sm"
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-burgundy transition"
      >
        <i className={show ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"} />
      </button>
    </div>
  );
}

/* ---------- Product detail modal ---------- */
function ProductModal({ product }: { product: Product }) {
  const { setModal, user, toggleWishlist, inWishlist } = useStore();
  const [mainImg, setMainImg] = useState(product.image);
  const [qty, setQty] = useState(1);
  const discount = Math.round((1 - product.price / product.originalPrice) * 100);
  const fav = inWishlist(product.id);

  const proceed = () => {
    if (!user) return setModal({ kind: "auth", tab: "login" });
    setModal({ kind: "order", product, qty });
  };

  return (
    <div className="p-6 sm:p-10">
      <button onClick={() => setModal({ kind: "none" })} className="text-sm text-muted-foreground hover:text-burgundy flex items-center gap-2 mb-6">
        <i className="fa-solid fa-arrow-left" /> Back to Shop
      </button>
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-beige">
            <img src={mainImg} alt={product.name} className="w-full h-full object-cover" />
          </div>
          <div className="mt-3 flex gap-3">
            {product.thumbnails.map((t, i) => (
              <button key={i} onClick={() => setMainImg(t)} className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition ${mainImg === t ? "border-burgundy" : "border-transparent opacity-70"}`}>
                <img src={t} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{product.type}</div>
          <h2 className="font-serif text-4xl mt-2">{product.name}</h2>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-2xl text-burgundy font-semibold">{formatNaira(product.price)}</span>
            <span className="text-sm text-muted-foreground line-through">{formatNaira(product.originalPrice)}</span>
            {discount > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-burgundy text-primary-foreground">-{discount}%</span>}
          </div>
          <p className="mt-5 text-muted-foreground leading-relaxed">{product.description}</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              ["Length", product.length],
              ["Type", product.type],
              ["Texture", product.texture],
              ["In Stock", `${product.stock}`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-beige px-4 py-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
                <div className="text-sm font-medium mt-0.5">{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center border border-border rounded-full">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-10 h-10 hover:text-burgundy">−</button>
              <span className="w-10 text-center">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(product.stock, q + 1))} className="w-10 h-10 hover:text-burgundy">+</button>
            </div>
            <span className="text-xs text-muted-foreground">Max {product.stock}</span>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                if (!user) return setModal({ kind: "auth", tab: "login" });
                toggleWishlist(product);
              }}
              className={`flex-1 py-3 rounded-full border transition flex items-center justify-center gap-2 ${fav ? "border-burgundy text-burgundy bg-burgundy/5" : "border-border hover:border-burgundy hover:text-burgundy"}`}
            >
              <i className={fav ? "fa-solid fa-heart" : "fa-regular fa-heart"} /> {fav ? "In Wishlist" : "Add to Wishlist"}
            </button>
            <button onClick={proceed} className="flex-1 py-3 rounded-full bg-burgundy text-primary-foreground hover:bg-burgundy-dark transition flex items-center justify-center gap-2">
              Proceed to Order <i className="fa-solid fa-arrow-right text-xs" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Order modal ---------- */
function OrderModal({ product, qty }: { product: Product; qty: number }) {
  const { user, setModal, clearCart, refreshProducts } = useStore();
  const verifyOrder = useServerFn(verifyPaystackAndCreateOrder);
  const fetchConfig = useServerFn(getPublicConfig);
  const [f, setF] = useState({
    name: user?.name ?? "",
    phone: user?.phone ?? "",
    address: user?.location ?? "",
    email: user?.email ?? "",
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const total = product.price * qty;

  const items = [{ productId: product.id, name: product.name, price: product.price, qty, image: product.image }];

  const sendAdminEmail = async (cfg: Awaited<ReturnType<typeof fetchConfig>>, orderId: string) => {
    const ej = cfg.emailjs;
    if (!ej.serviceId || !ej.templateId || !ej.publicKey) return;
    const itemsText = items
      .map((it) => `- ${it.name} x${it.qty} — ${formatNaira(it.price * it.qty)}`)
      .join("\n");
    try {
      await emailjs.send(
        ej.serviceId,
        ej.templateId,
        {
          customer_name: f.name,
          customer_email: f.email || user?.email || "",
          customer_phone: f.phone,
          address: f.address,
          order_id: orderId,
          order_total: formatNaira(total),
          items_text: itemsText,
        },
        { publicKey: ej.publicKey },
      );
    } catch (e) {
      console.error("EmailJS failed", e);
    }
  };

  const pay = async () => {
    setErr("");
    if (!f.name || !f.phone || !f.address) return setErr("Please fill all required fields.");
    if (!f.email && !user?.email) return setErr("Email is required for payment.");
    setBusy(true);
    try {
      const cfg = await fetchConfig();
      if (!cfg.paystackPublicKey) {
        setErr("Payment is not configured yet. Please contact the store.");
        return;
      }
      await loadPaystackScript();
      if (!window.PaystackPop) throw new Error("Paystack not loaded");

      const handler = window.PaystackPop.setup({
        key: cfg.paystackPublicKey,
        email: f.email || user!.email,
        amount: Math.round(total * 100),
        currency: "NGN",
        callback: (resp) => {
          // Verify on server, then save order
          (async () => {
            try {
              const order = await verifyOrder({
                data: {
                  reference: resp.reference,
                  customerName: f.name,
                  customerEmail: f.email || user!.email,
                  phone: f.phone,
                  address: f.address,
                  total,
                  items,
                },
              });
              await sendAdminEmail(cfg, order.id);
              await refreshProducts();
              clearCart();
              setModal({ kind: "thanks" });
            } catch (e: any) {
              setErr(e?.message ?? "Payment verification failed.");
            } finally {
              setBusy(false);
            }
          })();
        },
        onClose: () => {
          setBusy(false);
          setErr("Payment cancelled.");
        },
      });
      handler.openIframe();
    } catch (e: any) {
      setBusy(false);
      setErr(e?.message ?? "Could not start payment.");
    }
  };

  return (
    <div className="p-6 sm:p-8">
      <button onClick={() => setModal({ kind: "product", product })} className="text-sm text-muted-foreground hover:text-burgundy flex items-center gap-2 mb-5">
        <i className="fa-solid fa-arrow-left" /> Back
      </button>
      <h2 className="font-serif text-3xl">Complete Your Order</h2>
      <div className="mt-5 flex items-center gap-4 p-4 rounded-2xl bg-beige border border-border">
        <img src={product.image} alt="" className="w-16 h-16 rounded-xl object-cover" />
        <div className="flex-1">
          <div className="font-medium text-sm">{product.name}</div>
          <div className="text-xs text-muted-foreground">Qty {qty}</div>
        </div>
        <div className="text-burgundy font-semibold">{formatNaira(total)}</div>
      </div>
      <div className="mt-5 space-y-3">
        <Input placeholder="Full name *" value={f.name} onChange={(v) => setF({ ...f, name: v })} />
        <Input placeholder="Phone number *" value={f.phone} onChange={(v) => setF({ ...f, phone: v })} />
        <Input placeholder="Delivery address *" value={f.address} onChange={(v) => setF({ ...f, address: v })} />
        <Input type="email" placeholder="Email (for receipt) *" value={f.email} onChange={(v) => setF({ ...f, email: v })} />
        {err && <p className="text-sm text-destructive">{err}</p>}
        <button disabled={busy} onClick={pay} className="w-full py-3.5 rounded-full bg-burgundy text-primary-foreground hover:bg-burgundy-dark transition flex items-center justify-center gap-2 font-medium disabled:opacity-60">
          <i className="fa-solid fa-lock" /> {busy ? "Processing…" : `Pay ${formatNaira(total)} with Paystack`}
        </button>
        <p className="text-center text-xs text-muted-foreground">Secured by Paystack · Your info is safe</p>
      </div>
    </div>
  );
}

/* ---------- Thanks ---------- */
function ThanksModal() {
  const { setModal } = useStore();
  return (
    <div className="p-10 text-center">
      <div className="text-5xl">🎉</div>
      <h2 className="font-serif text-3xl mt-4">Order Placed!</h2>
      <p className="mt-3 text-muted-foreground">Your order will be delivered within 2–3 business days. You'll receive a confirmation shortly.</p>
      <button onClick={() => setModal({ kind: "none" })} className="mt-6 px-7 py-3 rounded-full bg-burgundy text-primary-foreground hover:bg-burgundy-dark transition">
        Continue Shopping
      </button>
    </div>
  );
}

/* ---------- Cart modal ---------- */
function CartModal() {
  const { cart, removeFromCart, setModal } = useStore();
  const total = cart.reduce((a, i) => a + i.product.price * i.qty, 0);
  return (
    <div className="p-6 sm:p-8">
      <h2 className="font-serif text-2xl">Your Cart <span className="text-sm text-muted-foreground">({cart.length})</span></h2>
      {cart.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <i className="fa-solid fa-bag-shopping text-4xl text-burgundy/40" />
          <p className="mt-4">Your cart is empty</p>
        </div>
      ) : (
        <>
          <ul className="mt-5 space-y-3 max-h-80 overflow-y-auto">
            {cart.map((i) => (
              <li key={i.product.id} className="flex items-center gap-3 p-3 rounded-xl bg-beige">
                <img src={i.product.image} alt="" className="w-14 h-14 rounded-lg object-cover" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{i.product.name}</div>
                  <div className="text-xs text-muted-foreground">{formatNaira(i.product.price)} × {i.qty}</div>
                </div>
                <button onClick={() => removeFromCart(i.product.id)} aria-label="Remove" className="text-muted-foreground hover:text-destructive">
                  <i className="fa-solid fa-xmark" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex justify-between border-t border-border pt-4">
            <span className="text-muted-foreground">Total</span>
            <span className="text-burgundy font-semibold text-xl">{formatNaira(total)}</span>
          </div>
          <div className="mt-5 grid gap-2">
            <button
              onClick={() => {
                const first = cart[0];
                if (first) setModal({ kind: "order", product: first.product, qty: first.qty });
              }}
              className="py-3 rounded-full bg-burgundy text-primary-foreground hover:bg-burgundy-dark transition"
            >
              Checkout
            </button>
            <button onClick={() => setModal({ kind: "none" })} className="py-3 rounded-full border border-border hover:border-burgundy hover:text-burgundy transition">
              Continue Shopping
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Wishlist modal ---------- */
function WishlistModal() {
  const { wishlist, toggleWishlist, setModal } = useStore();
  return (
    <div className="p-6 sm:p-8">
      <h2 className="font-serif text-2xl">My Wishlist <span className="text-sm text-muted-foreground">({wishlist.length})</span></h2>
      {wishlist.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <i className="fa-regular fa-heart text-4xl text-burgundy/40" />
          <p className="mt-4">No favourites yet</p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {wishlist.map((p) => (
            <div key={p.id} className="relative rounded-xl overflow-hidden bg-beige cursor-pointer" onClick={() => setModal({ kind: "product", product: p })}>
              <img src={p.image} alt={p.name} className="w-full aspect-square object-cover" />
              <div className="p-2">
                <div className="text-xs font-medium truncate">{p.name}</div>
                <div className="text-xs text-burgundy">{formatNaira(p.price)}</div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); toggleWishlist(p); }}
                aria-label="Remove"
                className="absolute top-1.5 right-1.5 w-7 h-7 grid place-items-center rounded-full bg-card/90 hover:text-destructive"
              >
                <i className="fa-solid fa-xmark text-xs" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Profile modal ---------- */
function ProfileModal() {
  const { user, wishlist, signOut, setModal, isAdmin } = useStore();
  if (!user) return null;
  return (
    <div className="p-6 sm:p-8">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-burgundy text-primary-foreground grid place-items-center font-serif text-3xl">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <h2 className="font-serif text-2xl mt-3">{user.name}</h2>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        {isAdmin && (
          <span className="inline-block mt-2 text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full bg-burgundy/10 text-burgundy">Administrator</span>
        )}
      </div>
      <div className="mt-6 space-y-2 text-sm">
        {user.phone && <Row icon="fa-phone" label={user.phone} />}
        {user.location && <Row icon="fa-location-dot" label={user.location} />}
        <Row icon="fa-heart" label={`${wishlist.length} item${wishlist.length === 1 ? "" : "s"} in wishlist`} />
      </div>
      {isAdmin && (
        <Link
          to="/admin"
          onClick={() => setModal({ kind: "none" })}
          className="mt-4 w-full py-3 rounded-full bg-burgundy text-primary-foreground hover:bg-burgundy-dark transition flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-gauge-high" /> Open Admin Panel
        </Link>
      )}
      <button
        onClick={() => { signOut(); setModal({ kind: "none" }); }}
        className="mt-3 w-full py-3 rounded-full border border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground transition flex items-center justify-center gap-2"
      >
        <i className="fa-solid fa-arrow-right-from-bracket" /> Sign Out
      </button>
    </div>
  );
}
function Row({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-beige">
      <i className={`fa-solid ${icon} text-burgundy`} />
      <span>{label}</span>
    </div>
  );
}

/* ---------- Root rendering ---------- */
function Modals() {
  const { modal, setModal } = useStore();
  if (modal.kind === "none") return null;
  const close = () => setModal({ kind: "none" });
  const wide = modal.kind === "product";
  return (
    <ModalShell onClose={close} wide={wide}>
      {modal.kind === "auth" && <AuthModal initialTab={modal.tab} />}
      {modal.kind === "product" && <ProductModal product={modal.product} />}
      {modal.kind === "order" && <OrderModal product={modal.product} qty={modal.qty} />}
      {modal.kind === "thanks" && <ThanksModal />}
      {modal.kind === "cart" && <CartModal />}
      {modal.kind === "wishlist" && <WishlistModal />}
      {modal.kind === "profile" && <ProfileModal />}
    </ModalShell>
  );
}

function AdminRedirector() {
  const { isAdmin, user } = useStore();
  const navigate = useNavigate();
  useEffect(() => {
    if (user && isAdmin) navigate({ to: "/admin" });
  }, [user, isAdmin, navigate]);
  return null;
}

export default function EnniesHairApp() {
  return (
    <StoreProvider>
      <div className="min-h-screen flex flex-col">
        <AdminRedirector />
        <Navbar />
        <main className="flex-1">
          <LogoBanner />
          <Hero />
          <Marquee />
          <Shop />
          <Trust />
        </main>
        <Footer />
        <Modals />
      </div>
    </StoreProvider>
  );
}
