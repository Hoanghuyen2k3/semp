"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    if (isRegister) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage({ type: "error", text: error.message });
        setLoading(false);
        return;
      }
      setMessage({
        type: "success",
        text: "Account created. Check your email to confirm, or sign in if confirmation is disabled.",
      });
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage({ type: "error", text: error.message });
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
    setLoading(false);
  }

  return (
    <main className="main auth-page">
      <div className="auth-card">
        <h1>Garden Monitoring</h1>
        <p className="auth-subtitle">
          {isRegister ? "Create an account" : "Sign in to view the dashboard"}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="auth-input"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete={isRegister ? "new-password" : "current-password"}
              className="auth-input"
            />
          </label>
          {message && (
            <p className={message.type === "error" ? "error" : "success"}>{message.text}</p>
          )}
          <button type="submit" disabled={loading} className="auth-button">
            {loading ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? (
            <>
              Already have an account?{" "}
              <button type="button" onClick={() => setIsRegister(false)} className="auth-link">
                Sign in
              </button>
            </>
          ) : (
            <>
              No account yet?{" "}
              <button type="button" onClick={() => setIsRegister(true)} className="auth-link">
                Create account
              </button>
            </>
          )}
        </p>
      </div>
      <p className="muted auth-footer">
        <Link href="/">Back to dashboard</Link>
      </p>
    </main>
  );
}
