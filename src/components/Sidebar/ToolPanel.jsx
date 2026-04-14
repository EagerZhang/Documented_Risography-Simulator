import { useState } from 'react';
import PaperSelector    from './PaperSelector';
import ShapeTools       from './ShapeTools';
import TextTool         from './TextTool';
import ImageUpload      from './ImageUpload';
import ObjectProperties from './ObjectProperties';
import SmudgePalette    from './SmudgePalette';

const TOOLS = [
  { id: 'paper',  label: 'Paper',  icon: '📄' },
  { id: 'shape',  label: 'Shapes', icon: '◧' },
  { id: 'text',   label: 'Text',   icon: 'T' },
  { id: 'image',  label: 'Image',  icon: '🖼' },
];

export default function ToolPanel({
  paperColor, onPaperChange,
  onAddShape, onAddText, onAddImage,
  inkColor, onInkColorChange,
  onApplySmudge, onPreviewSmudge,
  // object adjustment props
  activeObjectType,
  activeObjectProps,
  onOpacityChange,
  onContrastChange,
}) {
  const [activeTool,      setActiveTool]      = useState('paper');
  const [smudgePanelOpen, setSmudgePanelOpen] = useState(false);
  const [savedColor,      setSavedColor]      = useState(null);
  const hasSelection = !!activeObjectType;

  // Close smudge panel (and restore preview) when selection is cleared
  if (!hasSelection && smudgePanelOpen) {
    if (savedColor) onPreviewSmudge?.(savedColor);
    setSmudgePanelOpen(false);
    setSavedColor(null);
  }

  const toggleSmudgePanel = () => {
    if (!smudgePanelOpen) {
      // Opening: save current color so we can restore on cancel
      setSavedColor(inkColor);
      setSmudgePanelOpen(true);
    } else {
      // Closing without apply: restore the original color preview
      if (savedColor) onPreviewSmudge?.(savedColor);
      setSavedColor(null);
      setSmudgePanelOpen(false);
    }
  };

  const handleApplySmudge = (recipe) => {
    onApplySmudge?.(recipe);
    setSavedColor(null);
    setSmudgePanelOpen(false);
  };

  return (
    <aside className="w-56 flex-shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full overflow-hidden">
      {/* Tool tabs */}
      <div className="grid grid-cols-4 border-b border-zinc-800">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            title={tool.label}
            className={`flex flex-col items-center justify-center py-3 gap-1 text-xs transition-colors ${
              activeTool === tool.id
                ? 'bg-zinc-800 text-amber-400 border-b-2 border-amber-400'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span className="text-base leading-none">{tool.icon}</span>
            <span className="text-[9px] uppercase tracking-wide">{tool.label}</span>
          </button>
        ))}
      </div>

      {/* Tool options — scrollable middle section */}
      <div className="flex-1 overflow-y-auto p-3 min-h-0">
        {activeTool === 'paper' && (
          <PaperSelector value={paperColor} onChange={onPaperChange} />
        )}
        {activeTool === 'shape' && (
          <ShapeTools
            onAddShape={onAddShape}
            inkColor={inkColor}
            onInkColorChange={onInkColorChange}
          />
        )}
        {activeTool === 'text' && (
          <TextTool
            onAddText={onAddText}
            inkColor={inkColor}
            onInkColorChange={onInkColorChange}
          />
        )}
        {activeTool === 'image' && (
          <ImageUpload
            onAddImage={onAddImage}
            inkColor={inkColor}
            onInkColorChange={onInkColorChange}
          />
        )}
      </div>

      {/* Smudge zone — only visible when an object is selected */}
      {hasSelection && (
        <div className="border-t border-zinc-800">
          {/* Toggle button */}
          <button
            onClick={toggleSmudgePanel}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold transition-colors ${
              smudgePanelOpen
                ? 'bg-zinc-800 text-amber-400'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <span className="uppercase tracking-widest">Apply Smudge Color</span>
            <span className={`transition-transform ${smudgePanelOpen ? 'rotate-180' : ''}`}>▾</span>
          </button>

          {/* Collapsible panel */}
          {smudgePanelOpen && (
            <div className="px-3 pb-3 bg-zinc-850 border-t border-zinc-800">
              <SmudgePalette
              onApply={handleApplySmudge}
              onPreview={onPreviewSmudge}
              onClearPreview={() => savedColor && onPreviewSmudge?.(savedColor)}
            />
            </div>
          )}
        </div>
      )}

      {/* Object adjustments — fixed at bottom, shown only when something is selected */}
      {hasSelection && (
        <ObjectProperties
          objectType={activeObjectType}
          opacity={activeObjectProps.opacity}
          brightness={activeObjectProps.brightness}
          contrast={activeObjectProps.contrast}
          onOpacityChange={onOpacityChange}
          onContrastChange={onContrastChange}
        />
      )}
    </aside>
  );
}
