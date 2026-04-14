/**
 * LayerPanel — displays one row per Riso ink color currently in use.
 * Each row = one printing pass, matching authentic Risograph plate logic.
 * The panel list is ordered top-to-bottom = topmost pass → bottommost pass.
 */
export default function LayerPanel({
  inkLayers,
  activeId,
  onRemoveObject,
  onToggleInkLayer,
  onRemoveInkLayer,
  onMoveInkLayerUp,
  onMoveInkLayerDown,
}) {
  // inkLayers is ordered bottom→top internally; display top→bottom in the panel
  const displayed = [...inkLayers].reverse();

  return (
    <aside className="w-56 flex-shrink-0 bg-zinc-900 border-l border-zinc-800 flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="px-3 py-2.5 border-b border-zinc-800">
        <p className="text-xs text-zinc-400 uppercase tracking-widest">Ink Layers</p>
        <p className="text-[10px] text-zinc-600 mt-0.5">One row = one print pass</p>
      </div>

      {/* Layer list */}
      <div className="flex-1 overflow-y-auto">
        {displayed.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center mt-8 px-3 leading-relaxed">
            No ink layers yet.<br />Add shapes, text, or images.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {displayed.map((layer, displayIdx) => {
              // displayIdx 0 = top of panel = topmost pass (last in inkLayers)
              const isTop    = displayIdx === 0;
              const isBottom = displayIdx === displayed.length - 1;

              return (
                <li
                  key={layer.colorHex}
                  className={`flex items-center gap-2 px-2 py-2.5 group transition-colors ${
                    layer.isActive ? 'bg-zinc-700' : 'hover:bg-zinc-800'
                  }`}
                >
                  {/* Color swatch */}
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0 border border-zinc-600 shadow-sm"
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
                        layer.visible ? 'text-zinc-200' : 'text-zinc-600'
                      }`}
                    >
                      {layer.colorName}
                    </p>
                    <p className="text-[10px] text-zinc-600">
                      {layer.objectCount} object{layer.objectCount !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Reorder — visible on hover */}
                  <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      title="Move pass up (prints later)"
                      onClick={() => onMoveInkLayerUp(layer.colorHex)}
                      disabled={isTop}
                      className="text-[10px] leading-none px-0.5 text-zinc-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      ↑
                    </button>
                    <button
                      title="Move pass down (prints earlier)"
                      onClick={() => onMoveInkLayerDown(layer.colorHex)}
                      disabled={isBottom}
                      className="text-[10px] leading-none px-0.5 text-zinc-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      ↓
                    </button>
                  </div>

                  {/* Show / Hide — always visible */}
                  <button
                    title={layer.visible ? 'Hide this ink layer' : 'Show this ink layer'}
                    onClick={() => onToggleInkLayer(layer.colorHex)}
                    className="text-sm flex-shrink-0 transition-colors text-zinc-400 hover:text-white"
                  >
                    {layer.visible ? '👁' : '🚫'}
                  </button>

                  {/* Delete ink layer — always visible */}
                  <button
                    title="Delete ink layer (removes all objects of this color)"
                    onClick={() => onRemoveInkLayer(layer.colorHex)}
                    className="text-xs flex-shrink-0 text-zinc-500 hover:text-red-400 transition-colors"
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
      <div className="px-3 py-2.5 border-t border-zinc-800 flex items-center justify-between gap-2">
        <p className="text-[10px] text-zinc-600">
          {inkLayers.length} ink color{inkLayers.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => activeId && onRemoveObject(activeId)}
          disabled={!activeId}
          className="text-[10px] px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-red-400 hover:bg-red-950 hover:border-red-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Delete the selected canvas object (not the whole ink layer)"
        >
          Delete Object
        </button>
      </div>
    </aside>
  );
}
