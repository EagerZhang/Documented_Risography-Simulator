import { RISO_COLORS } from '../../utils/risoColors';

export default function ColorPicker({ value, onChange, label = 'Ink Color' }) {
  return (
    <div>
      <p className="text-[10px] text-black/80 uppercase tracking-wider mb-2">{label}</p>
      <div className="grid grid-cols-4 gap-1.5">
        {RISO_COLORS.map((color) => (
          <button
            key={color.id}
            title={color.name}
            onClick={() => onChange(color.hex)}
            className="relative w-full aspect-square rounded-md transition-transform hover:scale-105 focus:outline-none border border-black"
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
      <div className="mt-2 flex items-center gap-2 rounded-md border border-black bg-[#eeeeee] px-2 py-1.5">
        <div
          className="w-4 h-4 rounded-sm border border-black flex-shrink-0"
          style={{ backgroundColor: value }}
        />
        <span className="text-[11px] text-black/80 font-mono">{value}</span>
      </div>
    </div>
  );
}
