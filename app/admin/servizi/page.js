"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase, isSupabaseConfigured } from "../../../lib/supabase";

const emptyForm = {
  nome: "",
  descrizione: "",
  durata: "30",
  prezzo: "",
  attivo: true,
};

export default function AdminServiziPage() {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState("TUTTI");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allowed, setAllowed] = useState(false);

  async function loadServices() {
    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase non è configurato.");
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      window.location.href = "/login";
      return;
    }

    const { data: me } = await supabase
      .from("profiles")
      .select("ruolo, stato")
      .eq("id", userData.user.id)
      .single();

    if (me?.ruolo !== "PROPRIETARIO" || me?.stato !== "APPROVATO") {
      setAllowed(false);
      setMessage("Accesso riservato al proprietario.");
      setLoading(false);
      return;
    }

    setAllowed(true);
    const { data, error } = await supabase
      .from("services")
      .select("id, nome, descrizione, durata_minuti, prezzo, attivo, ordine")
      .order("ordine", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      setMessageType("error");
      setMessage(error.message);
    }

    setServices(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadServices();
  }, []);

  function change(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function edit(service) {
    setEditingId(service.id);
    setForm({
      nome: service.nome,
      descrizione: service.descrizione || "",
      durata: String(service.durata_minuti),
      prezzo: Number(service.prezzo).toFixed(2),
      attivo: service.attivo,
    });
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
  }

  async function save(event) {
    event.preventDefault();
    setMessage("");
    setMessageType("");

    const duration = Number(form.durata);
    const price = Number(String(form.prezzo).replace(",", "."));

    if (form.nome.trim().length < 2) {
      setMessageType("error");
      setMessage("Inserisci il nome del servizio.");
      return;
    }
    if (!Number.isInteger(duration) || duration < 5 || duration > 480) {
      setMessageType("error");
      setMessage("La durata deve essere un numero intero compreso tra 5 e 480 minuti.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setMessageType("error");
      setMessage("Inserisci un prezzo valido.");
      return;
    }

    setSaving(true);
    const rpcName = editingId ? "owner_update_service" : "owner_create_service";
    const parameters = editingId
      ? {
          service_id: editingId,
          service_name: form.nome,
          service_description: form.descrizione,
          service_duration: duration,
          service_price: price,
          service_active: form.attivo,
        }
      : {
          service_name: form.nome,
          service_description: form.descrizione,
          service_duration: duration,
          service_price: price,
          service_active: form.attivo,
        };

    const { error } = await supabase.rpc(rpcName, parameters);
    setSaving(false);

    if (error) {
      setMessageType("error");
      setMessage(error.message);
      return;
    }

    setMessageType("success");
    setMessage(editingId ? "Servizio aggiornato correttamente." : "Servizio creato correttamente.");
    setEditingId(null);
    setForm(emptyForm);
    await loadServices();
  }

  async function toggle(service) {
    setMessage("");
    const { error } = await supabase.rpc("owner_toggle_service", {
      service_id: service.id,
      service_active: !service.attivo,
    });

    if (error) {
      setMessageType("error");
      setMessage(error.message);
      return;
    }

    setMessageType("success");
    setMessage(service.attivo ? "Servizio disattivato." : "Servizio riattivato.");
    await loadServices();
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const visibleServices = useMemo(() => {
    if (filter === "ATTIVI") return services.filter((service) => service.attivo);
    if (filter === "DISATTIVATI") return services.filter((service) => !service.attivo);
    return services;
  }, [services, filter]);

  if (loading) {
    return <main className="services-shell"><p>Caricamento servizi...</p></main>;
  }

  if (!allowed) {
    return (
      <main className="services-shell">
        <section className="services-panel services-empty">
          <h1>Accesso negato</h1>
          <p>{message}</p>
          <a className="button button-primary" href="/">Torna alla home</a>
        </section>
      </main>
    );
  }

  return (
    <main className="services-shell">
      <div className="services-panel">
        <header className="services-topbar">
          <div>
            <p className="auth-kicker">Area proprietario</p>
            <h1>Gestione servizi</h1>
          </div>
          <nav className="services-nav">
            <a className="button button-secondary" href="/admin/clienti">Clienti</a>
            <a className="button button-primary" href="/admin/servizi">Servizi</a>
            <a className="button button-secondary" href="/admin/orari">Orari</a>
            <a className="button button-secondary" href="/">Home</a>
            <button className="button button-dark" type="button" onClick={logout}>Esci</button>
          </nav>
        </header>

        <section className="service-editor">
          <div className="service-editor-heading">
            <div>
              <p className="auth-kicker">{editingId ? "Modifica" : "Nuovo servizio"}</p>
              <h2>{editingId ? "Aggiorna il servizio" : "Crea una lavorazione"}</h2>
            </div>
            {editingId && (
              <button className="button button-secondary" type="button" onClick={cancelEdit}>Annulla modifica</button>
            )}
          </div>

          <form className="service-form" onSubmit={save}>
            <label>
              Nome servizio *
              <input name="nome" value={form.nome} onChange={change} placeholder="Es. Shampoo e taglio" required />
            </label>

            <label className="service-form-wide">
              Descrizione
              <textarea name="descrizione" value={form.descrizione} onChange={change} rows="3" placeholder="Descrizione breve del trattamento" />
            </label>

            <label>
              Durata in minuti *
              <input name="durata" type="number" min="5" max="480" step="5" value={form.durata} onChange={change} required />
            </label>

            <label>
              Prezzo in euro *
              <input name="prezzo" type="number" min="0" step="0.01" value={form.prezzo} onChange={change} placeholder="25.00" required />
            </label>

            <label className="service-active-check">
              <input name="attivo" type="checkbox" checked={form.attivo} onChange={change} />
              <span>Servizio attivo e prenotabile</span>
            </label>

            <button className="button button-primary button-large" disabled={saving}>
              {saving ? "Salvataggio..." : editingId ? "Salva modifiche" : "Crea servizio"}
            </button>
          </form>

          {message && (
            <p className={`form-message form-message-${messageType}`} role="status">{message}</p>
          )}
        </section>

        <section className="services-list-section">
          <div className="services-list-heading">
            <div>
              <p className="auth-kicker">Catalogo</p>
              <h2>{services.length} servizi configurati</h2>
            </div>
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="TUTTI">Tutti</option>
              <option value="ATTIVI">Attivi</option>
              <option value="DISATTIVATI">Disattivati</option>
            </select>
          </div>

          <div className="services-list">
            {visibleServices.map((service) => (
              <article className={`managed-service-card ${service.attivo ? "" : "managed-service-disabled"}`} key={service.id}>
                <div className="managed-service-main">
                  <span className="managed-service-icon">✂</span>
                  <div>
                    <h3>{service.nome}</h3>
                    <p>{service.descrizione || "Nessuna descrizione"}</p>
                    <div className="managed-service-tags">
                      <span>{service.durata_minuti} minuti</span>
                      <span>€ {Number(service.prezzo).toFixed(2)}</span>
                      <span className={service.attivo ? "tag-active" : "tag-disabled"}>{service.attivo ? "ATTIVO" : "DISATTIVATO"}</span>
                    </div>
                  </div>
                </div>
                <div className="managed-service-actions">
                  <button type="button" onClick={() => edit(service)}>Modifica</button>
                  <button type="button" onClick={() => toggle(service)}>{service.attivo ? "Disattiva" : "Riattiva"}</button>
                </div>
              </article>
            ))}

            {!visibleServices.length && (
              <div className="services-empty">Nessun servizio corrisponde al filtro selezionato.</div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
