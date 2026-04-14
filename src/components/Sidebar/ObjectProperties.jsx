const TYPE_LABELS = {
  rect:     'Rectangle',
  circle:   'Circle',
  triangle: 'Triangle',
  line:     'Line',
  'i-text': 'Text',
  text:     'Text',
  image:    'Image',
};

function Slider({ label, value, min, max, step = 1, onChange, disabled = false, unit = '' }) {
  return (
    <div className={disabled ? 'opacity-30 pointer-events-none' : ''}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] text-zinc-400 uppercase tracking-widest">{label}</span>
        <span className="text-[10px] text-zinc-300 font-mono tabular-nums">
          {value > 0 && max > 0 ? '+' : ''}{value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-amber-400 h-1.5"
        disabled={disabled}
      />
      <div className="flex justify-between text-[9px] text-zinc-600 mt-0.5">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

export default function ObjectProperties({
  objectType,
  opacity,
  contrast,
  onOpacityChange,
  onContrastChange,
}) {
  const isImage   = objectType === 'image';
  const typeLabel = TYPE_LABELS[objectType] || objectType;

  return (
    <div className="border-t border-zinc-800 bg-zinc-900">
      {/* Header */}
      <div className="px-3 py-2 border-b border-zinc-800 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        <p className="text-[10px] text-zinc-400 uppercase tracking-widest">
          {typeLabel} — Adjustments
        </p>
      </div>

      <div className="px-3 py-3 space-y-4">
        {/* Opacity */}
        <Slider
          label="Opacity"
          value={Math.round(opacity * 100)}
          min={10}
          max={100}
          unit="%"
          onChange={(v) => onOpacityChange(v / 100)}
        />

        {/* Contrast — images only */}
        <div>
          <Slider
            label="Contrast"
            value={Math.round(contrast * 100)}
            min={-100}
            max={100}
            unit="%"
            onChange={(v) => onContrastChange(v / 100)}
            disabled={!isImage}
          />
          {!isImage && (
            <p className="text-[9px] text-zinc-600 mt-1">Contrast applies to images only</p>
          )}
        </div>
      </div>
    </div>
  );
}
