import { useRef, useState } from 'react';
import { colorizeImage, cmykSplitImage } from '../../utils/imageProcessor';
import ColorPicker from './ColorPicker';

const CMYK_LABELS = [
  { color: '#00AEEF', label: 'C' },
  { color: '#FF48B0', label: 'M' },
  { color: '#FFB511', label: 'Y' },
  { color: '#000000', label: 'K' },
];

export default function ImageUpload({ onAddImage, inkColor, onInkColorChange }) {
  const inputRef   = useRef(null);
  const [mode,     setMode]     = useState('single');
  const [loading,  setLoading]  = useState(false);
  const [preview,  setPreview]  = useState(null);
  const [error,    setError]    = useState('');

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please upload a PNG or image file.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      if (mode === 'cmyk') {
        const channels = await cmykSplitImage(file);
        setPreview(channels[0].dataUrl);
        for (const { dataUrl, risoColor } of channels) {
          onAddImage(dataUrl, risoColor, dataUrl);
        }
      } else {
        const { colorizedDataUrl, originalDataUrl } = await colorizeImage(file, inkColor);
        setPreview(colorizedDataUrl);
        onAddImage(colorizedDataUrl, inkColor, originalDataUrl);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to process image.');
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div>
        <p className="text-[10px] text-black/80 uppercase tracking-wider mb-2">Import Mode</p>
        <div className="grid grid-cols-2 gap-1">
          {[
            { id: 'single', label: 'Single Ink' },
            { id: 'cmyk',   label: '4-Channel' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => { setMode(id); setPreview(null); }}
              className={`py-1.5 text-xs rounded transition-colors ${
                mode === id
                  ? 'bg-[#e4e4e4] text-black font-medium border border-black'
                  : 'bg-[#eeeeee] text-black/70 hover:bg-black hover:text-white border border-black'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* CMYK channel legend */}
      {mode === 'cmyk' && (
        <div className="flex items-center gap-1.5">
          {CMYK_LABELS.map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1">
              <span
                className="w-3 h-3 rounded-sm inline-block border border-black"
                style={{ backgroundColor: color }}
              />
              <span className="text-[10px] text-black/80">{label}</span>
            </div>
          ))}
          <span className="text-[10px] text-black/60 ml-1">auto-mapped</span>
        </div>
      )}

      {/* Drop zone */}
      <div>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 border border-dashed border-black rounded-lg p-4 cursor-pointer transition-colors text-center bg-[#eeeeee]"
        >
          {loading ? (
            <span className="text-black/80 text-sm">Processing…</span>
          ) : preview ? (
            <img src={preview} alt="preview" className="max-h-20 object-contain opacity-70" />
          ) : (
            <>
              <span className="text-3xl">📁</span>
              <span className="text-xs text-black/60">Click or drag PNG here</span>
            </>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>

      {/* Color picker — only in single ink mode */}
      {mode === 'single' && (
        <ColorPicker value={inkColor} onChange={onInkColorChange} />
      )}

      <p className="text-[10px] text-black/60 leading-relaxed">
        {mode === 'cmyk'
          ? 'Image colors are split into C, M, Y, K channels and mapped to 4 ink layers automatically.'
          : 'Dark areas of the image will render with more ink. Light areas become transparent.'}
      </p>
    </div>
  );
}
