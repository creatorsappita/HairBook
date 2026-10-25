"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase, isSupabaseConfigured } from "../../../lib/supabase";

const STATES = ["TUTTI", "IN_ATTESA", "APPROVATO", "RIFIUTATO", "BLOCCATO"];

export default function AdminClientiPage() {
  const [profiles, setProfiles] = useState([]);
  const [filter, setFilter] = useState("IN_ATTESA");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  async function load() {
    if (!isSupabaseConfigured || !supabase) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/login"; return; }

    const { data: me } = await supabase
      .from("profiles").select("ruolo, stato").eq("id", user.id).single();
    if (me?.ruolo !== "PROPRIETARIO" || me?.stato !== "APPROVATO") {
      setMessage("Accesso riservato al proprietario.");
      setLoading(false);
      return;
    }

    setAllowed(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, nome, cognome, email, telefono, ruolo, stato, created_at")
      .order("created_at", { ascending: false });
    setProfiles(data || []);
    if (error) setMessage(error.message);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function setStatus(id, stato) {
    setMessage("");
    const { error } = await supabase.rpc("owner_set_profile_status", {
      target_id: id,
      new_status: stato,
    });
    if (error) return setMessage(error.message);
    setMessage(`Stato aggiornato: ${stato}.`);
    await load();
  }

  async function setRole(id, ruolo) {
    setMessage("");
    const { error } = await supabase.rpc("owner_set_profile_role", {
      target_id: id,
      new_role: ruolo,
    });
    if (error) return setMessage(error.message);
    setMessage(`Ruolo aggiornato: ${ruolo}.`);
    await load();
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const visible = useMemo(() => profiles.filter((p) => {
    const statusOk = filter === "TUTTI" || p.stato === filter;
    const q = search.trim().toLowerCase();
    const text = `${p.nome} ${p.cognome} ${p.email} ${p.telefono}`.toLowerCase();
    return statusOk && (!q || text.includes(q));
  }), [profiles, filter, search]);

  if (loading) return <main className="admin-shell"><p>Caricamento...</p></main>;
  if (!allowed) return <main className="admin-shell"><div className="admin-panel"><h1>Accesso negato</h1><p>{message}</p><a href="/">Torna alla home</a></div></main>;

  return <main className="admin-shell">
    <div className="admin-panel">
      <div className="admin-topbar">
        <div><p className="auth-kicker">Area proprietario</p><h1>Gestione clienti</h1></div>
       <div className="admin-actions">
  <a className="button button-secondary" href="/admin/clienti">Clienti</a>
  <a className="button button-primary" href="/admin/servizi">Servizi</a>
  <a className="button button-secondary" href="/admin/orari">Orari</a>  
  <a className="button button-secondary" href="/">Home</a>
  <button className="button button-dark" onClick={logout}>Esci</button>
</div>
      </div>

      <div className="admin-summary">
        <div><strong>{profiles.length}</strong><span>Profili totali</span></div>
        <div><strong>{profiles.filter(p => p.stato === "IN_ATTESA").length}</strong><span>In attesa</span></div>
        <div><strong>{profiles.filter(p => p.stato === "APPROVATO").length}</strong><span>Approvati</span></div>
      </div>

      <div className="admin-filters">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca nome, email o telefono" />
        <select value={filter} onChange={e => setFilter(e.target.value)}>{STATES.map(s => <option key={s}>{s}</option>)}</select>
      </div>

      {message && <p className="form-message" role="status">{message}</p>}

      <div className="client-list">
        {visible.map(p => <article className="client-card" key={p.id}>
          <div className="client-main"><h2>{p.nome} {p.cognome}</h2><p>{p.email || "Email non disponibile"} · {p.telefono}</p><div className="client-tags"><span>{p.ruolo}</span><span className={`status-${p.stato.toLowerCase()}`}>{p.stato}</span></div></div>
          <div className="client-controls">
            {p.ruolo !== "PROPRIETARIO" && <select value={p.ruolo} onChange={e => setRole(p.id, e.target.value)}><option>CLIENTE</option><option>OPERATORE</option></select>}
            {p.ruolo !== "PROPRIETARIO" && <>
              <button onClick={() => setStatus(p.id, "APPROVATO")}>Approva</button>
              <button onClick={() => setStatus(p.id, "RIFIUTATO")}>Rifiuta</button>
              <button onClick={() => setStatus(p.id, "BLOCCATO")}>Blocca</button>
            </>}
          </div>
        </article>)}
        {!visible.length && <p>Nessun profilo corrispondente ai filtri.</p>}
      </div>
    </div>
  </main>;
}
