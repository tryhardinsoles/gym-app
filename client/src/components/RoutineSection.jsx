import ExerciseRow from './ExerciseRow.jsx';

const SECTION_ICONS = {
  'Entrada en calor': '🔥',
  'Bloque 1': '1️⃣',
  'Bloque 2': '2️⃣',
  'Bloque 3': '3️⃣',
  'Bloque 4': '4️⃣',
};

export default function RoutineSection({ section, feedbacks, onFeedback, onExerciseUpdate }) {
  const icon = SECTION_ICONS[section.name] || '💪';
  const total = section.exercises.length;
  const done = section.exercises.filter(ex => feedbacks[ex.id]).length;

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <h2 className="text-xl font-black text-white">{section.name}</h2>
        </div>
        <span className={`text-sm font-bold px-3 py-1 rounded-full ${
          done === total ? 'bg-brand-500/20 text-brand-400' : 'bg-gray-800 text-gray-400'
        }`}>
          {done}/{total}
        </span>
      </div>

      {/* Exercises */}
      {section.exercises.map(ex => (
        <ExerciseRow
          key={ex.id}
          exercise={ex}
          feedback={feedbacks[ex.id]}
          onFeedback={onFeedback}
          onExerciseUpdate={onExerciseUpdate}
        />
      ))}
    </div>
  );
}
