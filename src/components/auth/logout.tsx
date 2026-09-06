/* eslint-disable @next/next/no-location-assign-relative-destination -- Full navigation clears cached protected UI when the session changes. */
"use client";
import { authClient } from "@/lib/auth-client";
export function Logout() {
  return <button onClick={async () => { await authClient.signOut(); window.location.assign("/login"); }}>Cerrar sesión</button>;
}
