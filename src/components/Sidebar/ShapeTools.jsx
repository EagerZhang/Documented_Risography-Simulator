import ColorPicker from './ColorPicker';

const SHAPES = [
  { id: 'rect',     label: 'Rectangle', icon: '▭' },
  { id: 'circle',   label: 'Circle',    icon: '◯' },
  { id: 'triangle', label: 'Triangle',  icon: '△' },
  { id: 'line',     label: 'Line',      icon: '╱' },
];

export default function ShapeTools({ onAddShape, inkColor, onInkColorChange }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2">Shape</p>
        <div className="grid grid-cols-2 gap-2">
          {SHAPES.map((shape) => (
            <button
              key={shape.id}
              onClick={() => onAddShape(shape.id, inkColor)}
              className="flex flex-col items-center justify-center gap-1.5 py-3 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-500 transition-colors"
            >
              <span className="text-2xl leading-none">{shape.icon}</span>
              <span className="text-[10px] text-zinc-400">{shape.label}</span>
            </button>
          ))}
        </div>
      </div>
      <ColorPicker value={inkColor} onChange={onInkColorChange} />
    </div>
  );
}
