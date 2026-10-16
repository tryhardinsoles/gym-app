import { useState, useRef, useEffect } from 'react';

const FEEDBACKS = [
  { value: 'green',  bg: 'bg-green-500',  ring: 'ring-green-400',  label: 'Bien' },
  { value: 'yellow', bg: 'bg-yellow-400', ring: 'ring-yellow-300', label: 'Regular' },
  { value: 'red',    bg: 'bg-red-500',    ring: 'ring-red-400',    label: 'Mal' },
];

export default function ExerciseRow({ exercise, isSelected, onSelect, onExerciseUpdate, feedback, onFeedback }) {
  const [weight, setWeight] = useState(exercise.weight || '');
  const [reps, setReps] = useState(exercise.repetitions || '');

  const savedWeight = useRef(exercise.weight || '');
  const savedReps = useRef(exercise.repetitions || '');

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

  const prWeight = exercise.prWeight ?? null;
  const currentNum = parseFloat(weight);
  const isNewPR = prWeight != null && !isNaN(currentNum) && currentNum > prWeight;

  return (
    <div
      onClick={onSelect}
      className={`rounded-2xl p-3 cursor-pointer transition-all border ${
        isSelected
          ? 'bg-gray-700/70 border-gray-500'
          : 'bg-gray-800/60 border-transparent active:border-gray-600'
      }`}
    >
      {/* Nombre + PR badge */}
      <div className="flex items-center gap-2 mb-2">
        {isSelected && (
          <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse shrink-0" />
        )}
        <span className={`font-bold text-sm leading-snug flex-1 ${
          isSelected ? 'text-brand-300' : 'text-white'
        }`}>
          {exercise.name}
        </span>
        {isNewPR && (
          <span className="text-[9px] font-black text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded-full shrink-0">
            🏅 PR
          </span>
        )}
      </div>

      {/* Series / Reps / Peso */}
      <div className="flex gap-2 text-xs mb-2">
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
          className={`flex-1 rounded-xl px-2 py-1.5 text-center transition-colors ${
            isNewPR ? 'bg-yellow-400/10' : 'bg-gray-700/50'
          }`}
          onClick={e => e.stopPropagation()}
        >
          <span className="block text-gray-500 text-[10px] mb-0.5">Peso</span>
          <input
            className={`w-full bg-transparent font-bold text-center outline-none text-xs ${
              isNewPR ? 'text-yellow-400' : 'text-white'
            }`}
            value={weight}
            placeholder="—"
            onChange={e => setWeight(e.target.value)}
            onBlur={handleWeightBlur}
          />
          {prWeight != null && (
            <span className={`block text-[8px] font-bold leading-none mt-0.5 ${
              isNewPR ? 'text-yellow-400' : 'text-gray-600'
            }`}>
              {isNewPR ? '¡nuevo máx!' : `máx ${prWeight}kg`}
            </span>
          )}
        </div>
      </div>

      {/* Semáforo de feedback */}
      {onFeedback && (
        <div
          className="flex items-center gap-2 pt-1.5 border-t border-gray-700/50"
          onClick={e => e.stopPropagation()}
        >
          <span className="text-[10px] text-gray-600 font-medium">¿Cómo se sintió?</span>
          <div className="flex gap-1.5 ml-auto">
            {FEEDBACKS.map(f => (
              <button
                key={f.value}
                onClick={() => onFeedback(exercise.id, f.value)}
                className={`w-5 h-5 rounded-full transition-all ${f.bg} ${
                  feedback === f.value
                    ? `ring-2 ${f.ring} ring-offset-1 ring-offset-gray-900 scale-110`
                    : 'opacity-30 hover:opacity-60'
                }`}
                title={f.label}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
