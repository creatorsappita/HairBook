"use client";

import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const hash = window.location.hash;
    const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const hasConfirmationSession = params.has("access_token") && params.has("refresh_token");

    if (hasConfirmationSession) {
      setMessageType("success");
      setMessage(
        "Email confermata correttamente. Il tuo account è stato verificato ed è ora in attesa di approvazione da parte del salone."
      );

      window.history.replaceState(
        {},
        document.title,
        `${window.location.pathname}${window.location.search}`
      );
    }
  }, []);

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    setMessageType("");

    if (!isSupabaseConfigured || !supabase) {
      setMessageType("error");
      setMessage("Supabase non è ancora configurato.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      setMessageType("error");
      setMessage("Credenziali non valide o indirizzo email non ancora confermato.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stato")
      .eq("id", data.user.id)
      .single();

    setLoading(false);

    if (profileError) {
      setMessageType("error");
      setMessage("Accesso eseguito, ma non è stato possibile verificare lo stato del profilo.");
      return;
    }

    if (profile.stato === "IN_ATTESA") {
      setMessageType("info");
      setMessage("Email verificata. Il tuo account è ancora in attesa di approvazione da parte del salone.");
      return;
    }

    if (profile.stato === "RIFIUTATO") {
      setMessageType("error");
      setMessage("La richiesta di registrazione non è stata approvata. Contatta il salone per maggiori informazioni.");
      return;
    }

    if (profile.stato === "BLOCCATO") {
      setMessageType("error");
      setMessage("Questo account è stato bloccato. Contatta il salone per assistenza.");
      return;
    }

    window.location.href = "/";
  }

  return (
    <main className="auth-shell">
      <section className="auth-card auth-card-small">
        <a className="auth-logo" href="/">
          <span className="logo-mark">HB</span>
          <span>HairBook</span>
        </a>

        <p className="auth-kicker">Area riservata</p>
        <h1>Accedi</h1>

        {message && (
          <p
            className={`form-message ${messageType ? `form-message-${messageType}` : ""}`}
            role="status"
          >
            {message}
          </p>
        )}

        <form onSubmit={submit} className="auth-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
          </label>

          <a className="forgot-link" href="/password-dimenticata">
            Password dimenticata?
          </a>

          <button
            className="button button-primary button-large full"
            disabled={loading}
          >
            {loading ? "Accesso..." : "Accedi"}
          </button>
        </form>

        <p className="auth-switch">
          Non hai un account? <a href="/registrazione">Registrati</a>
        </p>
      </section>
    </main>
  );
}
