"use client";

import React, { useState, useRef, useEffect } from "react";
import { useFieldArray, useFormContext, Controller } from "react-hook-form";
import { Copy, Plus, Trash2, ChevronDown, MapPin, Briefcase, Settings } from "lucide-react";
import { 
  useCleaningAreas, 
  useCreateCleaningArea,
  useDailyWorkTypes,
  useCreateDailyWorkType,
  useFrequencies,
  useCreateFrequency,
} from "@/hooks/useManuals";
import { CleaningAreaMasterDialog } from "../manuals/CleaningAreaMasterDialog";
import { DailyWorkTypeMasterDialog } from "../manuals/DailyWorkTypeMasterDialog";
import { FrequencyMasterDialog } from "../manuals/FrequencyMasterDialog";

const ComboboxField = ({ value, onChange, options, placeholder, disabled, onAddNew, addLabel, icon }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value || "");
  const [showAll, setShowAll] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        onChange(search);
        if (search.trim() && !options.some((o: any) => o.name === search.trim()) && onAddNew) {
          onAddNew(search.trim());
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [search, onChange]);

  const filteredOptions = (options || []).filter((opt: any) => 
    showAll || opt.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={wrapperRef}>
      {disabled ? (
        <div className="px-3 py-2.5 w-full rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 break-all leading-snug">
          {search || <span className="text-slate-400">{placeholder}</span>}
        </div>
      ) : (
        <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden focus-within:ring-1 focus-within:ring-[#1E60F2]">
          <input
            type="text"
            placeholder={placeholder}
            value={search}
            title={search}
            onChange={(e) => {
              setSearch(e.target.value);
              onChange(e.target.value);
              setIsOpen(true);
              setShowAll(false);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setIsOpen(false);
                onChange(search);
                if (search.trim() && !options.some((o: any) => o.name === search.trim()) && onAddNew) {
                  onAddNew(search.trim());
                }
              }
            }}
            className="h-10 px-3 w-full text-sm outline-none bg-transparent"
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isOpen) {
                setIsOpen(true);
                setShowAll(true);
              } else {
                setIsOpen(false);
              }
            }}
            className="h-10 px-2 flex items-center justify-center"
          >
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}
      
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filteredOptions.map((opt: any) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                setSearch(opt.name);
                onChange(opt.name);
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
            >
              {icon && <div className="shrink-0 text-slate-400">{icon}</div>}
              {opt.name}
            </button>
          ))}
          {filteredOptions.length === 0 && !search.trim() && (
            <div className="px-3 py-2 text-sm text-slate-500 text-center">該当なし</div>
          )}
        </div>
      )}
    </div>
  );
};

interface DailyWorkContentEditorProps {
  name: string; // "dailyWorkContents"
  readOnly?: boolean;
}

