import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createBookingIcs } from "../../../../lib/ics";
import { bookingConfirmationHtml } from "../../../../lib/booking-email";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!accessToken) return NextResponse.json({ error: "Sessione mancante." }, { status: 401 });

    const body = await request.json();
    if (!body.bookingDate || !body.startTime) return NextResponse.json({ error: "Dati appuntamento incompleti." }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } }, auth: { persistSession: false } }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !userData.user) return NextResponse.json({ error: "Sessione non valida." }, { status: 401 });

    const normalizedTime = String(body.startTime).length === 5 ? `${body.startTime}:00` : body.startTime;
    const [{ data: booking, error: bookingError }, { data: profile, error: profileError }] = await Promise.all([
      supabase.from("bookings").select("id,client_id,booking_date,start_time,end_time,service_name,duration_minutes,price,status").eq("client_id", userData.user.id).eq("booking_date", body.bookingDate).eq("start_time", normalizedTime).order("created_at", { ascending: false }).limit(1).single(),
      supabase.from("profiles").select("nome,cognome,email").eq("id", userData.user.id).single(),
    ]);

    if (bookingError || !booking) return NextResponse.json({ error: "Prenotazione non trovata." }, { status: 404 });
    if (profileError || !profile) return NextResponse.json({ error: "Profilo cliente non trovato." }, { status: 404 });
    if (booking.status !== "CONFERMATO") return NextResponse.json({ error: "La prenotazione non è confermata." }, { status: 409 });

    const recipientEmail = profile.email || userData.user.email;
    if (!recipientEmail) return NextResponse.json({ error: "Email cliente non disponibile." }, { status: 400 });

    const salonName = process.env.HAIRBOOK_SALON_NAME || "HairBook";
    const salonAddress = process.env.HAIRBOOK_SALON_ADDRESS || "Indirizzo del salone";
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).replace(/\/$/, "");
    const manageUrl = `${siteUrl}/area-cliente`;
    const dateLabel = new Date(`${booking.booking_date}T12:00:00`).toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Rome" });
    const timeLabel = `${String(booking.start_time).slice(0, 5)} - ${String(booking.end_time).slice(0, 5)}`;
    const customerName = [profile.nome, profile.cognome].filter(Boolean).join(" ") || "cliente";

    const ics = createBookingIcs({ id: booking.id, serviceName: booking.service_name, salonName, salonAddress, bookingDate: booking.booking_date, startTime: booking.start_time, endTime: booking.end_time, manageUrl });
    const htmlContent = bookingConfirmationHtml({ customerName, salonName, serviceName: booking.service_name, dateLabel, timeLabel, duration: booking.duration_minutes, price: Number(booking.price).toFixed(2), manageUrl });

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": process.env.BREVO_API_KEY },
      body: JSON.stringify({
        sender: { name: process.env.BREVO_SENDER_NAME || "HairBook", email: process.env.BREVO_SENDER_EMAIL },
        to: [{ name: customerName, email: recipientEmail }],
        replyTo: process.env.HAIRBOOK_REPLY_TO ? { email: process.env.HAIRBOOK_REPLY_TO } : undefined,
        subject: `Appuntamento confermato - ${salonName} - ${dateLabel}`,
        htmlContent,
        attachment: [{ name: "appuntamento-hairbook.ics", content: Buffer.from(ics, "utf8").toString("base64") }],
      }),
    });

    if (!brevoResponse.ok) {
      const detail = await brevoResponse.text();
      console.error("Errore Brevo:", brevoResponse.status, detail);
      return NextResponse.json({ error: "Prenotazione salvata, ma invio email non riuscito." }, { status: 502 });
    }

    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error("booking-confirmation:", error);
    return NextResponse.json({ error: "Errore interno durante l’invio della conferma." }, { status: 500 });
  }
}
