"use client";

import React, { useState, useRef, useEffect } from "react";
import { useFieldArray, useFormContext, Controller } from "react-hook-form";
import { Copy, Plus, Trash2, Settings, ChevronDown, MapPin, Briefcase } from "lucide-react";
import { 
  useCleaningAreas, 
  usePeriodicWorkTypes,
  useCreateCleaningArea,
  useCreatePeriodicWorkType
} from "@/hooks/useManuals";

// We will implement the master popup in a separate component and import it
import { PeriodicWorkTypeMasterDialog } from "../manuals/PeriodicWorkTypeMasterDialog";
import { CleaningAreaMasterDialog } from "../manuals/CleaningAreaMasterDialog";

const ComboboxField = ({ value, onChange, options, placeholder, disabled, onAddNew, addLabel, icon }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value || "");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        onChange(search);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [search, onChange]);

  const filteredOptions = (options || []).filter((opt: any) => 
    opt.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden focus-within:ring-1 focus-within:ring-[#1E60F2]">
        <input
          type="text"
          placeholder={placeholder}
          value={search}
          disabled={disabled}
          onChange={(e) => {
            setSearch(e.target.value);
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="h-10 px-3 w-full text-sm outline-none disabled:opacity-60 bg-transparent"
        />
        <ChevronDown className={`h-4 w-4 text-slate-400 mr-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
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
          {search.trim() && !options.some((o: any) => o.name === search.trim()) && onAddNew && (
            <button
              type="button"
              onClick={() => {
                onAddNew(search.trim());
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-[#1E60F2] hover:bg-blue-50 flex items-center gap-2 font-medium border-t border-slate-100"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" /> 「{search}」を追加
            </button>
          )}
          {filteredOptions.length === 0 && !search.trim() && (
            <div className="px-3 py-2 text-sm text-slate-500 text-center">該当なし</div>
          )}
        </div>
      )}
    </div>
  );
};

interface PeriodicWorkContentEditorProps {
  name: string; // "periodicWorkContents"
}

export const PeriodicWorkContentEditor: React.FC<PeriodicWorkContentEditorProps> = ({ name }) => {
  const { control, register, formState: { errors }, setValue } = useFormContext();
  const { fields, append, remove, insert } = useFieldArray({
    control,
    name,
  });

  const { data: areasData, isLoading: isLoadingAreas } = useCleaningAreas();
  const { data: workTypesData, isLoading: isLoadingWorkTypes } = usePeriodicWorkTypes();
  const createAreaMutation = useCreateCleaningArea();
  const createWorkTypeMutation = useCreatePeriodicWorkType();

  const [isWorkTypeDialogOpen, setIsWorkTypeDialogOpen] = useState(false);
  const [isAreaDialogOpen, setIsAreaDialogOpen] = useState(false);

  const handleCopy = (index: number) => {
    const itemToCopy = fields[index] as any;
    insert(index + 1, {
      floor: itemToCopy.floor,
      area: itemToCopy.area,
      workContent: itemToCopy.workContent,
      sortOrder: fields.length,
    });
  };

  return (
    <div className="space-y-4">
      {fields.length === 0 ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 bg-slate-50 rounded-xl p-8">
          <p className="text-sm text-slate-500 mb-4">作業内容が登録されていません</p>
          <button
            type="button"
            onClick={() => append({ floor: "", area: "", workContent: "", sortOrder: 0 })}
            className="flex items-center gap-2 h-10 px-4 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-[#1E60F2] hover:bg-slate-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            作業を追加
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="hidden sm:grid grid-cols-[1fr_2fr_2fr_auto] gap-3 px-1 text-xs font-semibold text-slate-500">
            <div>階数</div>
            <div className="flex items-center gap-2">
              場所・区域
              <button type="button" onClick={() => setIsAreaDialogOpen(true)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700">
                <Settings className="h-3 w-3" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              作業内容
              <button type="button" onClick={() => setIsWorkTypeDialogOpen(true)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700">
                <Settings className="h-3 w-3" />
              </button>
            </div>
            <div className="w-[80px] text-center">操作</div>
          </div>

          {fields.map((field, index) => {
            const fieldError = (errors[name] as any)?.[index];
            return (
              <div key={field.id} className="relative group rounded-xl sm:rounded-none border sm:border-none p-4 sm:p-0 bg-white sm:bg-transparent shadow-sm sm:shadow-none flex flex-col sm:grid sm:grid-cols-[1fr_2fr_2fr_auto] gap-3 sm:items-start">
                
                {/* 階数 */}
                <div className="space-y-1">
                  <label className="sm:hidden text-xs font-semibold text-slate-500">階数</label>
                  <input
                    {...register(`${name}.${index}.floor`)}
                    placeholder="例: 1F"
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#1E60F2] focus:ring-1 focus:ring-[#1E60F2] transition-all"
                  />
                  {fieldError?.floor && (
                    <p className="text-[10px] text-destructive">{fieldError.floor.message}</p>
                  )}
                </div>

                {/* 場所・区域 */}
                <div className="space-y-1">
                  <label className="sm:hidden text-xs font-semibold text-slate-500">場所・区域</label>
                  <Controller
                    name={`${name}.${index}.area`}
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <ComboboxField
                        value={value}
                        onChange={onChange}
                        options={areasData || []}
                        placeholder="選択または入力..."
                        icon={<MapPin className="h-3.5 w-3.5" />}
                        disabled={isLoadingAreas}
                        addLabel="追加"
                        onAddNew={(val: string) => {
                          createAreaMutation.mutate({ name: val }, {
                            onSuccess: (newArea: any) => {
                              onChange(newArea?.name || val);
                            }
                          });
                        }}
                      />
                    )}
                  />
                  {fieldError?.area && (
                    <p className="text-[10px] text-destructive">{fieldError.area.message}</p>
                  )}
                </div>

                {/* 作業内容 */}
                <div className="space-y-1">
                  <label className="sm:hidden text-xs font-semibold text-slate-500">作業内容</label>
                  <Controller
                    name={`${name}.${index}.workContent`}
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <ComboboxField
                        value={value}
                        onChange={onChange}
                        options={workTypesData || []}
                        placeholder="選択または入力..."
                        icon={<Briefcase className="h-3.5 w-3.5" />}
                        disabled={isLoadingWorkTypes}
                        addLabel="追加"
                        onAddNew={(val: string) => {
                          createWorkTypeMutation.mutate({ name: val }, {
                            onSuccess: (newType: any) => {
                              onChange(newType?.name || val);
                            }
                          });
                        }}
                      />
                    )}
                  />
                  {fieldError?.workContent && (
                    <p className="text-[10px] text-destructive">{fieldError.workContent.message}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end sm:justify-center gap-1 sm:pt-1">
                  <button
                    type="button"
                    onClick={() => handleCopy(index)}
                    title="この行をコピー"
                    className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors bg-white"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    title="この行を削除"
                    className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-md border border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors bg-white"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {fields.length > 0 && (
        <button
          type="button"
          onClick={() => append({ floor: "", area: "", workContent: "", sortOrder: fields.length })}
          className="flex items-center gap-2 h-10 w-full justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          行を追加
        </button>
      )}

      {/* Dialogs */}
      {isWorkTypeDialogOpen && (
        <PeriodicWorkTypeMasterDialog 
          isOpen={isWorkTypeDialogOpen} 
          onClose={() => setIsWorkTypeDialogOpen(false)} 
        />
      )}
      
      {isAreaDialogOpen && (
        <CleaningAreaMasterDialog 
          isOpen={isAreaDialogOpen} 
          onClose={() => setIsAreaDialogOpen(false)} 
        />
      )}
    </div>
  );
};