export const DailyWorkContentEditor: React.FC<DailyWorkContentEditorProps> = ({ name, readOnly = false }) => {
  const { control, watch } = useFormContext();
  const { fields, append, remove, insert } = useFieldArray({ control, name });
  const isOrdering = watch("contractType") === "ORDERING";

  const { data: areasData } = useCleaningAreas();
  const createAreaMutation = useCreateCleaningArea();

  const { data: workTypesData } = useDailyWorkTypes();
  const createWorkTypeMutation = useCreateDailyWorkType();

  const { data: frequenciesData } = useFrequencies();
  const createFrequencyMutation = useCreateFrequency();

  const [isAreaMasterOpen, setIsAreaMasterOpen] = useState(false);
  const [isWorkTypeMasterOpen, setIsWorkTypeMasterOpen] = useState(false);
  const [isFrequencyMasterOpen, setIsFrequencyMasterOpen] = useState(false);

  return (
    <div className="space-y-3">
      {fields.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 rounded-xl border border-dashed border-slate-300 bg-slate-50">
          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-3">
            <Briefcase className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-slate-900 mb-1">作業内容が設定されていません</p>
          <p className="text-xs text-slate-500 mb-4 text-center max-w-sm leading-relaxed">
            日常清掃の対象エリア、作業内容、実施頻度を登録してください。<br />
            入力内容は現場スタッフの作業確認に使用されます。
          </p>
          <button
            type="button"
            onClick={() => append({ category: "", area: "", workContent: "", frequency: "1回/1週", sortOrder: 0 })}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg bg-[#1E60F2] text-white text-sm font-semibold hover:bg-[#0F4FD0] transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" /> 作業内容を追加
          </button>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl bg-white shadow-sm/50">
          {/* Header */}
          <div className={`hidden lg:grid gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 tracking-wide uppercase ${
            readOnly || isOrdering
              ? "grid-cols-[32px_1.5fr_3fr_2fr_1fr]"
              : "grid-cols-[32px_1.2fr_2.5fr_1.5fr_1fr_80px]"
          }`}>
            <div className="flex items-center justify-center text-slate-400">#</div>
            <div className="flex items-center gap-1.5">建物</div>
            <div className="flex items-center gap-1.5">
              場所・区域
              {!readOnly && !isOrdering && (
                <button type="button" onClick={() => setIsAreaMasterOpen(true)} className="p-1 rounded text-[#1E60F2] hover:bg-blue-50 transition-colors" title="マスタ設定">
                  <Settings className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              清掃仕様
              {!readOnly && !isOrdering && (
                <button type="button" onClick={() => setIsWorkTypeMasterOpen(true)} className="p-1 rounded text-[#1E60F2] hover:bg-blue-50 transition-colors" title="マスタ設定">
                  <Settings className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              頻度
              {!readOnly && !isOrdering && (
                <button type="button" onClick={() => setIsFrequencyMasterOpen(true)} className="p-1 rounded text-[#1E60F2] hover:bg-blue-50 transition-colors" title="マスタ設定">
                  <Settings className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {!readOnly && !isOrdering && (
              <div className="text-center">操作</div>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {fields.map((field, index) => (
              <div key={field.id} className={`relative flex flex-col lg:grid gap-3 p-4 lg:p-4 hover:bg-slate-50/50 transition-colors items-start ${
                readOnly || isOrdering
                  ? "lg:grid-cols-[32px_1.5fr_3fr_2fr_1fr]"
                  : "lg:grid-cols-[32px_1.2fr_2.5fr_1.5fr_1fr_80px]"
              }`}>
                {/* # */}
                <div className="hidden lg:flex h-10 items-center justify-center font-mono text-xs font-semibold text-slate-400">
                  {index + 1}
                </div>
                
                {/* 建物 */}
                <div className="w-full flex flex-col gap-1.5">
                  <label className="lg:hidden text-xs font-bold text-slate-600">建物</label>
                  <Controller
                    control={control}
                    name={`${name}.${index}.category`}
                    render={({ field: { value, onChange } }) => (
                      (readOnly || isOrdering) ? (
                        <div className="min-h-[40px] px-3 py-2.5 w-full rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 opacity-80 break-all whitespace-normal leading-snug min-w-0">
                          {value || "該当なし"}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={value}
                          onChange={onChange}
                          placeholder="例: 管理棟, 1F"
                          className="h-10 px-3 w-full rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-[#1E60F2] focus:ring-1 focus:ring-[#1E60F2]"
                        />
                      )
                    )}
                  />
                </div>

                {/* 場所・区域 */}
                <div className="w-full flex flex-col gap-1.5">
                  <label className="lg:hidden text-xs font-bold text-slate-600">
                    場所・区域
                    <button type="button" onClick={() => setIsAreaMasterOpen(true)} className="ml-2 text-[#1E60F2]">マスタ設定</button>
                  </label>
                  <Controller
                    control={control}
                    name={`${name}.${index}.area`}
                    render={({ field: { value, onChange } }) => (
                      <ComboboxField
                        value={value}
                        onChange={onChange}
                        options={areasData || []}
                        placeholder="例: 会議室, トイレ"
                        disabled={readOnly || isOrdering}
                        icon={<MapPin className="h-3.5 w-3.5" />}
                        onAddNew={(name: string) => {
                          createAreaMutation.mutate({ name }, {
                            onSuccess: () => onChange(name)
                          });
                        }}
                      />
                    )}
                  />
                </div>

                {/* 清掃仕様 */}
                <div className="w-full flex flex-col gap-1.5">
                  <label className="lg:hidden text-xs font-bold text-slate-600">
                    清掃仕様
                    <button type="button" onClick={() => setIsWorkTypeMasterOpen(true)} className="ml-2 text-[#1E60F2]">マスタ設定</button>
                  </label>
                  <Controller
                    control={control}
                    name={`${name}.${index}.workContent`}
                    render={({ field: { value, onChange } }) => (
                      <ComboboxField
                        value={value}
                        onChange={onChange}
                        options={workTypesData || []}
                        placeholder="例: ゴミ拾い, 床掃き拭き"
                        disabled={readOnly || isOrdering}
                        icon={<Briefcase className="h-3.5 w-3.5" />}
                        onAddNew={(val: string) => {
                          createWorkTypeMutation.mutate({ name: val }, {
                            onSuccess: () => onChange(val)
                          });
                        }}
                      />
                    )}
                  />
                </div>
                
                {/* 頻度 */}
                <div className="w-full flex flex-col gap-1.5">
                  <label className="lg:hidden text-xs font-bold text-slate-600">
                    頻度
                    <button type="button" onClick={() => setIsFrequencyMasterOpen(true)} className="ml-2 text-[#1E60F2]">マスタ設定</button>
                  </label>
                  <Controller
                    control={control}
                    name={`${name}.${index}.frequency`}
                    render={({ field: { value, onChange } }) => (
                      <ComboboxField
                        value={value}
                        onChange={onChange}
                        options={frequenciesData || []}
                        placeholder="例: 1回/1週"
                        disabled={readOnly || isOrdering}
                        onAddNew={(val: string) => {
                          createFrequencyMutation.mutate({ name: val }, {
                            onSuccess: () => onChange(val)
                          });
                        }}
                      />
                    )}
                  />
                </div>

                {/* 操作 */}
                {!readOnly && !isOrdering && (
                  <div className="w-full lg:w-auto mt-2 lg:mt-0 flex lg:justify-center items-center gap-1">
                    <button
                      type="button"
                      onClick={() => insert(index + 1, {
                        ...fields[index],
                        id: undefined // Let react-hook-form generate a new id
                      })}
                      className="h-10 w-10 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm"
                      title="複製"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="h-10 w-10 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors shadow-sm"
                      title="削除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
                
                {/* 隠しフィールド */}
                <Controller
                  control={control}
                  name={`${name}.${index}.sortOrder`}
                  defaultValue={index}
                  render={({ field }) => (
                    <input type="hidden" {...field} value={index} />
                  )}
                />
              </div>
            ))}
          </div>
          
          {!readOnly && !isOrdering && (
            <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-center">
              <button
                type="button"
                onClick={() => append({ category: "", area: "", workContent: "", frequency: "1回/1週", sortOrder: fields.length })}
                className="inline-flex items-center justify-center gap-2 h-9 px-5 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-[#1E60F2] hover:bg-blue-50 transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4" /> 行を追加
              </button>
            </div>
          )}
        </div>
      )}

      {/* Area Master Dialog */}
      <CleaningAreaMasterDialog 
        isOpen={isAreaMasterOpen} 
        onClose={() => setIsAreaMasterOpen(false)} 
      />

      {/* Work Type Master Dialog */}
      <DailyWorkTypeMasterDialog 
        isOpen={isWorkTypeMasterOpen} 
        onClose={() => setIsWorkTypeMasterOpen(false)} 
      />

      {/* Frequency Master Dialog */}
      <FrequencyMasterDialog 
        isOpen={isFrequencyMasterOpen} 
        onClose={() => setIsFrequencyMasterOpen(false)} 
      />
    </div>
  );
};
