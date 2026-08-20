"use client";

import React, { useEffect, useState } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import type { HolidayRuleType, HolidayAction } from "@/types/contract";

interface HolidayRuleEditorProps {
  name: string;
  readOnly?: boolean;
}

const FIXED_RULES: HolidayRuleType[] = [
  "祝日",
  "年末年始",
  "お盆",
  "GW",
];

const ACTIONS: { value: HolidayAction; label: string }[] = [
  { value: "出勤する", label: "出勤する" },
  { value: "休む", label: "休む" },
  { value: "前日に振替", label: "前日に振替" },
  { value: "翌日に振替", label: "翌日に振替" },
];

export const HolidayRuleEditor: React.FC<HolidayRuleEditorProps> = ({ name, readOnly = false }) => {
  const { control, setValue, getValues } = useFormContext();
  const [isInitialized, setIsInitialized] = useState(false);

  const { fields, append } = useFieldArray({
    control,
    name,
  });

  // Initialize the fixed array if it's empty
  useEffect(() => {
    if (isInitialized) return;

    const currentValues = getValues(name) || [];
    
    if (currentValues.length === 0) {
      // If array is totally empty, append all 5 fixed rules
      const defaults = FIXED_RULES.map((rule) => ({
        ruleType: rule,
        action: "休む",
      }));
      append(defaults);
    } else {
      // Ensure all 5 fixed rules exist
      FIXED_RULES.forEach((rule, index) => {
        const existingIndex = currentValues.findIndex((v: any) => v.ruleType === rule);
        if (existingIndex === -1) {
          // If a specific rule is missing, we must insert it (or just set it directly to index)
          setValue(`${name}.${index}`, { ruleType: rule, action: "休む" });
        }
      });
    }
    
    setIsInitialized(true);
  }, [append, getValues, name, setValue, isInitialized]);

  return (
    <div className="space-y-3 rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm/50">
      <div className="grid grid-cols-12 gap-4 pb-2 border-b border-slate-100 text-sm font-semibold text-slate-500">
        <div className="col-span-5 sm:col-span-4 pl-2">規定項目</div>
        <div className="col-span-7 sm:col-span-8">対応内容</div>
      </div>

      {fields.map((field: any, index) => (
        <div
          key={field.id}
          className="grid grid-cols-12 gap-4 items-center p-2 hover:bg-muted/30 rounded-md transition-colors"
        >
          <div className="col-span-5 sm:col-span-4 flex items-center">
            <span className="text-sm font-semibold text-slate-700">
              {field.ruleType || FIXED_RULES[index]}
            </span>
            {/* Hidden input to ensure ruleType is submitted with the form */}
            <input
              type="hidden"
              value={field.ruleType || FIXED_RULES[index]}
              {...control.register(`${name}.${index}.ruleType`)}
            />
          </div>

          <div className="col-span-7 sm:col-span-8">
            <select
              disabled={readOnly}
              {...control.register(`${name}.${index}.action`)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 transition-all disabled:opacity-60 disabled:bg-slate-50"
            >
              {ACTIONS.map((action) => (
                <option key={action.value} value={action.value}>
                  {action.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ))}
    </div>
  );
};
