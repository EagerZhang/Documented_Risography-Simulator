import { useState } from 'react';
import { RISO_COLORS } from '../../utils/risoColors';
import { blendHex, blend3Hex } from '../../utils/colorBlend';

const STEPS_2 = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
const STEPS_3 = [0, 0.25, 0.5, 0.75, 1.0];

/**
 * Self-contained smudge panel, shown when an object is selected.
 * Props:
 *   onApply(recipe) — called when the user clicks "Apply and Split Color Layers"
 *     recipe = [{hex, weight}, ...]
 */
export default function SmudgePalette({ onApply, onPreview, onClearPreview }) {
  const [activeHexes,  setActiveHexes]  = useState([]);
  const [pendingHex,   setPendingHex]   = useState(null);
  const [pendingRecipe, setPendingRecipe] = useState(null);

  const handleToggle = (hex) => {
    setActiveHexes((prev) => {
      if (prev.includes(hex)) return prev.filter((h) => h !== hex);
      if (prev.length < 3) return [...prev, hex];
      return [...prev.slice(1), hex];
    });
    // Clear pending swatch and restore original preview when blend set changes
    if (pendingHex) {
      setPendingHex(null);
      setPendingRecipe(null);
      onClearPreview?.();
    }
  };

  const handleSwatchClick = (hex, recipe) => {
    setPendingHex(hex);
    setPendingRecipe(recipe);
    onPreview?.(hex);
  };

  const handleApply = () => {
    if (pendingRecipe && onApply) {
      onApply(pendingRecipe);
      // Reset after applying
      setPendingHex(null);
      setPendingRecipe(null);
      setActiveHexes([]);
    }
  };

  const [hexA, hexB, hexC] = activeHexes;

  const blendRow = activeHexes.length === 2
    ? STEPS_2.map((t) => ({
        hex:    blendHex(hexA, hexB, t),
        recipe: [
          { hex: hexA, weight: +(1 - t).toFixed(4) },
          { hex: hexB, weight: +t.toFixed(4) },
        ],
      }))
    : null;

  const blendGrid = activeHexes.length === 3
    ? STEPS_3.map((wA) =>
        STEPS_3.map((wB) => {
          const wC  = Math.max(0, 1 - wA - wB);
          let nA = wA, nB = wB, nC = wC;
          if (wA + wB > 1) { const t = wA + wB; nA = wA / t; nB = wB / t; nC = 0; }
          const hex    = blend3Hex(hexA, hexB, hexC, wA, wB);
          const recipe = [
            { hex: hexA, weight: +nA.toFixed(4) },
            { hex: hexB, weight: +nB.toFixed(4) },
            ...(nC > 0 ? [{ hex: hexC, weight: +nC.toFixed(4) }] : []),
          ].filter((c) => c.weight > 0);
          return { hex, recipe };
        })
      )
    : null;

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-400 uppercase tracking-widest">Mix Inks</p>

      {/* Ink toggles */}
      <div className="grid grid-cols-4 gap-1.5">
        {RISO_COLORS.map((color) => {
          const isActive = activeHexes.includes(color.hex);
          return (
            <button
              key={color.id}
              title={color.name}
              onClick={() => handleToggle(color.hex)}
              className="relative w-full aspect-square rounded-sm transition-transform hover:scale-110 focus:outline-none"
              style={{ backgroundColor: color.hex }}
            >
              {isActive && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <svg viewBox="0 0 10 10" className="w-3 h-3">
                    <circle cx="5" cy="5" r="4" fill="none" stroke="white" strokeWidth="1.5" />
                    <circle cx="5" cy="5" r="4" fill="none" stroke="black" strokeWidth="0.5" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeHexes.length < 2 && (
        <p className="text-[10px] text-zinc-600 italic">Select 2–3 inks to build a blend</p>
      )}

      {/* 2-ink blend row */}
      {blendRow && (
        <div>
          <p className="text-[10px] text-zinc-500 mb-1.5">Blend — click to select</p>
          <div className="flex gap-1">
            {blendRow.map(({ hex, recipe }, i) => (
              <button
                key={i}
                title={hex}
                onClick={() => handleSwatchClick(hex, recipe)}
                className={`flex-1 aspect-square rounded-sm transition-transform hover:scale-110 focus:outline-none ${
                  pendingHex === hex
                    ? 'ring-2 ring-white ring-offset-1 ring-offset-zinc-900 scale-110'
                    : ''
                }`}
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 3-ink blend grid */}
      {blendGrid && (
        <div>
          <p className="text-[10px] text-zinc-500 mb-1.5">Blend — click to select</p>
          <div className="flex flex-col gap-1">
            {blendGrid.map((row, ri) => (
              <div key={ri} className="flex gap-1">
                {row.map(({ hex, recipe }, ci) => (
                  <button
                    key={ci}
                    title={hex}
                    onClick={() => handleSwatchClick(hex, recipe)}
                    className={`flex-1 aspect-square rounded-sm transition-transform hover:scale-110 focus:outline-none ${
                      pendingHex === hex
                        ? 'ring-2 ring-white ring-offset-1 ring-offset-zinc-900 scale-110'
                        : ''
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending preview */}
      {pendingHex && (
        <div className="flex items-center gap-2 pt-1">
          <div
            className="w-4 h-4 rounded-sm border border-zinc-500 flex-shrink-0"
            style={{ backgroundColor: pendingHex }}
          />
          <span className="text-[10px] text-zinc-400 font-mono">{pendingHex}</span>
          <span className="text-[10px] text-zinc-600">selected</span>
        </div>
      )}

      {/* Apply button */}
      <button
        onClick={handleApply}
        disabled={!pendingRecipe}
        className={`w-full py-2 rounded text-xs font-bold transition-colors ${
          pendingRecipe
            ? 'bg-amber-400 hover:bg-amber-300 text-black cursor-pointer'
            : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
        }`}
      >
        Apply and Split Color Layers
      </button>
    </div>
  );
}
