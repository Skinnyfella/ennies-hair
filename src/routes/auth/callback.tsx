import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
  head: () => ({
    meta: [{ title: "Confirming email · Ennie's Hair" }],
  }),
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Confirming your email…");

  useEffect(() => {
    let cancelled = false;

    const finish = (ok: boolean) => {
      if (cancelled) return;
      if (ok) {
        setMessage("Email confirmed! Redirecting…");
        setTimeout(() => navigate({ to: "/" }), 1200);
      } else {
        setMessage("This link is invalid or has expired. Try signing up again or request a new link.");
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) return finish(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) finish(true);
      if (event === "PASSWORD_RECOVERY") finish(true);
    });

    const timer = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => finish(!!session));
    }, 4000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <main className="min-h-screen grid place-items-center bg-beige px-4">
      <div className="w-full max-w-md bg-card rounded-3xl shadow-2xl p-8 text-center">
        <div className="text-4xl text-burgundy">
          <i className="fa-solid fa-envelope-circle-check" />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      </div>
    </main>
  );
}
