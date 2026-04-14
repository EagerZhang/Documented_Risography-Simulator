import { useState } from 'react';
import { submitDesign } from '../utils/firebase';

export default function SubmitModal({ isOpen, onClose, getDataUrl, layerCount, canvasSize }) {
  const [userName, setUserName] = useState('');
  const [note,     setNote]     = useState('');
  const [status,   setStatus]   = useState('idle'); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const isFirebaseConfigured =
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_API_KEY !== 'your_api_key_here';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const dataUrl = getDataUrl();
      if (!dataUrl) throw new Error('Could not export canvas.');

      await submitDesign(dataUrl, {
        userName: userName.trim() || 'Anonymous',
        note:     note.trim(),
        layerCount,
        canvasSize,
      });
      setStatus('success');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Submission failed.');
      setStatus('error');
    }
  };

  const handleClose = () => {
    setStatus('idle');
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2
            className="text-base font-bold text-amber-400"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            Submit Your Print
          </h2>
          <button
            onClick={handleClose}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {status === 'success' ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-3">✦</div>
              <p className="text-amber-400 font-bold mb-1">Print submitted!</p>
              <p className="text-zinc-400 text-sm">Your design has been added to the collection.</p>
              <button
                onClick={handleClose}
                className="mt-6 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm text-zinc-200 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isFirebaseConfigured && (
                <div className="bg-amber-950 border border-amber-800 rounded p-3">
                  <p className="text-amber-300 text-xs leading-relaxed">
                    Firebase is not configured yet. Copy <code className="font-mono">.env.example</code> to{' '}
                    <code className="font-mono">.env</code> and add your Firebase credentials to enable submissions.
                  </p>
                </div>
              )}

              <div>
                <label className="text-xs text-zinc-400 uppercase tracking-widest block mb-1">
                  Your Name (optional)
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Anonymous"
                  maxLength={80}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400 placeholder:text-zinc-600"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 uppercase tracking-widest block mb-1">
                  Note (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What inspired this print?"
                  rows={3}
                  maxLength={280}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 resize-none focus:outline-none focus:border-amber-400 placeholder:text-zinc-600"
                />
              </div>

              <div className="text-xs text-zinc-500 bg-zinc-800 rounded p-2 space-y-0.5">
                <p>Layers: {layerCount} — Canvas: {canvasSize}</p>
                <p>A snapshot of your canvas will be uploaded.</p>
              </div>

              {status === 'error' && (
                <p className="text-red-400 text-xs">{errorMsg}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={status === 'loading' || !isFirebaseConfigured}
                  className="flex-1 py-2 rounded bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-black text-sm font-bold transition-colors"
                >
                  {status === 'loading' ? 'Uploading…' : 'Submit →'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
