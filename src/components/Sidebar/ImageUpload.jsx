import { useRef, useState } from 'react';
import { colorizeImage } from '../../utils/imageProcessor';
import ColorPicker from './ColorPicker';

export default function ImageUpload({ onAddImage, inkColor, onInkColorChange }) {
  const inputRef   = useRef(null);
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
      const { colorizedDataUrl, originalDataUrl } = await colorizeImage(file, inkColor);
      setPreview(colorizedDataUrl);
      onAddImage(colorizedDataUrl, inkColor, originalDataUrl);
    } catch (err) {
      console.error(err);
      setError('Failed to process image.');
    } finally {
      setLoading(false);
      // Reset input so the same file can be re-uploaded
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
      <div>
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2">Upload PNG</p>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-zinc-600 hover:border-amber-400 rounded p-4 cursor-pointer transition-colors text-center"
        >
          {loading ? (
            <span className="text-zinc-400 text-sm">Processing…</span>
          ) : preview ? (
            <img src={preview} alt="preview" className="max-h-20 object-contain opacity-70" />
          ) : (
            <>
              <span className="text-3xl">📁</span>
              <span className="text-xs text-zinc-400">Click or drag PNG here</span>
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

        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </div>

      <ColorPicker value={inkColor} onChange={onInkColorChange} />

      <p className="text-[10px] text-zinc-500 leading-relaxed">
        Dark areas of the image will render with more ink. Light areas become transparent.
      </p>
    </div>
  );
}
