import { useState } from 'react';
import axios from 'axios';

export default function PagoForm({ cuentaId, sugerido = 0, fechaInicial, onSaved, onCancel }) {
  const [monto, setMonto] = useState(sugerido ? String(Math.round(sugerido)) : '');
  const [fecha, setFecha] = useState(fechaInicial);
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const guardar = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await axios.post('/api/cobros/pagos', { cuentaId, monto: Number(monto), fecha, nota });
      onSaved?.();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar');
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={guardar} className="mt-3 space-y-2">
      <div className="flex gap-2">
        <input type="number" inputMode="numeric" min="1" required value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="Monto" className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-500" />
        <input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-xl px-2 py-2 text-sm focus:outline-none focus:border-brand-500" />
      </div>
      <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nota (ej. transferencia, efectivo, noviembre)" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <div className="flex gap-2">
        {onCancel && <button type="button" onClick={onCancel} className="flex-1 bg-gray-800 text-gray-400 py-2 rounded-xl text-sm font-bold">Cancelar</button>}
        <button disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2 rounded-xl text-sm font-bold">
          {saving ? 'Guardando…' : 'Guardar pago'}
        </button>
      </div>
    </form>
  );
}
