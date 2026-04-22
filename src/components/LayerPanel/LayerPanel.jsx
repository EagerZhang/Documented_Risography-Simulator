/**
 * LayerPanel — displays one row per Riso ink color currently in use.
 * Each row = one printing pass, matching authentic Risograph plate logic.
 * The panel list is ordered top-to-bottom = topmost pass → bottommost pass.
 */
export default function LayerPanel({
  inkLayers,
  activeId,
  onRemoveObject,
  onClearCanvas,
  onToggleInkLayer,
  onRemoveInkLayer,
  onMoveInkLayerUp,
  onMoveInkLayerDown,
  onRandomizeShift,
}) {
  // inkLayers is ordered bottom→top internally; display top→bottom in the panel
  const displayed = [...inkLayers].reverse();

  return (
    <aside className="w-64 flex-shrink-0 rounded-2xl border border-black bg-[#eeeeee] flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="px-4 py-3 border-b border-black">
        <p className="text-xs text-black/80 uppercase tracking-wide">Ink Layers</p>
        <p className="text-[10px] text-black/60 mt-0.5">One row = one print pass</p>
      </div>

      {/* Layer list */}
      <div className="flex-1 overflow-y-auto">
        {displayed.length === 0 ? (
          <p className="text-xs text-black/60 text-center mt-8 px-3 leading-relaxed">
            No ink layers yet.<br />Add shapes, text, or images.
          </p>
        ) : (
          <ul className="p-2 space-y-1">
            {displayed.map((layer, displayIdx) => {
              const isTop    = displayIdx === 0;
              const isBottom = displayIdx === displayed.length - 1;

              return (
                <li
                  key={layer.colorHex}
                  className={`flex items-center gap-2 px-2 py-2 rounded-lg group transition-colors ${
                    layer.isActive ? 'bg-[#e4e4e4]' : 'hover:bg-[#e7e7e7]'
                  }`}
                >
                  {/* Color swatch */}
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0 border border-black"
                    style={{
                      backgroundColor: layer.colorHex,
                      opacity: layer.visible ? 1 : 0.35,
                    }}
                    title={layer.colorHex}
                  />

                  {/* Name + count */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-medium truncate transition-colors ${
                        layer.visible ? 'text-black' : 'text-black/50'
                      }`}
                    >
                      {layer.colorName}
                    </p>
                    <p className="text-[10px] text-black/60">
                      {layer.objectCount} object{layer.objectCount !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Reorder — visible on hover */}
                  <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      title="Move pass up (prints later)"
                      onClick={() => onMoveInkLayerUp(layer.colorHex)}
                      disabled={isTop}
                      className="text-[10px] leading-none px-0.5 text-black/60 hover:bg-black hover:text-white rounded disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      ↑
                    </button>
                    <button
                      title="Move pass down (prints earlier)"
                      onClick={() => onMoveInkLayerDown(layer.colorHex)}
                      disabled={isBottom}
                      className="text-[10px] leading-none px-0.5 text-black/60 hover:bg-black hover:text-white rounded disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      ↓
                    </button>
                  </div>

                  {/* Show / Hide — always visible */}
                  <button
                    title={layer.visible ? 'Hide this ink layer' : 'Show this ink layer'}
                    onClick={() => onToggleInkLayer(layer.colorHex)}
                    className="text-sm flex-shrink-0 transition-colors text-black/60 hover:bg-black hover:text-white rounded px-0.5"
                  >
                    {layer.visible ? '👁' : '🚫'}
                  </button>

                  {/* Delete ink layer — always visible */}
                  <button
                    title="Delete ink layer (removes all objects of this color)"
                    onClick={() => onRemoveInkLayer(layer.colorHex)}
                    className="text-xs flex-shrink-0 text-black/60 hover:bg-black hover:text-white rounded px-0.5 transition-colors"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5 border-t border-black flex flex-col items-stretch gap-2">
        <p className="text-[10px] text-black/60">
          {inkLayers.length} ink color{inkLayers.length !== 1 ? 's' : ''}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => activeId && onRemoveObject(activeId)}
            disabled={!activeId}
            className="text-[10px] px-2 py-1.5 rounded-lg bg-[#eeeeee] border border-black text-black hover:bg-black hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Delete the selected canvas object (not the whole ink layer)"
          >
            Delete Object
          </button>
          <button
            onClick={onClearCanvas}
            disabled={inkLayers.length === 0}
            className="text-[10px] px-2 py-1.5 rounded-lg bg-[#eeeeee] border border-black text-black hover:bg-black hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Clear all objects on canvas (keeps background)"
          >
            Clear Canvas
          </button>
        </div>
      </div>

      {/* Randomize layer shift */}
      <div className="px-3 py-2.5 border-t border-black">
        <p className="text-[10px] text-black/60 uppercase tracking-wide mb-1.5">
          Layer Shift
        </p>
        <div className="flex gap-1">
          {[['S', 2], ['M', 4], ['L', 8]].map(([label, px]) => (
            <button
              key={label}
              onClick={() => onRandomizeShift(px)}
              disabled={inkLayers.length < 2}
              className="flex-1 py-1.5 text-xs rounded-lg bg-[#eeeeee] border border-black text-black hover:bg-black hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title={`Random ±${px}px offset per layer`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
