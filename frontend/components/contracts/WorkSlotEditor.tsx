"use client";

import React, { useMemo } from "react";
import { useFormContext, useFieldArray, useWatch } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface WorkSlotEditorProps {
  name: string;
  readOnly?: boolean;
}

const parseTimeToMinutes = (timeStr: string) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

const formatMinutesToHoursAndMinutes = (totalMinutes: number) => {
  if (totalMinutes <= 0) return "0時間0分";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}分`;
  if (minutes === 0) return `${hours}時間`;
  return `${hours}時間${minutes}分`;
};

export const WorkSlotEditor: React.FC<WorkSlotEditorProps> = ({ name, readOnly = false }) => {
  const {
    control,
    watch,
    formState: { errors },
  } = useFormContext();
  
  const { fields, append, remove } = useFieldArray({
    control,
    name,
  });

  const watchFieldArray = useWatch({
    control,
    name,
    defaultValue: fields
  });

  // Calculate duration per row and total duration
  const { rowsWithDuration, totalMinutes } = useMemo(() => {
    let total = 0;
    const rows = (watchFieldArray || []).map((slot: any) => {
      const start = parseTimeToMinutes(slot.startTime);
      const end = parseTimeToMinutes(slot.endTime);
      const breakMin = parseInt(slot.breakMinutes, 10) || 0;

      let duration = 0;
      if (start && end) {
        let diff = end - start;
        if (diff < 0) diff += 24 * 60; // handle crossing midnight
        duration = diff - breakMin;
        if (duration < 0) duration = 0;
      } else if (slot.workDurationHours != null && !isNaN(slot.workDurationHours)) {
        duration = Math.round(slot.workDurationHours * 60);
      }

      total += duration;
      return { duration };
    });

    return { rowsWithDuration: rows, totalMinutes: total };
  }, [watchFieldArray]);

  // Extract errors for this field array
  const fieldErrors = errors[name] as any[] | undefined;

  return (
    <div className="space-y-4">
      {fields.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg bg-muted/20">
          時間帯を追加してください
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => {
            const rowDuration = rowsWithDuration[index]?.duration || 0;
            const hasError = fieldErrors?.[index] !== undefined;

            return (
              <div
                key={field.id}
                className={`flex flex-col sm:flex-row items-end sm:items-center gap-3 p-4 border rounded-xl shadow-sm/50 transition-colors ${
                  hasError ? "border-destructive bg-destructive/5" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                  {/* Start Time */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">開始時間</label>
                    <input
                      type="time"
                      {...control.register(`${name}.${index}.startTime`)}
                      disabled={readOnly}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 transition-all disabled:opacity-60 disabled:bg-slate-50 disabled:cursor-not-allowed"
                    />
                    {fieldErrors?.[index]?.startTime && (
                      <p className="text-xs text-red-500">
                        {fieldErrors[index].startTime.message}
                      </p>
                    )}
                  </div>

                  {/* End Time */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">終了時間</label>
                    <input
                      type="time"
                      {...control.register(`${name}.${index}.endTime`)}
                      disabled={readOnly}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 transition-all disabled:opacity-60 disabled:bg-slate-50 disabled:cursor-not-allowed"
                    />
                    {fieldErrors?.[index]?.endTime && (
                      <p className="text-xs text-red-500">
                        {fieldErrors[index].endTime.message}
                      </p>
                    )}
                  </div>

                  {/* Break Minutes */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">休憩 (分)</label>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      placeholder="0"
                      {...control.register(`${name}.${index}.breakMinutes`, {
                        valueAsNumber: true,
                      })}
                      disabled={readOnly}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 transition-all disabled:opacity-60 disabled:bg-slate-50 disabled:cursor-not-allowed"
                    />
                    {fieldErrors?.[index]?.breakMinutes && (
                      <p className="text-xs text-red-500">
                        {fieldErrors[index].breakMinutes.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto pt-2 sm:pt-0 justify-between sm:justify-end">
                  <div className="space-y-2 text-right min-w-[100px]">
                    <label className="text-sm font-semibold text-slate-500 block">実働 (時間)</label>
                    {watchFieldArray?.[index]?.startTime && watchFieldArray?.[index]?.endTime ? (
                      <input
                        type="text"
                        value={(rowDuration / 60).toFixed(2)}
                        readOnly
                        className="h-10 rounded-lg border border-slate-200 bg-slate-50/50 px-3 text-sm text-right font-bold text-slate-800 w-[100px] outline-none"
                      />
                    ) : (
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="0.0"
                        {...control.register(`${name}.${index}.workDurationHours`, { valueAsNumber: true })}
                        disabled={readOnly}
                        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-right font-bold text-slate-800 w-[100px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-60 disabled:bg-slate-50 disabled:cursor-not-allowed"
                      />
                    )}
                  </div>

                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="h-10 w-10 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg flex items-center justify-center transition-colors"
                      title="削除"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        {!readOnly ? (
          <button
            type="button"
            onClick={() =>
              append({
                startTime: "09:00",
                endTime: "18:00",
                breakMinutes: 60,
                sortOrder: fields.length,
              })
            }
            className="h-10 w-full sm:w-auto px-4 rounded-lg border border-blue-500 text-blue-600 hover:bg-blue-50/50 flex items-center justify-center gap-2 text-sm font-semibold transition-all"
          >
            <Plus className="h-4 w-4" />
            時間帯を追加
          </button>
        ) : (
          <div />
        )}

        {fields.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200 w-full sm:w-auto justify-between sm:justify-end h-10">
            <span className="text-sm font-semibold text-slate-500">
              合計実働時間
            </span>
            <span className="text-sm font-bold text-slate-800">
              {formatMinutesToHoursAndMinutes(totalMinutes)}
            </span>
          </div>
        )}
      </div>

      {typeof errors[name]?.message === "string" && (
        <p className="text-sm text-red-500">{errors[name]?.message as string}</p>
      )}
    </div>
  );
};
