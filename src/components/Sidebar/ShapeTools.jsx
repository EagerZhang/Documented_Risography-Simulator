import ColorPicker from './ColorPicker';

const SHAPES = [
  { id: 'rect',             label: 'Rectangle (Filled)',  icon: '■' },
  { id: 'circle',           label: 'Circle (Filled)',     icon: '●' },
  { id: 'triangle',         label: 'Triangle (Filled)',   icon: '▲' },
  { id: 'rect-outline',     label: 'Rectangle (Outline)', icon: '□' },
  { id: 'circle-outline',   label: 'Circle (Outline)',    icon: '◯' },
  { id: 'triangle-outline', label: 'Triangle (Outline)',  icon: '△' },
  { id: 'line',             label: 'Line',                icon: '╱' },
];

export default function ShapeTools({ onAddShape, inkColor, onInkColorChange }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] text-black/80 uppercase tracking-wider mb-2">Add Shape</p>
        <div className="grid grid-cols-3 gap-2">
          {SHAPES.map((shape) => (
            <button
              key={shape.id}
              onClick={() => onAddShape(shape.id, inkColor)}
              className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg bg-[#eeeeee] hover:bg-black hover:text-white border border-black transition-colors"
              title={shape.label}
            >
              <span className="text-2xl leading-none">{shape.icon}</span>
            </button>
          ))}
        </div>
      </div>
      <ColorPicker value={inkColor} onChange={onInkColorChange} />
    </div>
  );
}
