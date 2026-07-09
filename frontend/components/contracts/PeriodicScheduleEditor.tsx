"use client";

import React, { useEffect } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";

interface PeriodicScheduleEditorProps {
  name: string; // e.g. "periodicSchedule"
}

export const PeriodicScheduleEditor: React.FC<PeriodicScheduleEditorProps> = ({ name }) => {
  const { control, watch, setValue, getValues } = useFormContext();

  const workMonths = watch(`${name}.workMonths`) || [];

  // Initialize with empty array if undefined
  useEffect(() => {
    if (!getValues(`${name}.workMonths`)) {
      setValue(`${name}.workMonths`, []);
    }
    // ensure workDays is at least an empty array for payload format
    if (!getValues(`${name}.workDays`)) {
      setValue(`${name}.workDays`, []);
    }
  }, [getValues, name, setValue]);

  // Auto-update frequency based on workMonths length
  useEffect(() => {
    setValue(`${name}.frequencyPerYear`, workMonths.length, { shouldValidate: true });
  }, [workMonths.length, name, setValue]);

  const toggleMonth = (month: number, currentSelected: number[], onChange: (val: number[]) => void) => {
    const isSelected = currentSelected.includes(month);
    if (isSelected) {
      onChange(currentSelected.filter((m) => m !== month).sort((a, b) => a - b));
    } else {
      onChange([...currentSelected, month].sort((a, b) => a - b));
    }
  };

  return (
    <div className="space-y-6 rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm/50">
      {/* Frequency Per Year */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">作業回数/年 (回)</label>
        <div className="flex flex-col gap-2">
          <input
            type="number"
            readOnly
            {...control.register(`${name}.frequencyPerYear`, { valueAsNumber: true })}
            className="h-10 w-full sm:max-w-[200px] rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm outline-none text-slate-500 cursor-not-allowed"
          />
        </div>
      </div>

      {/* Work Months Grid */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">実施月</label>
        <Controller
          control={control}
          name={`${name}.workMonths`}
          defaultValue={[]}
          render={({ field }) => {
            const selected = Array.isArray(field.value) ? field.value : [];
            return (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                  const isSelected = selected.includes(month);
                  return (
                    <button
                      key={`month-${month}`}
                      type="button"
                      onClick={() => toggleMonth(month, selected, field.onChange)}
                      className={`h-10 rounded-lg border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        isSelected
                          ? "bg-[#1E60F2] text-white border-[#1E60F2]"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {month}月
                    </button>
                  );
                })}
              </div>
            );
          }}
        />
      </div>
    </div>
  );
};

