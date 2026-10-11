import { useState, useRef, useEffect } from 'react';

export default function ExerciseRow({ exercise, isSelected, onSelect, onExerciseUpdate }) {
  const [weight, setWeight] = useState(exercise.weight || '');
  const [reps, setReps] = useState(exercise.repetitions || '');

  // Rastrear el último valor guardado en DB, independiente del prop
  const savedWeight = useRef(exercise.weight || '');
  const savedReps = useRef(exercise.repetitions || '');

  // Sincronizar cuando el prop cambia externamente (ej. prefill de pesos)
  useEffect(() => {
    setWeight(exercise.weight || '');
    savedWeight.current = exercise.weight || '';
  }, [exercise.weight]);

  useEffect(() => {
    setReps(exercise.repetitions || '');
    savedReps.current = exercise.repetitions || '';
  }, [exercise.repetitions]);

  const handleWeightBlur = () => {
    const trimmed = weight.trim();
    if (!onExerciseUpdate || trimmed === savedWeight.current) return;
    savedWeight.current = trimmed;
    onExerciseUpdate(exercise.id, 'weight', trimmed);
  };

  const handleRepsBlur = () => {
    const trimmed = reps.trim();
    if (!onExerciseUpdate || trimmed === savedReps.current) return;
    savedReps.current = trimmed;
    onExerciseUpdate(exercise.id, 'repetitions', trimmed);
  };

  return (
    <div
      onClick={onSelect}
      className={`rounded-2xl p-3 cursor-pointer transition-all border ${
        isSelected
          ? 'bg-gray-700/70 border-gray-500'
          : 'bg-gray-800/60 border-transparent active:border-gray-600'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        {isSelected && (
          <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse shrink-0" />
        )}
        <span className={`font-bold text-sm leading-snug flex-1 ${
          isSelected ? 'text-brand-300' : 'text-white'
        }`}>
          {exercise.name}
        </span>
      </div>
      <div className="flex gap-2 text-xs">
        <div className="flex-1 bg-gray-700/50 rounded-xl px-2 py-1.5 text-center">
          <span className="block text-gray-500 text-[10px] mb-0.5">Series</span>
          <span className="font-bold text-white">{exercise.series}</span>
        </div>
        <div
          className="flex-1 bg-gray-700/50 rounded-xl px-2 py-1.5 text-center"
          onClick={e => e.stopPropagation()}
        >
          <span className="block text-gray-500 text-[10px] mb-0.5">Reps</span>
          <input
            className="w-full bg-transparent font-bold text-white text-center outline-none text-xs"
            value={reps}
            placeholder="—"
            onChange={e => setReps(e.target.value)}
            onBlur={handleRepsBlur}
          />
        </div>
        <div
          className="flex-1 bg-gray-700/50 rounded-xl px-2 py-1.5 text-center"
          onClick={e => e.stopPropagation()}
        >
          <span className="block text-gray-500 text-[10px] mb-0.5">Peso</span>
          <input
            className="w-full bg-transparent font-bold text-white text-center outline-none text-xs"
            value={weight}
            placeholder="—"
            onChange={e => setWeight(e.target.value)}
            onBlur={handleWeightBlur}
          />
        </div>
      </div>
    </div>
  );
}
