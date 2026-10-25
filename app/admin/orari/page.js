"use client";

import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../../../lib/supabase";

const dayNames = ["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"];
const blankDay = (day) => ({day_of_week:day,is_open:false,morning_open:"09:00",morning_close:"13:00",afternoon_open:"14:00",afternoon_close:"19:00"});

export default function AdminOrariPage(){
  const [days,setDays]=useState(Array.from({length:7},(_,i)=>blankDay(i)));
  const [settings,setSettings]=useState({slot_minutes:15,minimum_notice_minutes:120,maximum_booking_days:60,buffer_minutes:0});
  const [closures,setClosures]=useState([]);
  const [closure,setClosure]=useState({date:"",all_day:true,start_time:"",end_time:"",reason:""});
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(true);
  const [allowed,setAllowed]=useState(false);
  const [saving,setSaving]=useState(false);

  useEffect(()=>{load();},[]);

  async function load(){
    if(!isSupabaseConfigured||!supabase){setMessage("Supabase non è configurato.");setLoading(false);return;}
    setLoading(true);
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href="/login";return;}
    const {data:me}=await supabase.from("profiles").select("ruolo, stato").eq("id",user.id).single();
    if(me?.ruolo!=="PROPRIETARIO"||me?.stato!=="APPROVATO"){setMessage("Accesso riservato al proprietario.");setLoading(false);return;}
    setAllowed(true);
    const [{data:h,error:hErr},{data:s,error:sErr},{data:c,error:cErr}]=await Promise.all([
      supabase.from("working_hours").select("*").order("day_of_week"),
      supabase.from("booking_settings").select("*").eq("id",1).single(),
      supabase.from("closures").select("*").gte("closure_date",new Date().toISOString().slice(0,10)).order("closure_date")
    ]);
    if(h) setDays(Array.from({length:7},(_,i)=>{const row=h.find(x=>x.day_of_week===i);return row?{...row,morning_open:row.morning_open?.slice(0,5)||"09:00",morning_close:row.morning_close?.slice(0,5)||"13:00",afternoon_open:row.afternoon_open?.slice(0,5)||"",afternoon_close:row.afternoon_close?.slice(0,5)||""}:blankDay(i)}));
    if(s) setSettings(s);
    if(c) setClosures(c);
    const error=hErr||sErr||cErr; if(error)setMessage(error.message);
    setLoading(false);
  }

  function changeDay(index,field,value){setDays(current=>current.map((d,i)=>i===index?{...d,[field]:value}:d));}

  async function saveAll(){
    setSaving(true);setMessage("");
    for(const d of days){
      const {error}=await supabase.rpc("owner_save_working_day",{
        p_day:d.day_of_week,p_is_open:d.is_open,
        p_morning_open:d.is_open?d.morning_open:null,p_morning_close:d.is_open?d.morning_close:null,
        p_afternoon_open:d.is_open&&d.afternoon_open?d.afternoon_open:null,p_afternoon_close:d.is_open&&d.afternoon_close?d.afternoon_close:null
      });
      if(error){setSaving(false);setMessage(`${dayNames[d.day_of_week]}: ${error.message}`);return;}
    }
    const {error}=await supabase.rpc("owner_save_booking_settings",{
      p_slot_minutes:Number(settings.slot_minutes),p_minimum_notice_minutes:Number(settings.minimum_notice_minutes),
      p_maximum_booking_days:Number(settings.maximum_booking_days),p_buffer_minutes:Number(settings.buffer_minutes)
    });
    setSaving(false);
    if(error){setMessage(error.message);return;}
    setMessage("Orari e regole di prenotazione salvati correttamente.");
    await load();
  }

  async function addClosure(e){
    e.preventDefault();setMessage("");
    const {error}=await supabase.rpc("owner_add_closure",{
      p_date:closure.date,p_all_day:closure.all_day,p_start_time:closure.all_day?null:closure.start_time,
      p_end_time:closure.all_day?null:closure.end_time,p_reason:closure.reason
    });
    if(error){setMessage(error.message);return;}
    setClosure({date:"",all_day:true,start_time:"",end_time:"",reason:""});
    setMessage("Chiusura aggiunta correttamente.");await load();
  }

  async function removeClosure(id){
    const {error}=await supabase.rpc("owner_delete_closure",{p_id:id});
    if(error){setMessage(error.message);return;} setMessage("Chiusura rimossa.");await load();
  }

  async function logout(){await supabase.auth.signOut();window.location.href="/";}

  if(loading)return <main className="hours-shell"><p>Caricamento orari...</p></main>;
  if(!allowed)return <main className="hours-shell"><section className="hours-panel hours-empty"><h1>Accesso negato</h1><p>{message}</p><a className="button button-primary" href="/">Torna alla home</a></section></main>;

  return <main className="hours-shell"><div className="hours-panel">
    <header className="hours-topbar"><div><p className="auth-kicker">Area proprietario</p><h1>Orari del salone</h1></div><nav className="hours-nav"><a className="button button-secondary" href="/admin/clienti">Clienti</a><a className="button button-secondary" href="/admin/servizi">Servizi</a><a className="button button-primary" href="/admin/orari">Orari</a>
    <a className="button button-secondary" href="/admin/agenda">Agenda</a>
    <a className="button button-secondary" href="/">Home</a><button className="button button-dark" onClick={logout}>Esci</button></nav></header>

    {message&&<p className="form-message" role="status">{message}</p>}

    <section className="hours-section"><div className="hours-heading"><div><p className="auth-kicker">Settimana tipo</p><h2>Apertura e pausa</h2></div><p>Il secondo intervallo è facoltativo e serve per gestire la pausa pranzo.</p></div>
      <div className="week-list">{days.map((d,i)=><article className={`day-row ${d.is_open?"":"day-closed"}`} key={d.day_of_week}>
        <div className="day-name"><strong>{dayNames[d.day_of_week]}</strong><label><input type="checkbox" checked={d.is_open} onChange={e=>changeDay(i,"is_open",e.target.checked)}/><span>{d.is_open?"Aperto":"Chiuso"}</span></label></div>
        <div className="day-times"><label>Apertura<input type="time" value={d.morning_open} disabled={!d.is_open} onChange={e=>changeDay(i,"morning_open",e.target.value)}/></label><label>Chiusura<input type="time" value={d.morning_close} disabled={!d.is_open} onChange={e=>changeDay(i,"morning_close",e.target.value)}/></label><label>Seconda apertura<input type="time" value={d.afternoon_open} disabled={!d.is_open} onChange={e=>changeDay(i,"afternoon_open",e.target.value)}/></label><label>Seconda chiusura<input type="time" value={d.afternoon_close} disabled={!d.is_open} onChange={e=>changeDay(i,"afternoon_close",e.target.value)}/></label></div>
      </article>)}</div>
    </section>

    <section className="hours-section"><div className="hours-heading"><div><p className="auth-kicker">Regole agenda</p><h2>Prenotazioni</h2></div></div><div className="booking-rules">
      <label>Intervallo di partenza degli slot<input type="number" min="5" max="120" step="5" value={settings.slot_minutes} onChange={e=>setSettings({...settings,slot_minutes:e.target.value})}/><small>Es. 15 minuti: 09:00, 09:15, 09:30...</small></label>
      <label>Preavviso minimo in minuti<input type="number" min="0" max="43200" step="15" value={settings.minimum_notice_minutes} onChange={e=>setSettings({...settings,minimum_notice_minutes:e.target.value})}/><small>120 minuti equivalgono a 2 ore.</small></label>
      <label>Giorni massimi prenotabili<input type="number" min="1" max="365" value={settings.maximum_booking_days} onChange={e=>setSettings({...settings,maximum_booking_days:e.target.value})}/><small>Fino a quanti giorni nel futuro.</small></label>
      <label>Pausa tecnica dopo ogni servizio<input type="number" min="0" max="120" step="5" value={settings.buffer_minutes} onChange={e=>setSettings({...settings,buffer_minutes:e.target.value})}/><small>Minuti liberi tra due appuntamenti.</small></label>
    </div><button className="button button-primary button-large" onClick={saveAll} disabled={saving}>{saving?"Salvataggio...":"Salva orari e regole"}</button></section>

    <section className="hours-section"><div className="hours-heading"><div><p className="auth-kicker">Ferie e imprevisti</p><h2>Chiusure straordinarie</h2></div></div>
      <form className="closure-form" onSubmit={addClosure}><label>Data<input type="date" required value={closure.date} min={new Date().toISOString().slice(0,10)} onChange={e=>setClosure({...closure,date:e.target.value})}/></label><label className="closure-check"><input type="checkbox" checked={closure.all_day} onChange={e=>setClosure({...closure,all_day:e.target.checked})}/><span>Intera giornata</span></label>{!closure.all_day&&<><label>Dalle<input type="time" required value={closure.start_time} onChange={e=>setClosure({...closure,start_time:e.target.value})}/></label><label>Alle<input type="time" required value={closure.end_time} onChange={e=>setClosure({...closure,end_time:e.target.value})}/></label></>}<label className="closure-reason">Motivo<input value={closure.reason} onChange={e=>setClosure({...closure,reason:e.target.value})} placeholder="Es. Ferie, festività, corso..."/></label><button className="button button-dark">Aggiungi chiusura</button></form>
      <div className="closures-list">{closures.map(c=><article key={c.id}><div><strong>{new Date(`${c.closure_date}T12:00:00`).toLocaleDateString("it-IT",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}</strong><span>{c.all_day?"Intera giornata":`${c.start_time.slice(0,5)} - ${c.end_time.slice(0,5)}`} {c.reason?`· ${c.reason}`:""}</span></div><button onClick={()=>removeClosure(c.id)}>Rimuovi</button></article>)}{!closures.length&&<div className="hours-empty">Nessuna chiusura futura configurata.</div>}</div>
    </section>
  </div></main>;
}
