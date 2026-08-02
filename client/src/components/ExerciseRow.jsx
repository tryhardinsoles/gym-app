import { useState } from 'react';

export default function ExerciseRow({ exercise, isSelected, onSelect, onExerciseUpdate }) {
  const [weight, setWeight] = useState(exercise.weight || '');

  const handleWeightBlur = () => {
    if (!onExerciseUpdate || weight === (exercise.weight || '')) return;
    onExerciseUpdate(exercise.id, 'weight', weight.trim());
  };

  return (
    <div
      onClick={onSelect}
      className={`rounded-2xl p-3 cursor-pointer transition-all border-2 ${
        isSelected
          ? 'bg-brand-500/10 border-brand-500'
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
        <div className="flex-1 bg-gray-700/50 rounded-xl px-2 py-1.5 text-center">
          <span className="block text-gray-500 text-[10px] mb-0.5">Reps</span>
          <span className="font-bold text-white">{exercise.repetitions}</span>
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
