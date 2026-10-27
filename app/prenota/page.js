"use client";
import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";

export default function PrenotaPage() {
  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [selected, setSelected] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [maxDate, setMaxDate] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    if (!isSupabaseConfigured || !supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { location.href = "/login"; return; }
    const { data: profile } = await supabase.from("profiles").select("ruolo,stato").eq("id", user.id).single();
    if (profile?.ruolo !== "CLIENTE" || profile?.stato !== "APPROVATO") { location.href = "/area-cliente"; return; }
    const [{ data: serviceRows }, { data: settings }] = await Promise.all([
      supabase.from("services").select("id,nome,descrizione,durata_minuti,prezzo").eq("attivo", true).order("ordine"),
      supabase.from("booking_settings").select("maximum_booking_days").eq("id", 1).single(),
    ]);
    setServices(serviceRows || []);
    if (serviceRows?.length) setServiceId(serviceRows[0].id);
    const today = new Date();
    setDate(today.toISOString().slice(0, 10));
    const maximum = new Date(today);
    maximum.setDate(maximum.getDate() + (settings?.maximum_booking_days || 60));
    setMaxDate(maximum.toISOString().slice(0, 10));
    setLoading(false);
  }

  useEffect(() => { if (serviceId && date) loadSlots(); }, [serviceId, date]);

  async function loadSlots() {
    setSelected("");
    setMessage("");
    const { data, error } = await supabase.rpc("get_available_slots", { p_date: date, p_service_id: serviceId });
    if (error) { setMessage(error.message); setSlots([]); }
    else setSlots((data || []).map((row) => row.slot_start.slice(0, 5)));
  }

  async function sendConfirmationEmail() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Sessione non disponibile");

    const response = await fetch("/api/email/booking-confirmation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ bookingDate: date, startTime: selected }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Invio email non riuscito");
    return result;
  }

  async function book() {
    if (!selected) return setMessage("Seleziona un orario.");
    setSaving(true);
    setMessage("");

    const { error } = await supabase.rpc("client_create_booking", {
      p_service_id: serviceId,
      p_date: date,
      p_start_time: selected,
      p_notes: notes,
    });

    if (error) {
      setSaving(false);
      setMessage(error.message);
      await loadSlots();
      return;
    }

    let emailSent = false;
    try {
      const emailResult = await sendConfirmationEmail();
      emailSent = Boolean(emailResult.sent);
    } catch (emailError) {
      console.error("Prenotazione creata, ma email non inviata:", emailError);
    }

    setSaving(false);
    setMessage(emailSent
      ? "Prenotazione confermata. Ti abbiamo inviato l’email con il file da aggiungere al calendario."
      : "Prenotazione confermata. L’email calendario non è stata inviata, ma l’appuntamento è salvato correttamente."
    );
    setSelected("");
    setNotes("");
    await loadSlots();
    setTimeout(() => { location.href = "/area-cliente"; }, 2200);
  }

  if (loading) return <main className="booking-shell"><p>Caricamento...</p></main>;
  const service = services.find((item) => item.id === serviceId);

  return <main className="booking-shell"><div className="booking-panel"><header className="booking-top"><div><p className="auth-kicker">Area cliente</p><h1>Prenota appuntamento</h1></div><div><a className="button button-secondary" href="/area-cliente">Area cliente</a><a className="button button-secondary" href="/">Home</a></div></header>
    <section className="booking-steps"><div className="booking-box"><h2>1. Scegli il servizio</h2><div className="booking-services">{services.map((item) => <button className={serviceId === item.id ? "selected" : ""} onClick={() => setServiceId(item.id)} key={item.id}><strong>{item.nome}</strong><span>{item.durata_minuti} min · € {Number(item.prezzo).toFixed(2)}</span><small>{item.descrizione}</small></button>)}</div></div>
    <div className="booking-box"><h2>2. Scegli la data</h2><input className="booking-date" type="date" min={new Date().toISOString().slice(0, 10)} max={maxDate} value={date} onChange={(event) => setDate(event.target.value)} /><h2>3. Scegli l’orario</h2><div className="booking-slots">{slots.map((time) => <button className={selected === time ? "selected" : ""} onClick={() => setSelected(time)} key={time}>{time}</button>)}{!slots.length && <p>Nessun orario disponibile per questa data.</p>}</div></div>
    <div className="booking-box booking-confirm"><h2>4. Conferma</h2>{service && <p><strong>{service.nome}</strong><br />{date || "Data non scelta"} {selected && `alle ${selected}`}<br />€ {Number(service.prezzo).toFixed(2)}</p>}<label>Note facoltative<textarea rows="3" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Esigenze o comunicazioni per il salone" /></label>{message && <p className="form-message">{message}</p>}<button className="button button-primary button-large" onClick={book} disabled={saving || !selected}>{saving ? "Prenotazione e invio email..." : "Conferma prenotazione"}</button></div></section>
  </div></main>;
}
