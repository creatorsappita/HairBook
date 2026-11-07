function escapeIcs(value = "") {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function utcStamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function localStamp(dateValue, timeValue) {
  return `${String(dateValue).replaceAll("-", "")}T${String(timeValue)
    .slice(0, 8)
    .replaceAll(":", "")}`;
}

export function createBookingIcs({
  id,
  serviceName,
  salonName,
  salonAddress,
  bookingDate,
  startTime,
  endTime,
  manageUrl,
}) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "PRODID:-//HairBook//Prenotazione//IT",
    "BEGIN:VEVENT",
    `UID:${escapeIcs(id)}@hairbook`,
    `DTSTAMP:${utcStamp()}`,
    `DTSTART;TZID=Europe/Rome:${localStamp(bookingDate, startTime)}`,
    `DTEND;TZID=Europe/Rome:${localStamp(bookingDate, endTime)}`,
    `SUMMARY:${escapeIcs(`${serviceName} - ${salonName}`)}`,
    `DESCRIPTION:${escapeIcs(
      `Prenotazione confermata tramite HairBook. Promemoria impostati 24 ore e 2 ore prima. Gestisci appuntamento: ${manageUrl}`
    )}`,
    `LOCATION:${escapeIcs(salonAddress)}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    "DESCRIPTION:Promemoria HairBook - appuntamento domani",
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Promemoria HairBook - appuntamento tra 2 ore",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
