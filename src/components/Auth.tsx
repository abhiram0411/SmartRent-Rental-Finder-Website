import { useState } from "react";
import { supabase } from "../lib/api";
import { Modal } from "./Modal";
export function Auth({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [signup, setSignup] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <Modal
      title={signup ? "Make yourself at home." : "Welcome back."}
      onClose={onClose}
    >
      {!supabase ? (
        <div className="empty">
          <p>
            Live accounts are not connected yet. You can explore the demo homes
            while deployment is being prepared.
          </p>
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!supabase) return;
            setBusy(true);
            setMessage("");
            const form = new FormData(e.currentTarget);
            const credentials = {
              email: String(form.get("email")),
              password: String(form.get("password")),
            };
            try {
              const { data, error } = signup
                ? await supabase.auth.signUp(credentials)
                : await supabase.auth.signInWithPassword(credentials);
              if (error) throw error;
              if (data.session) onSuccess();
              else
                setMessage(
                  "Check your email to confirm your account. Email delivery depends on the project configuration.",
                );
            } catch (err) {
              setMessage((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <p>Save places you love and start a conversation.</p>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              minLength={12}
              maxLength={128}
              autoComplete={signup ? "new-password" : "current-password"}
              required
            />
          </label>
          {message && <p role="status">{message}</p>}
          <button className="primary" disabled={busy}>
            {busy ? "Please wait…" : signup ? "Create account" : "Sign in"}
          </button>
          <button
            type="button"
            className="clear"
            onClick={() => {
              setSignup(!signup);
              setMessage("");
            }}
          >
            {signup
              ? "Already have an account? Sign in"
              : "New here? Create an account"}
          </button>
        </form>
      )}
    </Modal>
  );
}
