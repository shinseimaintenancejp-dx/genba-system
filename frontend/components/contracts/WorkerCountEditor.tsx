"use client";

import React, { useMemo } from "react";
import { useFormContext, useFieldArray, useWatch } from "react-hook-form";
import { Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface WorkerCountEditorProps {
  name: string;
  readOnly?: boolean;
}

export const WorkerCountEditor: React.FC<WorkerCountEditorProps> = ({ name, readOnly = false }) => {
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

  // Calculate total hours per row and overall total
  const { rowsWithTotal, grandTotal } = useMemo(() => {
    let grand = 0;
    const rows = (watchFieldArray || []).map((countObj: any) => {
      const workers = parseFloat(countObj.workerCount) || 0;
      const hours = parseFloat(countObj.workDurationHours) || 0;
      const total = workers * hours;
      grand += total;
      return { total };
    });

    return { rowsWithTotal: rows, grandTotal: grand };
  }, [watchFieldArray]);

  // Extract errors for this field array
  const fieldErrors = errors[name] as any[] | undefined;

  return (
    <div className="space-y-4">
      {fields.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg bg-muted/20">
          作業人員を追加してください
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => {
            const rowTotal = rowsWithTotal[index]?.total || 0;
            const hasError = fieldErrors?.[index] !== undefined;

            return (
              <div
                key={field.id}
                className={`flex flex-col sm:flex-row items-end sm:items-center gap-3 p-4 border rounded-xl shadow-sm/50 transition-colors ${
                  hasError ? "border-destructive bg-destructive/5" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  {/* Worker Count */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">人数 (名)</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="1"
                      {...control.register(`${name}.${index}.workerCount`, {
                        valueAsNumber: true,
                      })}
                      disabled={readOnly}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 transition-all disabled:opacity-60 disabled:bg-slate-50 disabled:cursor-not-allowed"
                    />
                    {fieldErrors?.[index]?.workerCount && (
                      <p className="text-xs text-red-500">
                        {fieldErrors[index].workerCount.message}
                      </p>
                    )}
                  </div>

                  {/* Work Duration Hours */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">作業時間 (時間)</label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      placeholder="0.0"
                      {...control.register(`${name}.${index}.workDurationHours`, {
                        valueAsNumber: true,
                      })}
                      disabled={readOnly}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 transition-all disabled:opacity-60 disabled:bg-slate-50 disabled:cursor-not-allowed"
                    />
                    {fieldErrors?.[index]?.workDurationHours && (
                      <p className="text-xs text-red-500">
                        {fieldErrors[index].workDurationHours.message}
                      </p>
                    )}
                  </div>
                  
                  {/* Hidden inputs to ensure calculated values and sortOrder get submitted */}
                  <input
                    type="hidden"
                    value={rowTotal}
                    {...control.register(`${name}.${index}.totalHours`, {
                      valueAsNumber: true,
                    })}
                  />
                  <input
                    type="hidden"
                    value={index}
                    {...control.register(`${name}.${index}.sortOrder`, {
                      valueAsNumber: true,
                    })}
                  />
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto pt-2 sm:pt-0 justify-between sm:justify-end">
                  <div className="space-y-2 text-right min-w-[100px]">
                    <label className="text-sm font-semibold text-slate-500 block">合計 (時間)</label>
                    <input
                      type="text"
                      value={rowTotal.toFixed(2)}
                      readOnly
                      className="h-10 rounded-lg border border-slate-200 bg-slate-50/50 px-3 text-sm text-right font-bold text-slate-800 w-[100px] outline-none"
                    />
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
                workerCount: 1,
                workDurationHours: 1,
                totalHours: 1,
                sortOrder: fields.length,
              })
            }
            className="h-10 w-full sm:w-auto px-4 rounded-lg border border-blue-500 text-blue-600 hover:bg-blue-50/50 flex items-center justify-center gap-2 text-sm font-semibold transition-all"
          >
            <Plus className="h-4 w-4" />
            作業人員を追加
          </button>
        ) : (
          <div />
        )}

        {fields.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200 w-full sm:w-auto justify-between sm:justify-end h-10">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <Users className="h-4 w-4" />
              合計作業時間
            </span>
            <span className="text-sm font-bold text-slate-800">
              {grandTotal.toFixed(2)} 時間
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
