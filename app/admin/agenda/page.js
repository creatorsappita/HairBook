"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase, isSupabaseConfigured } from "../../../lib/supabase";

const MONTHS=["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const DAYS=["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];
const STATUS_LABEL={CONFERMATO:"Confermato",COMPLETATO:"Completato",ANNULLATO:"Annullato",ASSENTE:"Assente"};

function isoDate(date){const y=date.getFullYear();const m=String(date.getMonth()+1).padStart(2,"0");const d=String(date.getDate()).padStart(2,"0");return `${y}-${m}-${d}`;}
function fromIso(value){const[y,m,d]=value.split("-").map(Number);return new Date(y,m-1,d,12);}
function startOfWeek(date){const d=new Date(date);const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);return d;}
function addDays(date,n){const d=new Date(date);d.setDate(d.getDate()+n);return d;}
function capital(value){return value.charAt(0).toUpperCase()+value.slice(1);}
function fullDate(date){return capital(date.toLocaleDateString("it-IT",{weekday:"long",day:"2-digit",month:"long",year:"numeric"}));}

export default function AgendaCalendarPage(){
 const[view,setView]=useState("day");
 const[current,setCurrent]=useState(new Date());
 const[bookings,setBookings]=useState([]);
 const[loading,setLoading]=useState(true);
 const[allowed,setAllowed]=useState(false);
 const[message,setMessage]=useState("");
 const[selected,setSelected]=useState(null);

 useEffect(()=>{checkAccess();},[]);
 useEffect(()=>{if(allowed)loadBookings();},[allowed,view,current]);

 async function checkAccess(){
  if(!isSupabaseConfigured||!supabase){setMessage("Supabase non è configurato.");setLoading(false);return;}
  const{data:{user}}=await supabase.auth.getUser();
  if(!user){window.location.href="/login";return;}
  const{data:profile}=await supabase.from("profiles").select("ruolo,stato").eq("id",user.id).single();
  setAllowed(profile?.ruolo==="PROPRIETARIO"&&profile?.stato==="APPROVATO");setLoading(false);
 }

 function range(){
  if(view==="day"){const v=isoDate(current);return[v,v];}
  if(view==="week"){const start=startOfWeek(current);return[isoDate(start),isoDate(addDays(start,6))];}
  const start=new Date(current.getFullYear(),current.getMonth(),1,12);const end=new Date(current.getFullYear(),current.getMonth()+1,0,12);return[isoDate(start),isoDate(end)];
 }

 async function loadBookings(){
  setLoading(true);setMessage("");const[start,end]=range();
  const{data,error}=await supabase.from("bookings").select("id,booking_date,start_time,end_time,service_name,duration_minutes,price,status,notes,profiles!bookings_client_id_fkey(nome,cognome,telefono,email)").gte("booking_date",start).lte("booking_date",end).order("booking_date").order("start_time");
  if(error)setMessage(error.message);else setBookings(data||[]);setLoading(false);
 }

 function move(direction){
  const d=new Date(current);
  if(view==="day")d.setDate(d.getDate()+direction);
  if(view==="week")d.setDate(d.getDate()+7*direction);
  if(view==="month")d.setMonth(d.getMonth()+direction);
  setCurrent(d);setSelected(null);
 }

 async function changeStatus(id,status){
  const{error}=await supabase.rpc("owner_set_booking_status",{p_booking_id:id,p_status:status});
  if(error){setMessage(error.message);return;}setSelected(null);await loadBookings();
 }

 async function logout(){await supabase.auth.signOut();window.location.href="/";}
 const activeBookings=useMemo(()=>bookings.filter(b=>b.status!=="ANNULLATO"),[bookings]);

 if(loading&&!allowed)return <main className="calendar-shell">Caricamento calendario...</main>;
 if(!allowed)return <main className="calendar-shell"><section className="calendar-panel calendar-empty"><h1>Accesso negato</h1><p>Accesso riservato al proprietario.</p><a className="button button-primary" href="/">Torna alla home</a></section></main>;

 return <main className="calendar-shell"><div className="calendar-panel">
  <header className="calendar-topbar"><div><p className="auth-kicker">Area proprietario</p><h1>Calendario appuntamenti</h1></div><nav className="calendar-nav"><a className="button button-secondary" href="/admin/clienti">Clienti</a><a className="button button-secondary" href="/admin/servizi">Servizi</a><a className="button button-secondary" href="/admin/orari">Orari</a><a className="button button-primary" href="/admin/agenda">Agenda</a><a className="button button-secondary" href="/">Home</a><button className="button button-dark" onClick={logout}>Esci</button></nav></header>

  <section className="calendar-toolbar"><div className="calendar-move"><button onClick={()=>move(-1)}>‹</button><button onClick={()=>setCurrent(new Date())}>Oggi</button><button onClick={()=>move(1)}>›</button></div><h2>{view==="day"?fullDate(current):view==="week"?`${fullDate(startOfWeek(current))} - ${fullDate(addDays(startOfWeek(current),6))}`:`${MONTHS[current.getMonth()]} ${current.getFullYear()}`}</h2><div className="calendar-views"><button className={view==="day"?"active":""} onClick={()=>setView("day")}>Giorno</button><button className={view==="week"?"active":""} onClick={()=>setView("week")}>Settimana</button><button className={view==="month"?"active":""} onClick={()=>setView("month")}>Mese</button></div></section>
  {message&&<p className="form-message form-message-error">{message}</p>}
  {loading?<div className="calendar-empty">Caricamento appuntamenti...</div>:view==="day"?<DayView date={current} bookings={bookings} select={setSelected}/>:view==="week"?<WeekView date={current} bookings={bookings} select={setSelected}/>:<MonthView date={current} bookings={bookings} select={setSelected} openDay={d=>{setCurrent(d);setView("day");}}/>}
  <section className="calendar-summary"><div><strong>{activeBookings.length}</strong><span>Appuntamenti attivi</span></div><div><strong>{activeBookings.reduce((sum,b)=>sum+Number(b.price),0).toFixed(2)} €</strong><span>Valore previsto</span></div><div><strong>{bookings.filter(b=>b.status==="COMPLETATO").length}</strong><span>Completati</span></div><div><strong>{bookings.filter(b=>b.status==="ASSENTE").length}</strong><span>Assenti</span></div></section>
  {selected&&<BookingModal booking={selected} close={()=>setSelected(null)} changeStatus={changeStatus}/>} 
 </div></main>;
}

