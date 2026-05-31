import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [{ title: "Reset password · Ennie's Hair" }],
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery hash automatically and sets a session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (password.length < 6) return setErr("Password must be at least 6 characters.");
    if (password !== confirm) return setErr("Passwords do not match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setErr(error.message);
    setOk(true);
    setTimeout(() => navigate({ to: "/" }), 1500);
  };

  return (
    <main className="min-h-screen grid place-items-center bg-beige px-4">
      <div className="w-full max-w-md bg-card rounded-3xl shadow-2xl p-8">
        <h1 className="font-serif text-3xl text-center">Reset password</h1>
        {!ready ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Open this page from the password reset email link.
          </p>
        ) : ok ? (
          <p className="mt-6 text-center text-burgundy">Password updated. Redirecting…</p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <input
              type="password"
              placeholder="New password *"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-burgundy focus:outline-none focus:ring-2 focus:ring-burgundy/20 text-sm"
            />
            <input
              type="password"
              placeholder="Confirm new password *"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-burgundy focus:outline-none focus:ring-2 focus:ring-burgundy/20 text-sm"
            />
            {err && <p className="text-sm text-destructive">{err}</p>}
            <button
              disabled={busy}
              className="w-full py-3 rounded-full bg-burgundy text-primary-foreground hover:bg-burgundy-dark transition disabled:opacity-60"
            >
              {busy ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
