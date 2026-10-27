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
  return `${String(dateValue).replaceAll("-", "")}T${String(timeValue).slice(0, 8).replaceAll(":", "")}`;
}

export function createBookingIcs({ id, serviceName, salonName, salonAddress, bookingDate, startTime, endTime, manageUrl }) {
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
    `DESCRIPTION:${escapeIcs(`Prenotazione confermata tramite HairBook. Gestisci appuntamento: ${manageUrl}`)}`,
    `LOCATION:${escapeIcs(salonAddress)}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "BEGIN:VALARM",
    "TRIGGER:-PT60M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Promemoria appuntamento HairBook",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
