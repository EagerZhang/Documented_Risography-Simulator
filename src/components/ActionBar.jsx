export default function ActionBar({
  onDownload,
  onDownloadLayers,
}) {
  return (
    <header className="flex items-center justify-between px-5 py-3 bg-[#eeeeee] border-b border-black flex-shrink-0">
      {/* Header title */}
      <div className="min-w-0">
        <h1
          className="header-animated-title text-3xl leading-none"
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
        >
          Answers To the American Questions
        </h1>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#eeeeee] hover:bg-black hover:text-white border border-black text-black text-xs font-medium transition-colors"
        >
          <span>↓</span>
          Download PNG
        </button>
        <button
          onClick={onDownloadLayers}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#eeeeee] hover:bg-black hover:text-white border border-black text-black text-xs font-medium transition-colors"
        >
          <span>✦</span>
          Download Layered PNGs for Riso Print
        </button>
      </div>
    </header>
  );
}
