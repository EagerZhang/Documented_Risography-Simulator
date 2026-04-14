import { RISO_COLORS } from '../../utils/risoColors';

export default function ColorPicker({ value, onChange, label = 'Ink Color' }) {
  return (
    <div>
      <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2">{label}</p>
      <div className="grid grid-cols-4 gap-1.5">
        {RISO_COLORS.map((color) => (
          <button
            key={color.id}
            title={color.name}
            onClick={() => onChange(color.hex)}
            className="relative w-full aspect-square rounded-sm transition-transform hover:scale-110 focus:outline-none"
            style={{ backgroundColor: color.hex }}
          >
            {value === color.hex && (
              <span className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 10 10" className="w-3 h-3">
                  <circle cx="5" cy="5" r="4" fill="none" stroke="white" strokeWidth="1.5" />
                  <circle cx="5" cy="5" r="4" fill="none" stroke="black" strokeWidth="0.5" />
                </svg>
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div
          className="w-5 h-5 rounded-sm border border-zinc-600 flex-shrink-0"
          style={{ backgroundColor: value }}
        />
        <span className="text-xs text-zinc-300 font-mono">{value}</span>
      </div>
    </div>
  );
}
