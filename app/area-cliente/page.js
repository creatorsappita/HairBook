"use client";

import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";

export default function AreaClientePage() {
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      if (!isSupabaseConfigured || !supabase) {
        setMessage("Supabase non è configurato.");
        setLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        window.location.href = "/login";
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("nome, cognome, telefono, email, ruolo, stato, created_at")
        .eq("id", userData.user.id)
        .single();

      if (error || !data) {
        setMessage("Non è stato possibile caricare il profilo.");
        setLoading(false);
        return;
      }

      if (data.ruolo === "PROPRIETARIO") {
        window.location.href = "/admin/clienti";
        return;
      }

      if (data.ruolo === "OPERATORE") {
        window.location.href = "/operatore";
        return;
      }

      setEmail(data.email || userData.user.email || "");
      setProfile(data);
      setLoading(false);
    }

    loadProfile();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) {
    return (
      <main className="customer-shell">
        <div className="customer-loading">Caricamento area cliente...</div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="customer-shell">
        <section className="customer-panel customer-message-panel">
          <h1>Profilo non disponibile</h1>
          <p>{message}</p>
          <a className="button button-primary" href="/login">Torna al login</a>
        </section>
      </main>
    );
  }

  const approved = profile.stato === "APPROVATO";
  const statusText = {
    IN_ATTESA: "Il salone deve ancora approvare la tua registrazione.",
    RIFIUTATO: "La richiesta di registrazione non è stata approvata. Contatta il salone.",
    BLOCCATO: "L’account è stato bloccato. Contatta il salone per assistenza.",
    APPROVATO: "Il tuo account è approvato e può effettuare prenotazioni.",
  }[profile.stato] || "Stato account non disponibile.";

  return (
    <main className="customer-shell">
      <div className="customer-panel">
        <header className="customer-header">
          <a className="auth-logo" href="/">
            <span className="logo-mark">HB</span>
            <span>HairBook</span>
          </a>

          <div className="customer-header-actions">
            <a className="button button-secondary" href="/">Home</a>
            <button className="button button-dark" type="button" onClick={logout}>Esci</button>
          </div>
        </header>

        <section className="customer-welcome">
          <div>
            <p className="auth-kicker">Area cliente</p>
            <h1>Ciao, {profile.nome || "cliente"}.</h1>
            <p>Da qui potrai prenotare i servizi e controllare i tuoi appuntamenti.</p>
          </div>

          <div className={`customer-status customer-status-${profile.stato.toLowerCase()}`}>
            <strong>{profile.stato.replaceAll("_", " ")}</strong>
            <span>{statusText}</span>
          </div>
        </section>

        <section className="customer-grid">
          <article className="customer-card customer-card-primary">
            <span className="customer-card-icon">✂</span>
            <h2>Prenota un appuntamento</h2>
            <p>Scegli servizio, data e uno degli orari realmente disponibili.</p>
            {approved ? (
              <a className="button button-primary button-large" href="/prenota">Prenota ora</a>
            ) : (
              <button className="button button-primary button-large" type="button" disabled>
                Prenotazioni non disponibili
              </button>
            )}
          </article>

          <article className="customer-card">
            <span className="customer-card-icon">◷</span>
            <h2>Prossimi appuntamenti</h2>
            <p>Non ci sono ancora appuntamenti programmati.</p>
            <span className="customer-placeholder">L’agenda sarà collegata nel prossimo passaggio.</span>
          </article>

          <article className="customer-card">
            <span className="customer-card-icon">✓</span>
            <h2>Storico</h2>
            <p>Qui troverai i servizi completati e gli appuntamenti annullati.</p>
            <span className="customer-placeholder">Nessun appuntamento presente.</span>
          </article>
        </section>

        <section className="customer-profile-card">
          <div>
            <p className="auth-kicker">Il tuo profilo</p>
            <h2>{profile.nome} {profile.cognome}</h2>
          </div>

          <dl className="customer-profile-data">
            <div><dt>Email</dt><dd>{email}</dd></div>
            <div><dt>Telefono</dt><dd>{profile.telefono || "Non indicato"}</dd></div>
            <div><dt>Ruolo</dt><dd>{profile.ruolo}</dd></div>
            <div><dt>Stato</dt><dd>{profile.stato.replaceAll("_", " ")}</dd></div>
          </dl>
        </section>
      </div>
    </main>
  );
}
