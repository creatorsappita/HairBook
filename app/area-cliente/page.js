"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";

const STATUS_LABELS = {
  CONFERMATO: "Confermato",
  COMPLETATO: "Completato",
  ANNULLATO: "Annullato",
  ASSENTE: "Assente",
};

function formatDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function bookingTimestamp(booking) {
  return new Date(`${booking.booking_date}T${booking.start_time}`);
}

export default function AreaClientePage() {
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState("");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    loadArea();
  }, []);

  async function loadArea() {
    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase non è configurato.");
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      window.location.href = "/login";
      return;
    }

    const [{ data: profileData, error: profileError }, { data: bookingData, error: bookingError }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("nome, cognome, telefono, email, ruolo, stato, created_at")
          .eq("id", userData.user.id)
          .single(),
        supabase
          .from("bookings")
          .select("id, booking_date, start_time, end_time, service_name, duration_minutes, price, status, notes, created_at")
          .order("booking_date", { ascending: true })
          .order("start_time", { ascending: true }),
      ]);

    if (profileError || !profileData) {
      setMessage("Non è stato possibile caricare il profilo.");
      setLoading(false);
      return;
    }

    if (profileData.ruolo === "PROPRIETARIO") {
      window.location.href = "/admin/clienti";
      return;
    }

    if (profileData.ruolo === "OPERATORE") {
      window.location.href = "/operatore";
      return;
    }

    setEmail(profileData.email || userData.user.email || "");
    setProfile(profileData);
    setBookings(bookingData || []);

    if (bookingError) {
      setMessageType("error");
      setMessage("Profilo caricato, ma non è stato possibile leggere gli appuntamenti.");
    }

    setLoading(false);
  }

  async function cancelBooking(booking) {
    const confirmed = window.confirm(
      `Vuoi annullare ${booking.service_name} del ${formatDate(booking.booking_date)} alle ${booking.start_time.slice(0, 5)}?`
    );

    if (!confirmed) return;

    setCancellingId(booking.id);
    setMessage("");
    setMessageType("");

    const { error } = await supabase.rpc("client_cancel_booking", {
      p_booking_id: booking.id,
    });

    setCancellingId(null);

    if (error) {
      setMessageType("error");
      setMessage(error.message || "Non è stato possibile annullare la prenotazione.");
      return;
    }

    setMessageType("success");
    setMessage("Prenotazione annullata correttamente. Lo slot è tornato disponibile.");
    await loadArea();
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const now = new Date();

  const upcoming = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          booking.status === "CONFERMATO" && bookingTimestamp(booking) > now
      ),
    [bookings]
  );

  const history = useMemo(
    () =>
      bookings
        .filter(
          (booking) =>
            booking.status !== "CONFERMATO" || bookingTimestamp(booking) <= now
        )
        .sort((a, b) => bookingTimestamp(b) - bookingTimestamp(a)),
    [bookings]
  );

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

        {message && (
          <p className={`form-message form-message-${messageType}`} role="status">
            {message}
          </p>
        )}

        <section className="customer-welcome">
          <div>
            <p className="auth-kicker">Area cliente</p>
            <h1>Ciao, {profile.nome || "cliente"}.</h1>
            <p>Prenota i servizi e controlla tutti i tuoi appuntamenti.</p>
          </div>

          <div className={`customer-status customer-status-${profile.stato.toLowerCase()}`}>
            <strong>{profile.stato.replaceAll("_", " ")}</strong>
            <span>{statusText}</span>
          </div>
        </section>

        <section className="customer-grid customer-dashboard-grid">
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

          <article className="customer-card customer-stat-card">
            <span className="customer-card-icon">◷</span>
            <strong>{upcoming.length}</strong>
            <h2>Prossimi appuntamenti</h2>
            <p>{upcoming.length ? "Hai appuntamenti programmati." : "Nessun appuntamento futuro."}</p>
          </article>

          <article className="customer-card customer-stat-card">
            <span className="customer-card-icon">✓</span>
            <strong>{history.length}</strong>
            <h2>Storico</h2>
            <p>Appuntamenti completati, annullati, assenze o già trascorsi.</p>
          </article>
        </section>

        <section className="customer-bookings-section">
          <div className="customer-section-heading">
            <div>
              <p className="auth-kicker">Agenda personale</p>
              <h2>Prossimi appuntamenti</h2>
            </div>
            <a className="button button-primary" href="/prenota">Nuova prenotazione</a>
          </div>

          <div className="customer-bookings-list">
            {upcoming.map((booking) => (
              <article className="customer-booking-card" key={booking.id}>
                <div className="customer-booking-date">
                  <strong>{booking.start_time.slice(0, 5)}</strong>
                  <span>{booking.end_time.slice(0, 5)}</span>
                </div>

                <div className="customer-booking-main">
                  <h3>{booking.service_name}</h3>
                  <p>{formatDate(booking.booking_date)}</p>
                  <div className="customer-booking-tags">
                    <span>{booking.duration_minutes} minuti</span>
                    <span>€ {Number(booking.price).toFixed(2)}</span>
                    <span className="booking-status-confirmed">Confermato</span>
                  </div>
                  {booking.notes && <p className="customer-booking-notes">Nota: {booking.notes}</p>}
                </div>

                <button
                  className="customer-cancel-button"
                  type="button"
                  onClick={() => cancelBooking(booking)}
                  disabled={cancellingId === booking.id}
                >
                  {cancellingId === booking.id ? "Annullamento..." : "Annulla appuntamento"}
                </button>
              </article>
            ))}

            {!upcoming.length && (
              <div className="customer-bookings-empty">
                <strong>Nessun appuntamento programmato.</strong>
                <span>Quando effettuerai una prenotazione comparirà qui.</span>
              </div>
            )}
          </div>
        </section>

        <section className="customer-bookings-section">
          <div className="customer-section-heading">
            <div>
              <p className="auth-kicker">Archivio</p>
              <h2>Storico appuntamenti</h2>
            </div>
          </div>

          <div className="customer-history-list">
            {history.map((booking) => (
              <article className="customer-history-card" key={booking.id}>
                <div>
                  <h3>{booking.service_name}</h3>
                  <p>
                    {formatDate(booking.booking_date)} · {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                  </p>
                </div>
                <div className="customer-history-meta">
                  <strong>€ {Number(booking.price).toFixed(2)}</strong>
                  <span className={`booking-status booking-status-${booking.status.toLowerCase()}`}>
                    {STATUS_LABELS[booking.status] || booking.status}
                  </span>
                </div>
              </article>
            ))}

            {!history.length && (
              <div className="customer-bookings-empty">
                <strong>Lo storico è ancora vuoto.</strong>
                <span>Qui compariranno gli appuntamenti conclusi o annullati.</span>
              </div>
            )}
          </div>
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
