import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const SECTION_NAMES = ['Entrada en calor', 'Bloque 1', 'Bloque 2', 'Bloque 3', 'Bloque 4'];

const emptyExercise = () => ({
  _id: crypto.randomUUID(),
  name: '',
  repetitions: '',
  weight: '',
  series: '',
  youtubeUrl: '',
});

const emptySections = () =>
  SECTION_NAMES.map(name => ({ name, exercises: [] }));

export default function RoutineEditor() {
  const { userId, routineId } = useParams();
  const navigate = useNavigate();
  const isEdit = routineId && routineId !== 'new';

  const [routineName, setRoutineName] = useState('');
  const [sections, setSections] = useState(emptySections());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [propagation, setPropagation] = useState(null); // [{ oldName, changes, labels, days, checked }]

  useEffect(() => {
    if (!isEdit) return;
    axios.get(`/api/admin/users/${userId}/routines`).then(r => {
      const found = r.data.find(rt => rt.id === routineId);
      if (!found) return;
      setRoutineName(found.name);
      const loaded = SECTION_NAMES.map(name => {
        const sec = found.sections.find(s => s.name === name);
        return {
          name,
          exercises: sec?.exercises.map(ex => ({
            _id: ex.id,
            name: ex.name,
            repetitions: ex.repetitions,
            weight: ex.weight || '',
            series: String(ex.series),
            youtubeUrl: ex.youtubeUrl || '',
            _orig: { name: ex.name, repetitions: ex.repetitions, weight: ex.weight || '' },
          })) || []
        };
      });
      setSections(loaded);
    });
  }, [isEdit, routineId, userId]);

  const addExercise = (sIdx) =>
    setSections(prev => prev.map((s, i) =>
      i === sIdx ? { ...s, exercises: [...s.exercises, emptyExercise()] } : s
    ));

  const removeExercise = (sIdx, eIdx) =>
    setSections(prev => prev.map((s, i) =>
      i === sIdx ? { ...s, exercises: s.exercises.filter((_, j) => j !== eIdx) } : s
    ));

  const updateExercise = (sIdx, eIdx, field, value) =>
    setSections(prev => prev.map((s, i) =>
      i === sIdx
        ? { ...s, exercises: s.exercises.map((ex, j) => j === eIdx ? { ...ex, [field]: value } : ex) }
        : s
    ));

  const autoYoutube = async (sIdx, eIdx, name) => {
    if (!name) return;
    try {
      const { data } = await axios.get(`/api/admin/youtube-search?q=${encodeURIComponent(name)}`);
      updateExercise(sIdx, eIdx, 'youtubeUrl', data.url);
    } catch {
      const fallback = `https://www.youtube.com/results?search_query=${encodeURIComponent(name + ' ejercicio')}`;
      updateExercise(sIdx, eIdx, 'youtubeUrl', fallback);
    }
  };

  const buildPayload = () => ({
    name: routineName.trim(),
    sections: sections.filter(s => s.exercises.length > 0).map(s => ({
      name: s.name,
      exercises: s.exercises.map(ex => ({
        name: ex.name,
        repetitions: ex.repetitions,
        weight: ex.weight,
        series: Number(ex.series),
        youtubeUrl: ex.youtubeUrl,
      }))
    }))
  });

  // Ejercicios editados (nombre, reps o peso) respecto a lo que estaba guardado
  const detectChanges = () => {
    const list = [];
    sections.forEach(s => s.exercises.forEach(ex => {
      const o = ex._orig;
      if (!o) return;
      const changes = {};
      const labels = [];
      if (ex.name.trim() !== o.name.trim()) {
        changes.name = ex.name.trim();
        changes.youtubeUrl = ex.youtubeUrl;
        labels.push(`${o.name} → ${ex.name.trim()}`);
      }
      if (ex.repetitions !== o.repetitions) {
        changes.repetitions = ex.repetitions;
        labels.push(`Reps: ${o.repetitions || '—'} → ${ex.repetitions || '—'}`);
      }
      if (ex.weight !== o.weight) {
        changes.weight = ex.weight;
        labels.push(`Peso: ${o.weight || '—'} → ${ex.weight || '—'}`);
      }
      if (labels.length) list.push({ oldName: o.name, changes, labels });
    }));
    return list;
  };

  const doSave = async (propagate = []) => {
    setSaving(true);
    setError('');
    try {
      const payload = buildPayload();
      if (isEdit) {
        await axios.put(`/api/admin/routines/${routineId}`, { ...payload, propagate });
      } else {
        await axios.post(`/api/admin/users/${userId}/routines`, payload);
      }
      navigate(`/admin/users/${userId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!routineName.trim()) { setError('Ingresá el nombre de la rutina'); return; }
    const hasExercises = sections.some(s => s.exercises.length > 0);
    if (!hasExercises) { setError('Agregá al menos un ejercicio'); return; }

    const invalid = sections.flatMap(s => s.exercises).some(
      ex => !ex.name || !ex.repetitions || !ex.series
    );
    if (invalid) { setError('Completá nombre, repeticiones y series de todos los ejercicios'); return; }

    if (isEdit) {
      const changes = detectChanges();
      if (changes.length) {
        setSaving(true);
        try {
          const names = [...new Set(changes.map(c => c.oldName))];
          const { data } = await axios.post(`/api/admin/routines/${routineId}/propagation-preview`, { names });
          const withDays = changes
            .map(c => ({ ...c, days: data[c.oldName] || [], checked: true }))
            .filter(c => c.days.length > 0);
          if (withDays.length) {
            setPropagation(withDays);
            setSaving(false);
            return;
          }
        } catch {
          // si falla la vista previa, se guarda solo este día
        }
        setSaving(false);
      }
    }
    doSave();
  };

  const confirmPropagation = (applyChecked) => {
    const selected = applyChecked
      ? propagation.filter(p => p.checked).map(p => ({ oldName: p.oldName, changes: p.changes }))
      : [];
    setPropagation(null);
    doSave(selected);
  };

  const togglePropagation = (idx) =>
    setPropagation(prev => prev.map((p, i) => i === idx ? { ...p, checked: !p.checked } : p));

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto pb-32">
      <div className="flex items-center gap-3 pt-6 mb-6">
        <button onClick={() => navigate(`/admin/users/${userId}`)} className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors">
          ← Volver
        </button>
        <h1 className="text-xl font-black text-white">
          {isEdit ? 'Editar rutina' : 'Nueva rutina'}
        </h1>
      </div>

      {/* Routine name */}
      <div className="card mb-6">
        <label className="block text-sm font-semibold text-gray-400 mb-2">Nombre de la rutina</label>
        <input
          className="input-field"
          placeholder="Ej: Rutina Fuerza — Semana 1"
          value={routineName}
          onChange={e => setRoutineName(e.target.value)}
        />
      </div>

      {/* Sections */}
      {sections.map((section, sIdx) => (
        <div key={section.name} className="card mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-white">{section.name}</h2>
            <button
              onClick={() => addExercise(sIdx)}
              className="bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 text-sm font-bold px-3 py-2 rounded-xl transition-colors"
            >
              + Ejercicio
            </button>
          </div>

          {section.exercises.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-4">Sin ejercicios — dejá vacío si no usás este bloque</p>
          )}

          <div className="space-y-4">
            {section.exercises.map((ex, eIdx) => (
              <div key={ex._id} className="bg-gray-800/60 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm font-bold">Ejercicio {eIdx + 1}</span>
                  <button
                    onClick={() => removeExercise(sIdx, eIdx)}
                    className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <input
                  className="input-field text-base py-3"
                  placeholder="Nombre del ejercicio"
                  value={ex.name}
                  onChange={e => updateExercise(sIdx, eIdx, 'name', e.target.value)}
                  onBlur={e => { if (!ex.youtubeUrl) autoYoutube(sIdx, eIdx, e.target.value); }}
                />

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Reps / Tiempo</label>
                    <input
                      className="input-field py-3 text-sm"
                      placeholder="12 / 30s"
                      value={ex.repetitions}
                      onChange={e => updateExercise(sIdx, eIdx, 'repetitions', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Peso</label>
                    <input
                      className="input-field py-3 text-sm"
                      placeholder="10kg"
                      value={ex.weight}
                      onChange={e => updateExercise(sIdx, eIdx, 'weight', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Series</label>
                    <input
                      className="input-field py-3 text-sm"
                      placeholder="3"
                      type="number"
                      min="1"
                      value={ex.series}
                      onChange={e => updateExercise(sIdx, eIdx, 'series', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Link YouTube (auto-generado, podés editar)</label>
                  <input
                    className="input-field py-3 text-sm font-mono"
                    placeholder="https://youtube.com/..."
                    value={ex.youtubeUrl}
                    onChange={e => updateExercise(sIdx, eIdx, 'youtubeUrl', e.target.value)}
                  />
                  {ex.youtubeUrl && (
                    <a
                      href={ex.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-400 text-xs mt-1 inline-block hover:underline"
                    >
                      ▶ Ver en YouTube
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Propagation modal */}
      {propagation && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4">
          <div className="card w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <h2 className="text-lg font-black text-white mb-1">¿Aplicar en otros días?</h2>
            <p className="text-gray-400 text-sm mb-4">
              Estos ejercicios también aparecen en días que el alumno todavía no completó. Marcá los cambios que querés copiar.
            </p>
            <div className="space-y-3 mb-5">
              {propagation.map((p, idx) => (
                <label key={idx} className="flex gap-3 bg-gray-800/60 rounded-2xl p-4 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 w-5 h-5 accent-brand-500 shrink-0"
                    checked={p.checked}
                    onChange={() => togglePropagation(idx)}
                  />
                  <div className="min-w-0">
                    <p className="text-white font-bold">{p.oldName}</p>
                    {p.labels.map(l => <p key={l} className="text-brand-400 text-sm">{l}</p>)}
                    <p className="text-gray-500 text-xs mt-1">
                      {p.days.length} {p.days.length === 1 ? 'día pendiente' : 'días pendientes'}: {p.days.join(', ')}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            <div className="space-y-2">
              <button className="btn-primary" onClick={() => confirmPropagation(true)}>
                Aplicar en los marcados
              </button>
              <button className="btn-secondary" onClick={() => confirmPropagation(false)}>
                Solo en este día
              </button>
              <button className="w-full text-gray-500 text-sm py-2 hover:text-gray-300" onClick={() => setPropagation(null)}>
                Cancelar (seguir editando)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-950 via-gray-950/95 to-transparent">
        <div className="max-w-2xl mx-auto space-y-2">
          {error && (
            <p className="text-red-400 text-sm text-center bg-red-500/10 rounded-xl px-4 py-2">{error}</p>
          )}
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear rutina'}
          </button>
        </div>
      </div>
    </div>
  );
}
