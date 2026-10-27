"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";

const DAY_SHORT=["Dom","Lun","Mar","Mer","Gio","Ven","Sab"];
const DAY_MONDAY=["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];
const MONTHS=["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const MONTH_SHORT=["gen","feb","mar","apr","mag","giu","lug","ago","set","ott","nov","dic"];

function isoDate(date){const y=date.getFullYear();const m=String(date.getMonth()+1).padStart(2,"0");const d=String(date.getDate()).padStart(2,"0");return `${y}-${m}-${d}`;}
function fromIso(value){const[y,m,d]=value.split("-").map(Number);return new Date(y,m-1,d,12);}
function addDays(date,n){const result=new Date(date);result.setDate(result.getDate()+n);return result;}
function longDate(value){return fromIso(value).toLocaleDateString("it-IT",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});}
function startOfMonthGrid(date){const first=new Date(date.getFullYear(),date.getMonth(),1,12);const offset=(first.getDay()+6)%7;return addDays(first,-offset);}

export default function PrenotaPage(){
 const[services,setServices]=useState([]),[serviceId,setServiceId]=useState(""),[date,setDate]=useState(""),[slots,setSlots]=useState([]),[selected,setSelected]=useState(""),[notes,setNotes]=useState(""),[message,setMessage]=useState(""),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[maxDays,setMaxDays]=useState(60),[workingHours,setWorkingHours]=useState([]),[closures,setClosures]=useState([]),[view,setView]=useState("week"),[weekStart,setWeekStart]=useState(0),[monthCursor,setMonthCursor]=useState(new Date()),[dayStatus,setDayStatus]=useState({}),[checkingDays,setCheckingDays]=useState(false);

 useEffect(()=>{load();},[]);
 async function load(){
  if(!isSupabaseConfigured||!supabase)return;
  const{data:{user}}=await supabase.auth.getUser();
  if(!user){location.href="/login";return;}
  const{data:p}=await supabase.from("profiles").select("ruolo,stato").eq("id",user.id).single();
  if(p?.ruolo!=="CLIENTE"||p?.stato!=="APPROVATO"){location.href="/area-cliente";return;}
  const[{data:s},{data:cfg},{data:h},{data:c}]=await Promise.all([
   supabase.from("services").select("id,nome,descrizione,durata_minuti,prezzo").eq("attivo",true).order("ordine"),
   supabase.from("booking_settings").select("maximum_booking_days").eq("id",1).single(),
   supabase.from("working_hours").select("day_of_week,is_open"),
   supabase.from("closures").select("closure_date,all_day")
  ]);
  setServices(s||[]);if(s?.length)setServiceId(s[0].id);setMaxDays(cfg?.maximum_booking_days||60);setWorkingHours(h||[]);setClosures(c||[]);setLoading(false);
 }

 const today=useMemo(()=>{const d=new Date();d.setHours(12,0,0,0);return d;},[]);
 const maxDate=useMemo(()=>addDays(today,maxDays),[today,maxDays]);
 const visibleDays=useMemo(()=>{
  if(view==="week")return Array.from({length:7},(_,i)=>addDays(today,weekStart+i)).filter(d=>d<=maxDate);
  const start=startOfMonthGrid(monthCursor);return Array.from({length:42},(_,i)=>addDays(start,i));
 },[view,weekStart,monthCursor,today,maxDate]);

 useEffect(()=>{if(serviceId&&visibleDays.length)checkVisibleDays();},[serviceId,view,weekStart,monthCursor,workingHours,closures]);
 useEffect(()=>{if(serviceId&&date)loadSlots();},[serviceId,date]);

 function isOutsideRange(day){return day<today||day>maxDate;}
 function baseStatus(day){
  if(isOutsideRange(day))return"outside";
  const key=isoDate(day);const hours=workingHours.find(x=>x.day_of_week===day.getDay());
  const closedByHours=!hours?.is_open;const closedByException=closures.some(x=>x.closure_date===key&&x.all_day);
  return closedByHours||closedByException?"closed":"unknown";
 }

 async function checkVisibleDays(){
  setCheckingDays(true);
  const entries=await Promise.all(visibleDays.map(async day=>{
   const key=isoDate(day),basic=baseStatus(day);
   if(basic==="outside"||basic==="closed")return[key,basic];
   const{data,error}=await supabase.rpc("get_available_slots",{p_date:key,p_service_id:serviceId});
   if(error)return[key,"error"];
   return[key,(data||[]).length?"available":"full"];
  }));
  const next=Object.fromEntries(entries);setDayStatus(next);setCheckingDays(false);
  if(date&&next[date]&&next[date]!=="available"){setDate("");setSlots([]);setSelected("");}
  if(!date){const first=entries.find(([,status])=>status==="available");if(first)setDate(first[0]);}
 }

 async function loadSlots(){setSelected("");setMessage("");const{data,error}=await supabase.rpc("get_available_slots",{p_date:date,p_service_id:serviceId});if(error){setMessage(error.message);setSlots([]);}else setSlots((data||[]).map(x=>x.slot_start.slice(0,5)));}
 async function book(){if(!selected)return setMessage("Seleziona un orario.");setSaving(true);const{error}=await supabase.rpc("client_create_booking",{p_service_id:serviceId,p_date:date,p_start_time:selected,p_notes:notes});setSaving(false);if(error){setMessage(error.message);await loadSlots();return;}setMessage("Prenotazione confermata correttamente.");setSelected("");setNotes("");await checkVisibleDays();setTimeout(()=>location.href="/area-cliente",1400);}
 function chooseDay(day){const key=isoDate(day);if(dayStatus[key]!=="available")return;setDate(key);}
 function moveWeek(direction){setWeekStart(current=>Math.max(0,Math.min(maxDays-1,current+7*direction)));}
 function moveMonth(direction){const next=new Date(monthCursor);next.setDate(1);next.setMonth(next.getMonth()+direction);if(next<new Date(today.getFullYear(),today.getMonth(),1,12))return;if(next>new Date(maxDate.getFullYear(),maxDate.getMonth(),1,12))return;setMonthCursor(next);}
 function selectView(next){setView(next);if(next==="month"&&date)setMonthCursor(fromIso(date));}

 if(loading)return <main className="booking-shell"><p>Caricamento...</p></main>;
 const service=services.find(s=>s.id===serviceId);
 return <main className="booking-shell"><div className="booking-panel booking-panel-wide"><header className="booking-top"><div><p className="auth-kicker">Area cliente</p><h1>Prenota appuntamento</h1></div><div><a className="button button-secondary" href="/area-cliente">Area cliente</a><a className="button button-secondary" href="/">Home</a></div></header>
 <section className="booking-steps booking-steps-wide">
  <div className="booking-box"><h2>1. Scegli il servizio</h2><div className="booking-services">{services.map(s=><button className={serviceId===s.id?"selected":""} onClick={()=>setServiceId(s.id)} key={s.id}><strong>{s.nome}</strong><span>{s.durata_minuti} min · € {Number(s.prezzo).toFixed(2)}</span><small>{s.descrizione}</small></button>)}</div></div>
  <div className="booking-box booking-date-box">
   <div className="booking-date-top"><h2>2. Scegli la data</h2><div className="booking-date-views"><button className={view==="week"?"active":""} onClick={()=>selectView("week")}>7 giorni</button><button className={view==="month"?"active":""} onClick={()=>selectView("month")}>Mese</button></div></div>
   <div className="booking-day-legend"><span className="legend-closed">Chiuso</span><span className="legend-full">Completo</span></div>
   {view==="week"?<WeekSelector days={visibleDays} statuses={dayStatus} date={date} chooseDay={chooseDay} previous={()=>moveWeek(-1)} next={()=>moveWeek(1)} previousDisabled={weekStart===0} nextDisabled={weekStart+7>=maxDays}/>:<MonthSelector cursor={monthCursor} days={visibleDays} statuses={dayStatus} date={date} chooseDay={chooseDay} previous={()=>moveMonth(-1)} next={()=>moveMonth(1)} today={today} maxDate={maxDate}/>} 
   {checkingDays&&<p className="booking-checking">Aggiornamento disponibilità...</p>}
   <h2 className="booking-time-title">3. Scegli l’orario</h2>{date&&<p className="booking-selected-date">{longDate(date)}</p>}<div className="booking-slots">{slots.map(t=><button className={selected===t?"selected":""} onClick={()=>setSelected(t)} key={t}>{t}</button>)}{date&&!slots.length&&!checkingDays&&<p>Nessun orario disponibile per questa data.</p>}{!date&&<p>Scegli un giorno disponibile.</p>}</div>
  </div>
  <div className="booking-box booking-confirm"><h2>4. Conferma</h2>{service&&<p><strong>{service.nome}</strong><br/>{date?longDate(date):"Data non scelta"} {selected&&`alle ${selected}`}<br/>€ {Number(service.prezzo).toFixed(2)}</p>}<label>Note facoltative<textarea rows="3" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Esigenze o comunicazioni per il salone"/></label>{message&&<p className="form-message">{message}</p>}<button className="button button-primary button-large" onClick={book} disabled={saving||!selected}>{saving?"Prenotazione...":"Conferma prenotazione"}</button></div>
 </section></div></main>;
}

function DayButton({day,status,date,chooseDay,month=false}){const key=isoDate(day);return <button key={key} className={`${month?"booking-month-day":"booking-day"} booking-day-${status} ${date===key?"selected":""}`} disabled={status!=="available"} onClick={()=>chooseDay(day)}><span>{month?DAY_SHORT[day.getDay()]:DAY_SHORT[day.getDay()]}</span><strong>{day.getDate()}</strong>{!month&&<small>{MONTH_SHORT[day.getMonth()]}</small>}<em>{status==="closed"?"Chiuso":status==="full"?"Completo":status==="available"?"Disponibile":status==="outside"?"":"..."}</em></button>}
function WeekSelector({days,statuses,date,chooseDay,previous,next,previousDisabled,nextDisabled}){return <><div className="booking-selector-heading"><strong>Prossimi giorni</strong><div><button onClick={previous} disabled={previousDisabled}>‹</button><button onClick={next} disabled={nextDisabled}>›</button></div></div><div className="booking-days booking-days-seven">{days.map(day=><DayButton day={day} status={statuses[isoDate(day)]||"unknown"} date={date} chooseDay={chooseDay} key={isoDate(day)}/>)}</div></>}
function MonthSelector({cursor,days,statuses,date,chooseDay,previous,next,today,maxDate}){return <><div className="booking-selector-heading"><strong>{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</strong><div><button onClick={previous} disabled={cursor.getFullYear()===today.getFullYear()&&cursor.getMonth()===today.getMonth()}>‹</button><button onClick={next} disabled={cursor.getFullYear()===maxDate.getFullYear()&&cursor.getMonth()===maxDate.getMonth()}>›</button></div></div><div className="booking-month-weekdays">{DAY_MONDAY.map(day=><span key={day}>{day}</span>)}</div><div className="booking-month-grid">{days.map(day=><div className={day.getMonth()!==cursor.getMonth()?"month-cell outside-month":"month-cell"} key={isoDate(day)}><DayButton day={day} status={statuses[isoDate(day)]||"outside"} date={date} chooseDay={chooseDay} month/></div>)}</div></>}
