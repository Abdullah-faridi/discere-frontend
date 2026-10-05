import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { api, json } from "../services/api";
import { AuthResponse } from "../types/auth";

export default function AuthDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (auth: AuthResponse) => void | Promise<void>;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
  });
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      let auth: AuthResponse;
      if (mode === "signup") {
        const signup = await api<AuthResponse | { user: AuthResponse["user"] }>("/auth/signup", json(form));
        auth = "accessToken" in signup
          ? signup
          : await api<AuthResponse>("/auth/signin", json({ email: form.email, password: form.password }));
      } else {
        auth = await api<AuthResponse>("/auth/signin", json({ email: form.email, password: form.password }));
      }
      await onSuccess(auth);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="scrim"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section className="auth-dialog panel">
        <button
          className="icon-button dialog-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <div className="brand-mark brand-mark-large">D</div>
        <p className="eyebrow">A place to think together</p>
        <h2>{mode === "signin" ? "Welcome back" : "Join the conversation"}</h2>
        <p className="muted">
          Learn out loud. Build understanding with people who are curious too.
        </p>
        <form onSubmit={submit} className="form-stack">
          {mode === "signup" && (
            <>
              <label>
                Full name
                <input
                  required
                  maxLength={120}
                  value={form.fullName}
                  onChange={(e) =>
                    setForm({ ...form, fullName: e.target.value })
                  }
                />
              </label>
              <label>
                Username
                <input
                  required
                  minLength={3}
                  maxLength={30}
                  value={form.username}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value })
                  }
                />
              </label>
            </>
          )}
          <label>
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              minLength={mode === "signup" ? 10 : undefined}
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="button button-primary button-wide" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>
        <button
          className="text-button auth-switch"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError("");
          }}
        >
          {mode === "signin"
            ? "New to Discere? Create an account"
            : "Already have an account? Sign in"}
        </button>
      </section>
    </div>
  );
}

