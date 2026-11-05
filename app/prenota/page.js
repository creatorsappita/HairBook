'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Integrazione della selezione del parrucchiere nel flusso di prenotazione
export default function PrenotaPage() {
  const [hairdressers, setHairdressers] = useState([]);
  const [selectedHairdresser, setSelectedHairdresser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchHairdressers() {
      const { data } = await supabase.from('hairdressers').select('*').order('name', { ascending: true });
      setHairdressers(data || []);
    }
    fetchHairdressers();
  }, []);

  // Esempio salvataggio prenotazione
  async function handleBooking(bookingDetails) {
    setLoading(true);
    const { data, error } = await supabase.from('bookings').insert([
      {
        ...bookingDetails,
        hairdresser_id: selectedHairdresser || null
      }
    ]);
    setLoading(false);
    return { data, error };
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Prenota un Appuntamento</h1>

      {/* Selezione Parrucchiere (visibile solo se esistono parrucchieri nel database) */}
      {hairdressers.length > 0 && (
        <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Scegli il tuo parrucchiere di fiducia (Opzionale)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div 
              onClick={() => setSelectedHairdresser(null)}
              className={`p-3 border rounded-xl cursor-pointer text-center transition ${!selectedHairdresser ? 'border-blue-600 bg-blue-50 shadow-sm' : 'bg-white hover:bg-gray-50'}`}
            >
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
                Tutti
              </div>
              <span className="text-xs font-medium block">Qualsiasi disponibile</span>
            </div>
            {hairdressers.map((h) => (
              <div 
                key={h.id} 
                onClick={() => setSelectedHairdresser(h.id)}
                className={`p-3 border rounded-xl cursor-pointer text-center transition ${selectedHairdresser === h.id ? 'border-blue-600 bg-blue-50 shadow-sm' : 'bg-white hover:bg-gray-50'}`}
              >
                <img 
                  src={h.avatar_url || 'https://via.placeholder.com/150'} 
                  alt={h.name} 
                  className="w-12 h-12 mx-auto mb-2 rounded-full object-cover border"
                />
                <span className="text-xs font-medium block truncate">{h.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resto del form di prenotazione (data, ora, servizi) */}
    </div>
  );
}
