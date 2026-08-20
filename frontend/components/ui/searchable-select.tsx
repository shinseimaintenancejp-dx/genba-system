"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";

export interface SearchableSelectOption {
  label: string;
  value: string;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: boolean;
  id?: string;
  name?: string;
}

export const SearchableSelect = React.forwardRef<HTMLDivElement, SearchableSelectProps>(
  ({ options, value, onChange, placeholder = "選択してください", disabled = false, className = "", error = false, id, name }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Handle closing when disabled
    useEffect(() => {
      if (disabled) {
        setIsOpen(false);
      }
    }, [disabled]);

    const filteredOptions = options.filter((opt) =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div 
        ref={(node) => {
          // Merge forwarded ref and local wrapper ref
          wrapperRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        className={`relative w-full ${className}`} 
        id={id}
      >
        {/* Hidden input for react-hook-form integration if needed */}
        {name && <input type="hidden" name={name} value={value} />}
        
        <div
          className={`flex items-center justify-between min-h-10 px-3 py-2 w-full rounded-lg border bg-white text-sm transition-all cursor-pointer ${
            disabled ? "opacity-60 cursor-not-allowed bg-slate-50" : "hover:border-blue-400"
          } ${
            error ? "border-red-500 focus:ring-1 focus:ring-red-500" : isOpen ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          }`}
          onClick={() => {
            if (!disabled) {
              setIsOpen(!isOpen);
              setSearchQuery("");
            }
          }}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!disabled) setIsOpen(!isOpen);
            }
          }}
        >
          <span className={`block truncate ${!selectedOption ? "text-slate-500" : "text-slate-800"}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>

        {isOpen && !disabled && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center px-3 border-b border-slate-100 bg-slate-50">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="検索..."
                className="h-10 w-full px-2 text-sm bg-transparent outline-none text-slate-800 placeholder:text-slate-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
            
            <div className="max-h-60 overflow-y-auto p-1">
              {filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-500">
                  該当する項目がありません
                </div>
              ) : (
                filteredOptions.map((opt) => (
                  <div
                    key={opt.value}
                    className={`flex items-center px-3 py-2 cursor-pointer rounded-md text-sm transition-colors ${
                      value === opt.value
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                  >
                    {opt.label}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);
SearchableSelect.displayName = "SearchableSelect";
