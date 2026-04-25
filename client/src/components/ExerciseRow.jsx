const FEEDBACK_OPTIONS = [
  { value: 'green',  label: 'Fácil',       bg: 'bg-green-500/20',  border: 'border-green-500',  text: 'text-green-400',  dot: 'bg-green-500'  },
  { value: 'yellow', label: 'Correcto',    bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400', dot: 'bg-yellow-500' },
  { value: 'red',    label: 'No cumplió',  bg: 'bg-red-500/20',    border: 'border-red-500',    text: 'text-red-400',    dot: 'bg-red-500'    },
];

export default function ExerciseRow({ exercise, feedback, onFeedback }) {
  const openVideo = () => {
    const url = exercise.youtubeUrl ||
      `https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.name + ' ejercicio fitness')}`;
    window.open(url, '_blank', 'noopener');
  };

  return (
    <div className="bg-gray-800/60 rounded-2xl p-4 space-y-3">
      {/* Exercise name + stats */}
      <div className="flex items-start justify-between gap-3">
        <button onClick={openVideo} className="exercise-name text-left text-base leading-snug">
          {exercise.name}
        </button>
        <div className="flex gap-2 shrink-0 text-xs text-gray-400 font-semibold">
          {exercise.weight && (
            <span className="bg-gray-700 px-2 py-1 rounded-lg">{exercise.weight}</span>
          )}
        </div>
      </div>

      {/* Reps / Series */}
      <div className="flex gap-3 text-sm">
        <div className="flex-1 bg-gray-700/50 rounded-xl px-3 py-2 text-center">
          <span className="block text-xs text-gray-500 mb-0.5">Reps</span>
          <span className="font-bold text-white">{exercise.repetitions}</span>
        </div>
        <div className="flex-1 bg-gray-700/50 rounded-xl px-3 py-2 text-center">
          <span className="block text-xs text-gray-500 mb-0.5">Series</span>
          <span className="font-bold text-white">{exercise.series}</span>
        </div>
      </div>

      {/* Feedback buttons */}
      <div className="flex gap-2">
        {FEEDBACK_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => onFeedback(exercise.id, opt.value)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-xs font-bold transition-all duration-200
              ${feedback === opt.value
                ? `${opt.bg} ${opt.border} ${opt.text} scale-105`
                : 'bg-gray-700/40 border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
          >
            <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
