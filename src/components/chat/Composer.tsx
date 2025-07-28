"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronUpDownIcon, GlobeAltIcon, MagnifyingGlassPlusIcon, PaperAirplaneIcon } from "@heroicons/react/24/solid";
import { getAvailableModels, defaultModel } from "@/lib/models";

const modes = [
  { id: "chat", icon: null },
  { id: "web", icon: GlobeAltIcon },
  { id: "deep", icon: MagnifyingGlassPlusIcon },
];

export default function Composer({ onSend }: { onSend: (data: { text: string; model: string; mode: string }) => void }) {
  const [text, setText] = useState("");
  const [model, setModel] = useState(defaultModel);
  const [mode, setMode] = useState("chat");
  const models = getAvailableModels();
  const [showMenu, setShowMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleSend = () => {
    if (!text.trim()) return;
    navigator.vibrate?.(10);
    onSend({ text: text.trim(), model, mode });
    setText("");
  };

  const cycleModes = () => {
    const idx = modes.findIndex(m => m.id === mode);
    setMode(modes[(idx + 1) % modes.length].id);
  };

  const ModeIcon = modes.find(m => m.id === mode)?.icon;
  const isActive = mode !== "chat";

  return (
    <div className="pb-[max(env(safe-area-inset-bottom),12px)] px-3 sm:px-4 py-3">
      <div className="simple-glass-input">
        <div className="flex items-end gap-2 p-3">
          {/* Mobile-first layout */}
          <div className="flex-1 relative min-w-0">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="Type…"
              className="w-full resize-none bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 min-h-[40px] leading-6 text-base"
              rows={1}
              style={{ fontSize: "16px" }} // Prevents zoom on iOS
              enterKeyHint="send"
              aria-label="Message input"
            />
          </div>
          
          {/* Inline controls for mobile */}
          <div className="flex items-center gap-1">
            <button
              onClick={cycleModes}
              className={`p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${isActive ? "text-amber-500 bg-amber-50 dark:bg-amber-500/10" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
              aria-label={`Mode: ${mode}`}
            >
              {ModeIcon ? <ModeIcon className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
            </button>
            
            <button
              onClick={handleSend}
              disabled={!text.trim()}
              className="w-10 h-10 bg-gradient-to-r from-amber-400 to-orange-600 hover:from-amber-500 hover:to-orange-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-all duration-150 min-h-[44px] min-w-[44px]"
              aria-label="Send"
            >
              <PaperAirplaneIcon className="w-4 h-4 text-white -rotate-45" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Model selector below input for mobile */}
      <div className="mt-2 flex items-center justify-center">
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-zinc-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700 transition-all min-h-[44px]"
            aria-label="Select model"
          >
            <span className="truncate">{models.find(m => m.id === model)?.icon} {models.find(m => m.id === model)?.label}</span>
            <ChevronUpDownIcon className="w-4 h-4 flex-shrink-0" />
          </button>
          {showMenu && (
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg min-w-48 z-10">
              {models.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setModel(m.id); setShowMenu(false); }}
                  className="w-full text-left px-3 py-3 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700 first:rounded-t-lg last:rounded-b-lg transition-colors"
                >
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}