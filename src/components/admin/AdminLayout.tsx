import { useState, ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import AdminDashboard from "./AdminDashboard";
import AdminProducts from "./AdminProducts";
import AdminOrders from "./AdminOrders";
import AdminCustomers from "./AdminCustomers";

type Tab = "dashboard" | "products" | "orders" | "customers";

export default function AdminLayout() {
  const { user, isAdmin, signOut } = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("dashboard");

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center bg-beige/40 px-6">
        <div className="max-w-md w-full bg-card border border-border rounded-3xl p-10 text-center shadow-xl">
          <div className="w-16 h-16 mx-auto rounded-full bg-burgundy/10 text-burgundy grid place-items-center text-2xl">
            <i className="fa-solid fa-lock" />
          </div>
          <h1 className="font-serif text-3xl mt-5">Admin Access Only</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Sign in with the administrator account to manage products, orders, and customers.
          </p>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard", label: "Dashboard", icon: "fa-chart-line" },
    { id: "products", label: "Products", icon: "fa-bag-shopping" },
    { id: "orders", label: "Orders", icon: "fa-receipt" },
    { id: "customers", label: "Customers", icon: "fa-users" },
  ];

  return (
    <div className="min-h-screen flex bg-beige/30">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-[oklch(0.2_0.02_20)] text-beige-light p-6">
        <div className="font-serif text-2xl text-beige">ENNIE'S</div>
        <div className="text-[10px] tracking-[0.3em] uppercase text-beige/60 mt-1">Admin Panel</div>
        <nav className="mt-10 flex-1 space-y-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition ${
                tab === t.id
                  ? "bg-burgundy text-primary-foreground"
                  : "text-beige/80 hover:bg-beige/10"
              }`}
            >
              <i className={`fa-solid ${t.icon} w-4`} /> {t.label}
            </button>
          ))}
        </nav>
        <div className="mt-6 pt-6 border-t border-beige/10 text-xs text-beige/60">
          Signed in as<br />
          <span className="text-beige">{user.name}</span>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            {/* mobile tab switcher */}
            <select
              value={tab}
              onChange={(e) => setTab(e.target.value as Tab)}
              className="md:hidden text-sm border border-border rounded-full px-3 py-1.5 bg-background"
            >
              {tabs.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <h1 className="font-serif text-xl capitalize hidden md:block">{tab}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { signOut(); navigate({ to: "/" }); }}
              className="text-sm px-4 py-2 rounded-full bg-burgundy text-primary-foreground hover:bg-burgundy-dark transition flex items-center gap-2"
            >
              <i className="fa-solid fa-arrow-right-from-bracket" /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-5 sm:p-8 overflow-x-auto">
          {tab === "dashboard" && <AdminDashboard onJump={setTab} />}
          {tab === "products" && <AdminProducts />}
          {tab === "orders" && <AdminOrders />}
          {tab === "customers" && <AdminCustomers />}
        </main>
      </div>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-2xl ${className}`}>{children}</div>
  );
}
