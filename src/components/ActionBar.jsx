import { CANVAS_SIZES } from '../utils/risoColors';

export default function ActionBar({
  canvasSize,
  onCanvasSizeChange,
  onDownload,
  onOpenSubmit,
  layerCount,
}) {
  return (
    <header className="flex items-center justify-between px-4 py-2 bg-zinc-950 border-b border-zinc-800 flex-shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span
            className="text-base font-bold tracking-tight text-amber-400 leading-none"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            RISO SIMULATOR
          </span>
          <span className="text-[9px] text-zinc-500 uppercase tracking-widest">
            Risograph Print Studio
          </span>
        </div>
        <div className="h-6 w-px bg-zinc-800" />
        <span className="text-xs text-zinc-500">{layerCount} layer{layerCount !== 1 ? 's' : ''}</span>
      </div>

      {/* Canvas Size Selector */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-zinc-500 uppercase tracking-widest">Size</label>
        <select
          value={canvasSize}
          onChange={(e) => onCanvasSizeChange(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 focus:outline-none focus:border-amber-400"
        >
          {CANVAS_SIZES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.width}×{s.height})
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-500 text-zinc-200 text-xs font-medium transition-colors"
        >
          <span>↓</span>
          Download PNG
        </button>
        <button
          onClick={onOpenSubmit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold transition-colors"
        >
          <span>✦</span>
          Submit Print
        </button>
      </div>
    </header>
  );
}
