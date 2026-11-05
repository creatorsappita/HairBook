'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminAgendaPage() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    async function fetchBookings() {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          hairdressers (
            name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (!error) setBookings(data || []);
    }

    fetchBookings();
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Agenda Appuntamenti</h1>
      <div className="grid gap-4">
        {bookings.map((booking) => (
          <div key={booking.id} className="p-4 bg-white rounded-lg shadow border flex justify-between items-center">
            <div>
              <p className="font-semibold text-lg">{booking.client_name || 'Cliente'}</p>
              <p className="text-sm text-gray-600">{booking.date} - {booking.time}</p>

              {booking.hairdressers && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t text-xs text-gray-600">
                  <img 
                    src={booking.hairdressers.avatar_url || 'https://via.placeholder.com/150'} 
                    alt={booking.hairdressers.name} 
                    className="w-6 h-6 rounded-full object-cover border" 
                  />
                  <span>Parrucchiere: <strong className="text-gray-800">{booking.hairdressers.name}</strong></span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