function BookingCard({booking,select,compact=false}){return <button className={`calendar-event status-${booking.status.toLowerCase()} ${compact?"compact":""}`} onClick={()=>select(booking)}><strong>{booking.start_time.slice(0,5)} {booking.service_name}</strong><span>{booking.profiles?.nome} {booking.profiles?.cognome}</span>{!compact&&<small>{booking.end_time.slice(0,5)} · € {Number(booking.price).toFixed(2)} · {STATUS_LABEL[booking.status]}</small>}</button>}

function DayView({date,bookings,select}){const key=isoDate(date);const list=bookings.filter(b=>b.booking_date===key);return <section className="day-calendar"><div className="timeline">{Array.from({length:12},(_,i)=>i+9).map(hour=><div key={hour}><time>{String(hour).padStart(2,"0")}:00</time></div>)}</div><div className="day-events">{list.map(b=><BookingCard booking={b} select={select} key={b.id}/>)}{!list.length&&<div className="calendar-empty">Nessun appuntamento per questa giornata.</div>}</div></section>}

function WeekView({date,bookings,select}){const start=startOfWeek(date);return <section className="week-calendar">{Array.from({length:7},(_,i)=>addDays(start,i)).map((day,i)=>{const key=isoDate(day);const list=bookings.filter(b=>b.booking_date===key);return <article className={`week-day ${key===isoDate(new Date())?"today":""}`} key={key}><header><span>{DAYS[i]}</span><strong>{day.getDate()}</strong></header><div>{list.map(b=><BookingCard booking={b} select={select} compact key={b.id}/>)}{!list.length&&<small className="week-empty">Libero</small>}</div></article>})}</section>}

function MonthView({date,bookings,select,openDay}){const first=new Date(date.getFullYear(),date.getMonth(),1,12);const monday=(first.getDay()+6)%7;const gridStart=addDays(first,-monday);return <section className="month-calendar">{DAYS.map(d=><div className="month-weekday" key={d}>{d}</div>)}{Array.from({length:42},(_,i)=>addDays(gridStart,i)).map(day=>{const key=isoDate(day);const list=bookings.filter(b=>b.booking_date===key);return <article className={`month-day ${day.getMonth()!==date.getMonth()?"outside":""} ${key===isoDate(new Date())?"today":""}`} key={key}><button className="month-number" onClick={()=>openDay(day)}>{day.getDate()}</button><div>{list.slice(0,3).map(b=><BookingCard booking={b} select={select} compact key={b.id}/>)}{list.length>3&&<button className="more-events" onClick={()=>openDay(day)}>+{list.length-3} altri</button>}</div></article>})}</section>}

function BookingModal({booking,close,changeStatus}){return <div className="calendar-modal-backdrop" onClick={close}><section className="calendar-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={close}>×</button><p className="auth-kicker">Dettaglio appuntamento</p><h2>{booking.service_name}</h2><dl><div><dt>Cliente</dt><dd>{booking.profiles?.nome} {booking.profiles?.cognome}</dd></div><div><dt>Data</dt><dd>{formatDate(booking.booking_date)}</dd></div><div><dt>Orario</dt><dd>{booking.start_time.slice(0,5)} - {booking.end_time.slice(0,5)}</dd></div><div><dt>Contatti</dt><dd>{booking.profiles?.telefono||booking.profiles?.email}</dd></div><div><dt>Prezzo</dt><dd>€ {Number(booking.price).toFixed(2)}</dd></div><div><dt>Stato</dt><dd>{STATUS_LABEL[booking.status]}</dd></div></dl>{booking.notes&&<p className="modal-notes">Nota: {booking.notes}</p>}<div className="modal-actions"><button onClick={()=>changeStatus(booking.id,"CONFERMATO")}>Confermato</button><button onClick={()=>changeStatus(booking.id,"COMPLETATO")}>Completato</button><button onClick={()=>changeStatus(booking.id,"ASSENTE")}>Assente</button><button className="danger" onClick={()=>changeStatus(booking.id,"ANNULLATO")}>Annulla</button></div></section></div>}
