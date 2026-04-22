import { PAPER_OPTIONS } from '../../utils/risoColors';

export default function PaperSelector({ value, onChange }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Paper Stock</p>
      <div className="grid grid-cols-3 gap-1.5">
        {PAPER_OPTIONS.map((paper) => (
          <button
            key={paper.id}
            title={paper.name}
            onClick={() => onChange(paper.hex)}
            className={`relative flex flex-col items-center gap-1 p-1.5 rounded transition-all focus:outline-none border ${
              value === paper.hex
                ? 'border-amber-400 scale-105'
                : 'border-gray-300 hover:border-gray-500'
            }`}
          >
            <div
              className="w-full aspect-square rounded-sm border border-gray-200"
              style={{ backgroundColor: paper.hex }}
            />
            <span className="text-[10px] text-gray-500 leading-tight text-center">{paper.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
