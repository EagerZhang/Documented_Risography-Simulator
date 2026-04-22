import { useState } from 'react';
import ShapeTools       from './ShapeTools';
import TextTool         from './TextTool';
import ImageUpload      from './ImageUpload';
import ObjectProperties from './ObjectProperties';

const TOOLS = [
  { id: 'shape',  label: 'Shapes' },
  { id: 'text',   label: 'Text' },
  { id: 'image',  label: 'Image' },
];

export default function ToolPanel({
  onAddShape, onAddText, onAddImage,
  inkColor, onInkColorChange,
  // object adjustment props
  activeObjectType,
  activeObjectProps,
  onOpacityChange,
  onContrastChange,
  onFontSizeChange,
  onCharSpacingChange,
  onLineHeightChange,
  onStrokeWidthChange,
}) {
  const [activeTool, setActiveTool] = useState('shape');
  const hasSelection = !!activeObjectType;
  const activeToolLabel = TOOLS.find((tool) => tool.id === activeTool)?.label ?? 'Tool';

  return (
    <aside className="w-[26rem] flex-shrink-0 rounded-2xl border border-black bg-[#eeeeee] flex flex-row overflow-hidden">
      {/* Left narrow column: tool tabs + controls */}
      <div className="w-52 flex-shrink-0 flex flex-col min-h-0">
        <div className="grid grid-cols-3 p-2 gap-2 border-b border-black">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              title={tool.label}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTool === tool.id
                  ? 'bg-[#e4e4e4] text-black border border-black'
                  : 'bg-[#eeeeee] text-black/70 border border-black/40 hover:bg-black hover:text-white'
              }`}
            >
              <span>{tool.label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-black/80 mb-3">
            {activeToolLabel} Controls
          </p>
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
      </div>

      {/* Right narrow column: adjustments */}
      <div className="flex-1 min-h-0 border-l border-black overflow-hidden">
        {hasSelection ? (
          <ObjectProperties
            objectType={activeObjectType}
            opacity={activeObjectProps.opacity}
            contrast={activeObjectProps.contrast}
            fontSize={activeObjectProps.fontSize}
            charSpacing={activeObjectProps.charSpacing}
            lineHeight={activeObjectProps.lineHeight}
            strokeWidth={activeObjectProps.strokeWidth}
            strokeObject={activeObjectProps.strokeObject}
            onOpacityChange={onOpacityChange}
            onContrastChange={onContrastChange}
            onFontSizeChange={onFontSizeChange}
            onCharSpacingChange={onCharSpacingChange}
            onLineHeightChange={onLineHeightChange}
            onStrokeWidthChange={onStrokeWidthChange}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center px-4 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-black/80 mb-1">
              Adjustments
            </p>
            <p className="text-xs text-black/60">Select an object to edit its properties.</p>
          </div>
        )}
      </div>
    </aside>
  );
}
