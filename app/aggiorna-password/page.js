"use client";

import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";

export default function AggiornaPassword() {
  const [password, setPassword] = useState("");
  const [conferma, setConferma] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase non è configurato.");
      setCheckingSession(false);
      return;
    }

    let mounted = true;

    async function prepareRecoverySession() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        // Supporto per eventuale flusso PKCE (?code=...).
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        // Supporto esplicito per il flusso implicito (#access_token=...).
        const hash = new URLSearchParams(
          window.location.hash.startsWith("#")
            ? window.location.hash.slice(1)
            : window.location.hash
        );
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (mounted) {
          setSessionReady(Boolean(data.session));
          setCheckingSession(false);
          if (!data.session) {
            setMessage(
              "Il collegamento non contiene una sessione valida. Richiedi una nuova email di recupero e apri soltanto l’ultimo collegamento ricevuto."
            );
          }
        }

        if (data.session) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (error) {
        if (mounted) {
          setSessionReady(false);
          setCheckingSession(false);
          setMessage(error?.message || "Impossibile verificare il collegamento di recupero.");
        }
      }
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          if (session) {
            setSessionReady(true);
            setCheckingSession(false);
            setMessage("");
          }
        }
      }
    );

    prepareRecoverySession();

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function submit(event) {
    event.preventDefault();
    setMessage("");

    if (password.length < 8) {
      setMessage("La password deve contenere almeno 8 caratteri.");
      return;
    }

    if (password !== conferma) {
      setMessage("Le password non coincidono.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase non è configurato.");
      return;
    }

    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setLoading(false);
      setSessionReady(false);
      setMessage("Il collegamento non è valido o è scaduto. Richiedine uno nuovo.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setLoading(false);
      setMessage(error.message || "Non è stato possibile aggiornare la password.");
      return;
    }

    await supabase.auth.signOut();
    setLoading(false);
    setMessage("Password aggiornata correttamente. Reindirizzamento alla pagina di accesso...");
    window.setTimeout(() => {
      window.location.href = "/login";
    }, 1800);
  }

  return (
    <main className="auth-shell">
      <section className="auth-card auth-card-small">
        <a className="auth-logo" href="/">
          <span className="logo-mark">HB</span>
          <span>HairBook</span>
        </a>

        <p className="auth-kicker">Sicurezza account</p>
        <h1>Imposta una nuova password</h1>

        {checkingSession && (
          <p className="form-message" role="status">
            Verifica del collegamento in corso...
          </p>
        )}

        <form onSubmit={submit} className="auth-form">
          <label>
            Nuova password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength="8"
              required
              autoComplete="new-password"
              disabled={!sessionReady || loading}
            />
          </label>

          <label>
            Conferma password
            <input
              type="password"
              value={conferma}
              onChange={(event) => setConferma(event.target.value)}
              minLength="8"
              required
              autoComplete="new-password"
              disabled={!sessionReady || loading}
            />
          </label>

          {message && (
            <p className="form-message" role="status">
              {message}
            </p>
          )}

          <button
            className="button button-primary button-large full"
            disabled={!sessionReady || loading || checkingSession}
          >
            {loading ? "Aggiornamento..." : "Aggiorna password"}
          </button>
        </form>

        {!sessionReady && !checkingSession && (
          <p className="auth-switch">
            <a href="/password-dimenticata">Richiedi un nuovo collegamento</a>
          </p>
        )}
      </section>
    </main>
  );
}
