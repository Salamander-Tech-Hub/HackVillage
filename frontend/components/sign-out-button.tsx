"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    setIsSigningOut(true);
    await fetch("/api/auth/sign-out", { method: "POST" });
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <button className="sign-out-button" onClick={signOut} disabled={isSigningOut}>
      {isSigningOut ? "Signing out…" : "Sign out"}
    </button>
  );
}
