"use client";

import { useState } from "react";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";

export default function RegistrazionePage() {
  const [form, setForm] = useState({ nome: "", cognome: "", telefono: "", email: "", password: "", conferma: "", privacy: false, termini: false, maggiorenne: false, marketing: false });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  async function submit(e) {
    e.preventDefault(); setMessage("");
    if (!form.privacy || !form.termini || !form.maggiorenne) return setMessage("Completa tutte le accettazioni obbligatorie.");
    if (form.password.length < 8) return setMessage("La password deve contenere almeno 8 caratteri.");
    if (form.password !== form.conferma) return setMessage("Le password non coincidono.");
    if (!isSupabaseConfigured) return setMessage("Supabase non è ancora configurato nelle variabili d’ambiente di Vercel.");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          nome: form.nome.trim(), cognome: form.cognome.trim(), telefono: form.telefono.trim(),
          stato: "IN_ATTESA", privacy_version: "1.0", terms_version: "1.0",
          legal_accepted_at: new Date().toISOString(), marketing_consent: form.marketing
        }
      }
    });
    setLoading(false);
    setMessage(error ? error.message : "Registrazione completata. Controlla la posta elettronica per confermare l’indirizzo. Dopo la verifica, il salone dovrà approvare il tuo account.");
  }

  return <main className="auth-shell"><section className="auth-card">
    <a className="auth-logo" href="/"><span className="logo-mark">HB</span><span>HairBook</span></a>
    <p className="auth-kicker">Nuovo cliente</p><h1>Crea il tuo account</h1>
    <p className="auth-intro">Dopo la verifica dell’email, la richiesta sarà esaminata dal salone.</p>
    <form onSubmit={submit} className="auth-form">
      <div className="form-grid"><label>Nome *<input name="nome" value={form.nome} onChange={change} required autoComplete="given-name" /></label><label>Cognome *<input name="cognome" value={form.cognome} onChange={change} required autoComplete="family-name" /></label></div>
      <label>Telefono *<input name="telefono" type="tel" value={form.telefono} onChange={change} required autoComplete="tel" /></label>
      <label>Email *<input name="email" type="email" value={form.email} onChange={change} required autoComplete="email" /></label>
      <div className="form-grid"><label>Password *<input name="password" type="password" value={form.password} onChange={change} required minLength="8" autoComplete="new-password" /></label><label>Conferma password *<input name="conferma" type="password" value={form.conferma} onChange={change} required minLength="8" autoComplete="new-password" /></label></div>
      <div className="legal-box">
        <label className="check-row"><input type="checkbox" name="privacy" checked={form.privacy} onChange={change} required /><span>Ho letto l’<a href="/privacy" target="_blank">Informativa privacy</a>. *</span></label>
        <label className="check-row"><input type="checkbox" name="termini" checked={form.termini} onChange={change} required /><span>Accetto i <a href="/termini" target="_blank">Termini e condizioni</a>. *</span></label>
        <label className="check-row"><input type="checkbox" name="maggiorenne" checked={form.maggiorenne} onChange={change} required /><span>Dichiaro di avere almeno 18 anni. *</span></label>
        <label className="check-row"><input type="checkbox" name="marketing" checked={form.marketing} onChange={change} /><span>Acconsento a ricevere promozioni e comunicazioni commerciali. Facoltativo.</span></label>
      </div>
      {message && <p className="form-message" role="status">{message}</p>}
      <button className="button button-primary button-large full" disabled={loading}>{loading ? "Registrazione..." : "Crea account"}</button>
    </form>
    <p className="auth-switch">Hai già un account? <a href="/login">Accedi</a></p>
  </section></main>;
}
