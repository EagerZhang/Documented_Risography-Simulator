import { useState } from 'react';
import ColorPicker from './ColorPicker';

const FONT_FAMILY = "'Times New Roman', Times, serif";

export default function TextTool({ onAddText, inkColor, onInkColorChange }) {
  const [text,        setText]        = useState('');
  const [fontSize,    setFontSize]    = useState(48);
  const [charSpacing, setCharSpacing] = useState(0);
  const [lineHeight,  setLineHeight]  = useState(1.16);

  const handleAdd = () => {
    onAddText(text || 'Type here', FONT_FAMILY, inkColor, fontSize, charSpacing, lineHeight);
    setText('');
  };

  return (
    <div className="space-y-4">
      {/* Text input */}
      <div>
        <p className="text-[10px] text-black/80 uppercase tracking-wider mb-2">Text Content</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text..."
          rows={2}
          className="w-full bg-[#eeeeee] border border-black rounded-lg px-2.5 py-2 text-sm text-black resize-none focus:outline-none focus:border-black placeholder:text-black/50"
          style={{ fontFamily: FONT_FAMILY }}
        />
      </div>

      {/* Font label */}
      <div className="px-2.5 py-2 bg-[#eeeeee] border border-black rounded-lg text-sm text-black/80"
           style={{ fontFamily: FONT_FAMILY }}>
        Times New Roman
      </div>

      {/* Font size */}
      <div>
        <p className="text-[10px] text-black/80 uppercase tracking-wider mb-2">
          Size — <span className="text-black">{fontSize}px</span>
        </p>
        <input
          type="range" min={12} max={160} value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="w-full accent-gray-800 h-1.5"
        />
      </div>

      {/* Kerning (tracking) */}
      <div>
        <p className="text-[10px] text-black/80 uppercase tracking-wider mb-2">
          Kerning — <span className="text-black">{charSpacing > 0 ? `+${charSpacing}` : charSpacing}</span>
        </p>
        <input
          type="range" min={-100} max={600} step={10} value={charSpacing}
          onChange={(e) => setCharSpacing(Number(e.target.value))}
          className="w-full accent-gray-800 h-1.5"
        />
      </div>

      {/* Line height */}
      <div>
        <p className="text-[10px] text-black/80 uppercase tracking-wider mb-2">
          Line Height — <span className="text-black">{lineHeight.toFixed(2)}</span>
        </p>
        <input
          type="range" min={0.8} max={3.0} step={0.05} value={lineHeight}
          onChange={(e) => setLineHeight(Number(e.target.value))}
          className="w-full accent-gray-800 h-1.5"
        />
      </div>

      <ColorPicker value={inkColor} onChange={onInkColorChange} />

      <button
        onClick={handleAdd}
        className="w-full py-2 rounded-lg bg-[#eeeeee] hover:bg-black hover:text-white text-black text-sm font-medium border border-black transition-colors"
      >
        Add Text
      </button>
    </div>
  );
}
