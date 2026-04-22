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
        <span className="text-[10px] text-black/80 uppercase tracking-wider">{label}</span>
        <span className="text-[10px] text-black font-mono tabular-nums">
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
        className="w-full accent-gray-800 h-1.5"
        disabled={disabled}
      />
      <div className="flex justify-between text-[9px] text-black/60 mt-0.5">
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
  fontSize,
  charSpacing,
  lineHeight,
  strokeWidth,
  strokeObject,
  onOpacityChange,
  onContrastChange,
  onFontSizeChange,
  onCharSpacingChange,
  onLineHeightChange,
  onStrokeWidthChange,
}) {
  const isImage  = objectType === 'image';
  const isText   = objectType === 'i-text' || objectType === 'text';
  const typeLabel = TYPE_LABELS[objectType] || objectType;

  return (
    <div className="h-full bg-[#eeeeee] flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-black flex items-center gap-2 flex-shrink-0">
        <div className="w-1.5 h-1.5 rounded-full bg-black" />
        <p className="text-[10px] text-black/80 uppercase tracking-wider">
          {typeLabel} Adjustments
        </p>
      </div>

      <div className="px-3 py-3 space-y-4 overflow-y-auto flex-1 min-h-0">
        {/* Opacity */}
        <Slider
          label="Opacity"
          value={Math.round(opacity * 100)}
          min={10}
          max={100}
          unit="%"
          onChange={(v) => onOpacityChange(v / 100)}
        />

        {strokeObject && (
          <Slider
            label="Line Thickness"
            value={strokeWidth}
            min={1}
            max={24}
            unit="px"
            onChange={onStrokeWidthChange}
          />
        )}

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
            <p className="text-[9px] text-black/60 mt-1">Contrast applies to images only</p>
          )}
        </div>

        {/* Text-only controls */}
        {isText && (
          <>
            <Slider
              label="Font Size"
              value={fontSize}
              min={8}
              max={300}
              unit="px"
              onChange={onFontSizeChange}
            />
            <Slider
              label="Kerning"
              value={charSpacing}
              min={-100}
              max={600}
              step={10}
              onChange={onCharSpacingChange}
            />
            <Slider
              label="Line Height"
              value={lineHeight}
              min={0.8}
              max={3.0}
              step={0.05}
              onChange={onLineHeightChange}
            />
          </>
        )}
      </div>
    </div>
  );
}
