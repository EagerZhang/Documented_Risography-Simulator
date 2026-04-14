import { useState } from 'react';
import { RISO_FONTS } from '../../utils/risoColors';
import ColorPicker from './ColorPicker';

export default function TextTool({ onAddText, inkColor, onInkColorChange }) {
  const [text,       setText]       = useState('');
  const [fontId,     setFontId]     = useState(RISO_FONTS[0].id);
  const [fontSize,   setFontSize]   = useState(48);

  const selectedFont = RISO_FONTS.find((f) => f.id === fontId) || RISO_FONTS[0];

  const handleAdd = () => {
    onAddText(text || 'Type here', selectedFont.family, inkColor, fontSize);
    setText('');
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2">Text Content</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text..."
          rows={2}
          className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-100 resize-none focus:outline-none focus:border-amber-400 placeholder:text-zinc-600"
        />
      </div>

      <div>
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2">Font</p>
        <div className="space-y-1">
          {RISO_FONTS.map((font) => (
            <button
              key={font.id}
              onClick={() => setFontId(font.id)}
              className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors border ${
                fontId === font.id
                  ? 'bg-zinc-700 border-amber-400 text-white'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500'
              }`}
              style={{ fontFamily: font.family }}
            >
              {font.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2">
          Font Size — <span className="text-zinc-200">{fontSize}px</span>
        </p>
        <input
          type="range"
          min={12}
          max={160}
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="w-full accent-amber-400"
        />
      </div>

      <ColorPicker value={inkColor} onChange={onInkColorChange} />

      <button
        onClick={handleAdd}
        className="w-full py-2 rounded bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold transition-colors"
      >
        Add Text
      </button>
    </div>
  );
}
