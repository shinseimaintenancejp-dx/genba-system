"use client";

import React, { useState, useRef } from "react";
import { Bold, Italic, List, Link as LinkIcon, Eye, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  minHeight?: string;
}

import { parseMarkdownToHtml } from "@/lib/markdown";
export { parseMarkdownToHtml };

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "内容を入力してください（Markdown形式対応）...",
  disabled = false,
  id,
  className,
  minHeight = "160px",
}: RichTextEditorProps) {
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertText = (before: string, after: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    const replacement = before + (selectedText || "テキスト") + after;
    const newValue = text.substring(0, start) + replacement + text.substring(end);

    onChange(newValue);

    // Focus and select the newly inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + (selectedText || "テキスト").length
      );
    }, 0);
  };

  const handleBold = (e: React.MouseEvent) => {
    e.preventDefault();
    insertText("**", "**");
  };

  const handleItalic = (e: React.MouseEvent) => {
    e.preventDefault();
    insertText("*", "*");
  };

  const handleList = (e: React.MouseEvent) => {
    e.preventDefault();
    insertText("- ");
  };

  const handleLink = (e: React.MouseEvent) => {
    e.preventDefault();
    insertText("[", "](https://)");
  };

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 overflow-hidden transition-all duration-200",
        disabled && "opacity-60 pointer-events-none bg-slate-50",
        className
      )}
    >
      {/* Editor Header / Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5 shrink-0 select-none">
        <div className="flex items-center gap-1">
          {activeTab === "write" && (
            <>
              <button
                type="button"
                onClick={handleBold}
                className="p-1.5 rounded text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-colors"
                title="太字 (Ctrl+B)"
                disabled={disabled}
              >
                <Bold className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleItalic}
                className="p-1.5 rounded text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-colors"
                title="斜体 (Ctrl+I)"
                disabled={disabled}
              >
                <Italic className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleList}
                className="p-1.5 rounded text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-colors"
                title="箇条書き (Ctrl+L)"
                disabled={disabled}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleLink}
                className="p-1.5 rounded text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-colors"
                title="リンク"
                disabled={disabled}
              >
                <LinkIcon className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* Write / Preview Tab toggle */}
        <div className="flex rounded-md border border-slate-200 bg-white p-0.5 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab("write")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-sm transition-all duration-200",
              activeTab === "write"
                ? "bg-slate-100 text-slate-800"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            <Edit3 className="h-3 w-3" />
            <span>編集</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-sm transition-all duration-200",
              activeTab === "preview"
                ? "bg-slate-100 text-slate-800"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            <Eye className="h-3 w-3" />
            <span>プレビュー</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="relative flex-grow" style={{ minHeight }}>
        {activeTab === "write" ? (
          <textarea
            id={id}
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={placeholder}
            style={{ minHeight }}
            className="w-full resize-y p-3.5 text-sm text-slate-800 border-0 focus:ring-0 focus:outline-none placeholder-slate-400 leading-relaxed font-sans"
          />
        ) : (
          <div
            style={{ minHeight }}
            className="w-full max-h-[400px] overflow-y-auto p-4 text-sm text-slate-800 leading-relaxed font-sans bg-slate-50 prose prose-slate max-w-none"
            dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(value) || `<span class="text-slate-400 italic">${placeholder}</span>` }}
          />
        )}
      </div>
    </div>
  );
}
