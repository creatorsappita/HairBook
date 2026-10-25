"use client";

import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export default function AuthHeader() {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    async function loadAccount() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setAccount(null);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("nome, cognome, ruolo, stato")
        .eq("id", session.user.id)
        .single();

      setAccount(profile ? { ...profile, email: session.user.email } : null);
      setLoading(false);
    }

    loadAccount();
    const { data: listener } = supabase.auth.onAuthStateChange(() => loadAccount());
    return () => listener.subscription.unsubscribe();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  function destination() {
    if (account?.ruolo === "PROPRIETARIO") return "/admin/clienti";
    if (account?.ruolo === "OPERATORE") return "/operatore";
    return "/area-cliente";
  }

  function areaLabel() {
    if (account?.ruolo === "PROPRIETARIO") return "Dashboard";
    if (account?.ruolo === "OPERATORE") return "Agenda";
    return "Area personale";
  }

  return (
    <header className="header">
      <a className="logo" href="/">
        <span className="logo-mark">HB</span>
        <span>HairBook</span>
      </a>

      <nav className="navigation">
        <a href="/#come-funziona">Come funziona</a>
        <a href="/#servizi">Servizi</a>
        <a href="/#parrucchieri">Per i parrucchieri</a>
      </nav>

      <div className="header-actions">
        {loading ? (
          <span className="user-badge">Caricamento...</span>
        ) : account ? (
          <>
            <span className="user-badge">
              {account.nome || account.email}
              <small>{account.ruolo}</small>
            </span>
            <a className="button button-primary" href={destination()}>{areaLabel()}</a>
            <button className="button button-secondary" type="button" onClick={logout}>Esci</button>
          </>
        ) : (
          <>
            <a className="button button-secondary" href="/login">Accedi</a>
            <a className="button button-primary" href="/registrazione">Registrati</a>
          </>
        )}
      </div>
    </header>
  );
}
