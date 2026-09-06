/* eslint-disable @next/next/no-location-assign-relative-destination -- Full navigation clears cached protected UI when the session changes. */
"use client";
import { BossaLogo } from "@/components/ritmistas/bossa-logo";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return <main className="flex min-h-screen items-center justify-center bg-background p-6">
    <form className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-6 shadow-[var(--sh-md)] sm:p-8" onSubmit={async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      setPending(true); setError("");
      try {
        const result = await authClient.signIn.email({ email: String(data.get("email")), password: String(data.get("password")) });
        if (result.error) { setError("Email o contraseña incorrectos. Intentá nuevamente."); setPending(false); return; }
        window.location.assign("/ritmistas/carnaval");
      } catch { setError("No se pudo iniciar sesión. Intentá nuevamente."); setPending(false); }
    }}>
      <div><div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-primary/5"><BossaLogo size={32} /></div><h1 className="text-2xl font-extrabold">Bossa</h1><p className="mt-2 text-sm text-fg-secondary">Ingresá para gestionar tu batería.</p></div>
      <div className="space-y-2"><label htmlFor="email" className="text-sm font-medium">Email</label><Input id="email" name="email" type="email" autoComplete="username" required /></div>
      <div className="space-y-2"><label htmlFor="password" className="text-sm font-medium">Contraseña</label><Input id="password" name="password" type="password" autoComplete="current-password" required /></div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <Button className="w-full" disabled={pending} type="submit">{pending ? "Ingresando…" : "Ingresar"}</Button>
    </form>
  </main>;
}
