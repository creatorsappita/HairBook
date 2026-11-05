'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function AdminParrucchieriPage() {
  const [hairdressers, setHairdressers] = useState([]);
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchHairdressers();
  }, []);

  async function fetchHairdressers() {
    const { data, error } = await supabase.from('hairdressers').select('*').order('created_at', { ascending: true });
    if (!error) setHairdressers(data || []);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    const { error } = await supabase.from('hairdressers').insert([{ name, avatar_url: avatarUrl }]);
    if (!error) {
      setName('');
      setAvatarUrl('');
      fetchHairdressers();
    } else {
      alert('Errore durante il salvataggio: ' + error.message);
    }
    setLoading(false);
  }

  async function handleDelete(id) {
    if (!confirm('Sei sicuro di voler eliminare questo parrucchiere?')) return;
    const { error } = await supabase.from('hairdressers').delete().eq('id', id);
    if (!error) {
      fetchHairdressers();
    } else {
      alert('Errore durante l\'eliminazione: ' + error.message);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Gestione Parrucchieri</h1>

      {/* Form inserimento */}
      <form onSubmit={handleAdd} className="bg-white p-6 rounded-lg shadow mb-8 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium mb-1">Nome Parrucchiere</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
            placeholder="Es. Mario Rossi"
            required 
          />
        </div>
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium mb-1">URL Foto / Avatar (Opzionale)</label>
          <input 
            type="text" 
            value={avatarUrl} 
            onChange={(e) => setAvatarUrl(e.target.value)} 
            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
            placeholder="https://..." 
          />
        </div>
        <button 
          type="submit" 
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition w-full md:w-auto h-10 font-medium"
        >
          {loading ? 'Salvataggio...' : 'Aggiungi'}
        </button>
      </form>

      {/* Lista parrucchieri */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {hairdressers.map((h) => (
          <div key={h.id} className="bg-white p-4 rounded-lg shadow flex items-center justify-between border">
            <div className="flex items-center gap-3">
              <img 
                src={h.avatar_url || 'https://via.placeholder.com/150'} 
                alt={h.name} 
                className="w-12 h-12 rounded-full object-cover border"
              />
              <div>
                <h3 className="font-semibold text-gray-800">{h.name}</h3>
              </div>
            </div>
            <button 
              onClick={() => handleDelete(h.id)}
              className="text-red-500 hover:text-red-700 text-sm font-medium p-1"
            >
              Elimina
            </button>
          </div>
        ))}
        {hairdressers.length === 0 && (
          <p className="text-gray-500 col-span-full text-center py-4">Nessun parrucchiere inserito. Il sistema funzionerà in modalità standard.</p>
        )}
      </div>
    </div>
  );
}
