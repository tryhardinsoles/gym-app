const COLORS = [
  '#ef4444', // 1 - red
  '#f97316', // 2
  '#f97316', // 3
  '#eab308', // 4
  '#eab308', // 5
  '#84cc16', // 6
  '#84cc16', // 7
  '#22c55e', // 8
  '#22c55e', // 9
  '#16a34a', // 10 - green
];

export default function WellbeingScale({ selected, onSelect }) {
  return (
    <div className="flex justify-between gap-1">
      {COLORS.map((color, i) => {
        const value = i + 1;
        const isSelected = selected === value;
        return (
          <button
            key={value}
            onClick={() => onSelect(value)}
            className="flex-1 flex flex-col items-center gap-1 group"
          >
            <div
              className="w-full aspect-square rounded-xl flex items-center justify-center text-sm font-black transition-all duration-200"
              style={{
                backgroundColor: isSelected ? color : `${color}33`,
                border: `2px solid ${isSelected ? color : 'transparent'}`,
                color: isSelected ? '#fff' : color,
                transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                boxShadow: isSelected ? `0 0 16px ${color}88` : 'none',
              }}
            >
              {value}
            </div>
          </button>
        );
      })}
    </div>
  );
}
