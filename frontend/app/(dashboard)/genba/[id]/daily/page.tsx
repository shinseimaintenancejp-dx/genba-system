"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  useDailyCleaningTasks,
  useCreateDailyCleaningTask,
  useUpdateDailyCleaningTask,
  useDeleteDailyCleaningTask,
  useCleaningAreas,
  useCreateCleaningArea,
  useUpdateCleaningArea,
  useDeleteCleaningArea,
  type DailyCleaningTaskResponse,
} from "@/hooks/useManuals";
import { useContractsByCategory, useDeleteContract } from "@/hooks/useContracts";
import { useCurrentUser } from "@/hooks/useAuth";
import RichTextEditor from "@/components/common/RichTextEditor";
import { DailyContractForm } from "@/components/contracts/DailyContractForm";
import { parseMarkdownToHtml } from "@/lib/markdown";
import {
  Loader2, Plus, Edit, Trash2, Calendar, Clock, Layers, MapPin, X, AlertTriangle,
  ChevronDown, ChevronUp, GripVertical, Settings, Check, Search,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import type { Contract } from "@/types/contract";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// All possible day chips
const ALL_DAYS = ["月", "火", "水", "木", "金", "土", "日"] as const;
type DayKey = typeof ALL_DAYS[number];

// Helper: parse contract.work_days string (「月火水」) into array
const parseContractDays = (workDays: string | null | undefined): string[] => {
  if (!workDays) return [...ALL_DAYS]; // No restriction = all days
  return workDays.split("").filter(d => ALL_DAYS.includes(d as DayKey));
};

// Helper: check if rich text content is semantically empty
const isRichTextEmpty = (html: string): boolean => {
  if (!html) return true;
  return html.replace(/<[^>]*>/g, "").trim() === "";
};

function getWeekdayLabel(day: string | null): string {
  if (!day) return "毎日";
  // day may now be comma-separated, render all
  return day.split(",").join("・") || "毎日";
}

// Helper to map backend Contract to Frontend Form Default Values
function mapContractToDefaultValues(contract: Contract): any {
  return {
    id: contract.id,
    contractName: contract.contract_name || "",
    contractType: contract.contract_type,
    serviceType: contract.service_type,
    serviceCategory: contract.service_category,
    genbaId: contract.genba_id || "",
    customerId: contract.customer_id || undefined,
    partnerId: contract.partner_id || undefined,
    startDate: contract.start_date.split("T")[0],
    endDate: contract.end_date ? contract.end_date.split("T")[0] : undefined,
    amount: typeof contract.amount === "string" ? parseFloat(contract.amount) : contract.amount,
    taxType: contract.tax_type,
    autoRenew: contract.auto_renew,
    invoiceRequired: contract.invoice_required,
    workContentSummary: contract.work_content_summary || undefined,
    contractPdfUrl: contract.contract_pdf_url || undefined,
    weeklyFrequency: contract.weekly_frequency ? Number(contract.weekly_frequency) : undefined,
    workDays: contract.work_days || "",
    workSlots: contract.work_slots?.map(s => ({
      startTime: s.start_time,
      endTime: s.end_time,
      workDurationHours: (s as any).work_duration_hours ? Number((s as any).work_duration_hours) : undefined,
      sortOrder: Number(s.sort_order),
    })) || [],
    workerCounts: contract.worker_counts?.map(w => ({
      workerCount: Number(w.worker_count),
      workDurationHours: Number(w.work_duration_hours),
      totalHours: Number(w.total_hours),
      sortOrder: Number(w.sort_order),
    })) || [],
    holidayRules: [
      { ruleType: "祝日", action: contract.holiday_rules?.find(h => h.rule_type === "祝日" || h.rule_type === "祝日")?.action || "休む" },
      { ruleType: "年末年始", action: contract.holiday_rules?.find(h => h.rule_type === "年末年始" || h.rule_type === "年末年始")?.action || "休む" },
      { ruleType: "お盆", action: contract.holiday_rules?.find(h => h.rule_type === "お盆" || h.rule_type === "お盆")?.action || "休む" },
      { ruleType: "GW", action: contract.holiday_rules?.find(h => h.rule_type === "GW" || h.rule_type === "GW")?.action || "休む" },
    ],
  };
}

// Helpers to compute contract info for daily task summary grid
function calculateDailyDuration(contract: any): string {
  if (!contract.work_slots || contract.work_slots.length === 0) return "未設定";
  let totalMinutes = 0;
  contract.work_slots.forEach((slot: any) => {
    if (!slot.start_time || !slot.end_time) return;
    const [sh, sm] = slot.start_time.split(":").map(Number);
    const [eh, em] = slot.end_time.split(":").map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff < 0) diff += 24 * 60; // overnight slot support
    const breakMin = slot.break_minutes || 0;
    totalMinutes += Math.max(0, diff - breakMin);
  });
  const hours = totalMinutes / 60;
  return `${hours.toFixed(2)}時間`;
}

function getHolidayActionLabel(contract: any): string {
  if (!contract.holiday_rules || contract.holiday_rules.length === 0) return "未設定";
  const holidayRule = contract.holiday_rules.find((r: any) => r.rule_type === "祝日");
  return holidayRule ? holidayRule.action : "未設定";
}

function getHolidaySkipLabel(contract: any): string {
  if (!contract.holiday_rules || contract.holiday_rules.length === 0) return "未設定";
  const holidayRule = contract.holiday_rules.find((r: any) => r.rule_type === "祝日");
  if (!holidayRule) return "未設定";
  return holidayRule.action === "休む" ? "休み" : "出勤";
}

export default function DailyCleaningTasksPage() {
  const params = useParams();
  const genbaId = params.id as string;

  const { data: user } = useCurrentUser();
  const canEdit = user && ["ADMIN", "SENIOR_STAFF", "INTERNAL_STAFF"].includes(user.role);

  // Queries
  const { data: contractsData, isLoading: isLoadingContracts } = useContractsByCategory(genbaId, "DAILY");
  const { data: tasks = [], isLoading: isLoadingTasks, error } = useDailyCleaningTasks(genbaId);

  // Mutations
  const createMutation = useCreateDailyCleaningTask();
  const updateTaskMutation = useUpdateDailyCleaningTask();
  const deleteTaskMutation = useDeleteDailyCleaningTask();
  const deleteContractMutation = useDeleteContract();

  // State
  const [expandedContractIds, setExpandedContractIds] = useState<Set<string>>(new Set());
  
  // Contract Modal State
  const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  const [isDeleteContractOpen, setIsDeleteContractOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);

  // Task Dialog State
  const [isOpen, setIsOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<DailyCleaningTaskResponse | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<string>("");
  
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<DailyCleaningTaskResponse | null>(null);

  // Form State
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<string>("");
  const [floor, setFloor] = useState<string>("");
  
  // Replaced selectedAreas and workContent with contents array
  const [contents, setContents] = useState<any[]>([{
    id: crypto.randomUUID(),
    selectedAreas: [],
    workContent: "",
    areaSearch: "",
    isAreaDropdownOpen: false
  }]);
  
  const [specialNotes, setSpecialNotes] = useState<string>("");
  const areaDropdownRef = useRef<HTMLDivElement>(null);

  // Area management modal state
  const [isManageAreasOpen, setIsManageAreasOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [editingAreaName, setEditingAreaName] = useState("");

  // Cleaning area data
  const { data: areasData } = useCleaningAreas();
  const createAreaMutation = useCreateCleaningArea();
  const updateAreaMutation = useUpdateCleaningArea();
  const deleteAreaMutation = useDeleteCleaningArea();

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Contract for currently open task dialog
  const [currentTaskContract, setCurrentTaskContract] = useState<Contract | null>(null);

  // Default expand logic removed as per request

  const toggleContract = (contractId: string) => {
    const next = new Set(expandedContractIds);
    if (next.has(contractId)) next.delete(contractId);
    else next.add(contractId);
    setExpandedContractIds(next);
  };

  const resetForm = () => {
    setSelectedDays([]);
    setStartTime("");
    setFloor("");
    setContents([{
      id: crypto.randomUUID(),
      selectedAreas: [],
      workContent: "",
      areaSearch: "",
      isAreaDropdownOpen: false
    }]);
    setSpecialNotes("");
    setEditingTask(null);
    setCurrentTaskContract(null);
  };

  const handleOpenCreateContract = () => {
    setEditingContract(null);
    setIsContractDialogOpen(true);
  };

  const handleOpenEditContract = (contract: Contract) => {
    setEditingContract(contract);
    setIsContractDialogOpen(true);
  };

  const handleOpenDeleteContract = (contract: Contract) => {
    setContractToDelete(contract);
    setIsDeleteContractOpen(true);
  };

  const handleDeleteContract = () => {
    if (!contractToDelete) return;
    deleteContractMutation.mutate(contractToDelete.id, {
      onSuccess: () => {
        setIsDeleteContractOpen(false);
        setContractToDelete(null);
      }
    });
  };

  const handleOpenCreateTask = (contractId: string) => {
    resetForm();
    setSelectedContractId(contractId);
    // Set default selected days from the contract's work_days
    const contract = contractsData?.items.find(c => c.id === contractId) || null;
    setCurrentTaskContract(contract);
    const contractDays = parseContractDays(contract?.work_days);
    setSelectedDays(contractDays);
    setIsOpen(true);
  };

  const handleOpenEditTask = (task: DailyCleaningTaskResponse) => {
    setEditingTask(task);
    setSelectedContractId(task.contract_id || "");
    const contract = contractsData?.items.find(c => c.id === task.contract_id) || null;
    setCurrentTaskContract(contract);
    // Parse comma-separated day_of_week
    const taskDays = task.day_of_week
      ? task.day_of_week.split(",").map(d => d.trim()).filter(Boolean)
      : parseContractDays(contract?.work_days);
    setSelectedDays(taskDays);
    setStartTime(task.start_time ? task.start_time.slice(0, 5) : "");
    setFloor(task.floor || "");
    
    // Parse contents
    if (task.contents && task.contents.length > 0) {
      setContents(task.contents.map(c => ({
        id: crypto.randomUUID(),
        selectedAreas: c.area_name ? c.area_name.split(",").map(a => a.trim()).filter(Boolean) : [],
        workContent: c.work_content,
        areaSearch: "",
        isAreaDropdownOpen: false
      })));
    } else {
      setContents([{
        id: crypto.randomUUID(),
        selectedAreas: [],
        workContent: "",
        areaSearch: "",
        isAreaDropdownOpen: false
      }]);
    }
    
    setSpecialNotes(task.special_notes || "");
    setIsOpen(true);
  };

  const handleOpenDeleteTask = (task: DailyCleaningTaskResponse) => {
    setTaskToDelete(task);
    setIsDeleteOpen(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    // Guard: at least one content block, and each must have areas and work content
    const isValidContents = contents.length > 0 && contents.every(c => c.selectedAreas.length > 0 && !isRichTextEmpty(c.workContent));
    if (!isValidContents || !selectedContractId) return;

    const dayValue = selectedDays.length > 0 ? selectedDays.join(",") : null;
    const formattedStartTime = startTime ? (startTime.length === 5 ? `${startTime}:00` : startTime) : null;

    const payload = {
      contract_id: selectedContractId,
      day_of_week: dayValue,
      start_time: formattedStartTime,
      floor: floor || null,
      contents: contents.map((c) => ({
        area_name: c.selectedAreas.join(","),
        work_content: c.workContent
      })),
      special_notes: specialNotes || null,
    };

    if (editingTask) {
      updateTaskMutation.mutate(
        { genbaId, taskId: editingTask.id, data: payload },
        { onSuccess: () => { setIsOpen(false); resetForm(); } }
      );
    } else {
      createMutation.mutate(
        { genbaId, data: payload },
        { onSuccess: () => { setIsOpen(false); resetForm(); } }
      );
    }
  };

  // Drag-and-drop reorder handler
  const handleDeleteTask = () => {
    if (!taskToDelete) return;
    deleteTaskMutation.mutate(
      { genbaId, taskId: taskToDelete.id },
      { onSuccess: () => { setIsDeleteOpen(false); setTaskToDelete(null); } }
    );
  };

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <h2 className="text-lg font-bold text-red-800">エラーが発生しました</h2>
      </div>
    );
  }

  const contracts = contractsData?.items || [];
  const isLoading = isLoadingContracts || isLoadingTasks;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 hidden">日常清掃マニュアル</h2>
          <p className="text-sm text-slate-500 mt-1">契約ごとの作業スケジュールと作業内容を確認します。</p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenCreateContract}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-[#1E60F2] hover:bg-[#0F4FD0] text-sm font-semibold text-white transition-all shadow-sm duration-200 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>日常契約を追加</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-slate-400 w-8 h-8" /></div>
      ) : contracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[240px] bg-slate-50 rounded-xl border border-dashed border-slate-200 p-8 text-center">
          <span className="text-sm font-semibold text-slate-400">日常清掃の契約がありません</span>
          {canEdit && (
            <button
              onClick={handleOpenCreateContract}
              className="mt-4 inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>最初の契約を登録する</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {contracts.map(contract => {
            const isExpanded = expandedContractIds.has(contract.id);
            const contractTasks = tasks.filter(t => t.contract_id === contract.id);

            // Format timeslots: "08:00~10:00 (1名) | 13:00~15:00 (2名)"
            let timeslotsLabel = "";
            if (contract.work_slots && contract.worker_counts) {
              const formattedSlots = contract.work_slots.map((slot, index) => {
                const wc = contract.worker_counts![index];
                const count = wc ? wc.worker_count : 0;
                const startStr = slot.start_time ? slot.start_time.slice(0, 5) : "";
                const endStr = slot.end_time ? slot.end_time.slice(0, 5) : "";
                const timeStr = startStr && endStr ? `${startStr}~${endStr}` : ((slot as any).work_duration_hours ? `${(slot as any).work_duration_hours}h` : "未定");
                return `${timeStr} (${count}名)`;
              });
              timeslotsLabel = formattedSlots.join(" | ");
            }

            return (
              <div key={contract.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                
                {/* Contract Header (Clickable) */}
                <div 
                  className={`p-4 cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/50 border-b border-blue-100' : 'hover:bg-slate-50'}`}
                  onClick={() => toggleContract(contract.id)}
                >
                  <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="bg-blue-100 text-blue-700 p-2 rounded-lg shrink-0">
                        <Layers className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-900 text-base">{contract.contract_name || contract.service_type || "日常清掃契約"}</span>
                          {contract.amount != null && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded border border-emerald-200">
                              ¥{Number(contract.amount).toLocaleString()} {contract.tax_type === "EXCLUSIVE" ? "(税抜)" : "(税込)"}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-3 mt-3 text-xs text-slate-600 font-medium bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                          <div>
                            <span className="text-slate-400 font-semibold block mb-0.5">勤務曜日</span>
                            <span className="text-slate-800">{contract.work_days || "未設定"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold block mb-0.5">時間</span>
                            <span className="text-slate-800">{timeslotsLabel || "未設定"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold block mb-0.5">日稼働時間</span>
                            <span className="text-slate-800">{calculateDailyDuration(contract)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold block mb-0.5">週稼働回数</span>
                            <span className="text-slate-800">{contract.weekly_frequency ? `週 ${contract.weekly_frequency}回` : "未設定"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold block mb-0.5">祝日対応</span>
                            <span className="text-slate-800">{getHolidayActionLabel(contract)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold block mb-0.5">祝日休み</span>
                            <span className="text-slate-800">{getHolidaySkipLabel(contract)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      {canEdit && (
                        <div className="flex items-center gap-1 mr-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenEditContract(contract); }}
                            className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm"
                            aria-label="Edit Contract"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenDeleteContract(contract); }}
                            className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm"
                            aria-label="Delete Contract"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                      <div className="p-1 bg-white rounded-full border border-slate-200 shadow-sm shrink-0">
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Content (Tasks) */}
                {isExpanded && (
                  <div className="p-5 bg-slate-50/30">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-slate-800">作業マニュアル・手順</h3>
                      {canEdit && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenCreateTask(contract.id); }}
                          className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" /> 追加
                        </button>
                      )}
                    </div>

                    {contractTasks.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-4 text-center">この契約に登録されている作業はありません。</p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {contractTasks.map(task => (
                          <TaskItem
                            key={task.id}
                            task={task}
                            canEdit={!!canEdit}
                            onEdit={handleOpenEditTask}
                            onDelete={handleOpenDeleteTask}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}


      {/* Contract Daily Form Modal (Create & Edit) */}
      <Dialog.Root open={isContractDialogOpen} onOpenChange={(open) => { if (!open) setIsContractDialogOpen(false); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-2xl focus:outline-none animate-in fade-in-50 zoom-in-95 max-h-[95vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6 border-b border-slate-200 pb-4 sticky top-0 bg-slate-50 z-10">
              <div>
                <Dialog.Title className="text-2xl font-bold text-slate-900">
                  {editingContract ? "日常契約の編集" : "日常契約を追加"}
                </Dialog.Title>
                <Dialog.Description className="text-sm text-slate-500 mt-1">
                  必要な項目を入力して保存してください。
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors">
                  <X className="h-6 w-6" />
                </button>
              </Dialog.Close>
            </div>
            
            <div className="mt-4">
              <DailyContractForm
                genbaId={genbaId}
                defaultValues={editingContract ? mapContractToDefaultValues(editingContract) : undefined}
                onSuccess={() => setIsContractDialogOpen(false)}
                onCancel={() => setIsContractDialogOpen(false)}
              />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Contract Confirmation */}
      <Dialog.Root open={isDeleteContractOpen} onOpenChange={setIsDeleteContractOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl focus:outline-none animate-in fade-in-50 zoom-in-95">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-6 w-6 shrink-0" />
                <Dialog.Title className="text-lg font-bold">契約を削除しますか？</Dialog.Title>
              </div>
              <Dialog.Close asChild><button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></Dialog.Close>
            </div>
            <div className="text-sm text-slate-600 mb-6">
              <p className="mb-2 font-bold text-slate-800">契約: {contractToDelete?.contract_name || contractToDelete?.service_type}</p>
              <p>この契約および関連する作業データを完全に削除します。よろしいですか？</p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button type="button" onClick={() => setIsDeleteContractOpen(false)} className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm font-semibold">キャンセル</button>
              <button type="button" onClick={handleDeleteContract} disabled={deleteContractMutation.isPending} className="h-10 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold inline-flex items-center">
                {deleteContractMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 削除
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Task Create/Edit Dialog */}
      <Dialog.Root open={isOpen} onOpenChange={(open) => !open && resetForm() || setIsOpen(open)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl focus:outline-none animate-in fade-in-50 zoom-in-95 overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between mb-5 border-b border-slate-100 pb-3">
              <Dialog.Title className="text-lg font-bold text-slate-900">
                {editingTask ? "作業マニュアル・手順を編集" : "作業マニュアル・手順を追加"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
              </Dialog.Close>
            </div>

            <form onSubmit={handleSaveTask} className="flex flex-col gap-4">
              {/* 曜日: multi-select day chips (filtered to contract work_days) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">曜日 <span className="text-xs font-normal text-slate-500">（複数選択可）</span></label>
                <div className="flex flex-wrap gap-2">
                  {(currentTaskContract
                    ? parseContractDays(currentTaskContract.work_days)
                    : [...ALL_DAYS]
                  ).map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDays(prev =>
                        prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
                      )}
                      className={`min-w-[2.75rem] px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                        selectedDays.includes(day)
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white text-slate-500 border-slate-200 hover:border-blue-300"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                {selectedDays.length === 0 && (
                  <p className="text-xs text-amber-600">※ 曜日を選択してください（未選択の場合は毎日）</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* 開始時間: optional */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">開始時間 <span className="text-xs font-normal text-slate-400">（任意）</span></label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="h-10 px-3 rounded-lg border border-slate-200 text-sm focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
                {/* 階数 */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">階数 (例: 1F, B1F)</label>
                  <input type="text" maxLength={50} value={floor} onChange={e => setFloor(e.target.value)} className="h-10 px-3 rounded-lg border border-slate-200 text-sm focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>

              {/* 作業内容リスト (Multiple Area/Content Pairs) */}
              <div className="flex flex-col gap-4 border border-slate-200 rounded-xl p-4 bg-slate-50">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-800">場所・作業内容 <span className="text-red-500">*</span></label>
                  <button
                    type="button"
                    onClick={() => setIsManageAreasOpen(true)}
                    className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 transition-colors bg-white px-2 py-1 rounded border border-slate-200"
                  >
                    <Settings className="h-3 w-3" /> エリア管理
                  </button>
                </div>
                
                {contents.map((content, idx) => (
                  <div key={content.id} className="flex flex-col gap-3 p-4 bg-white border border-slate-200 rounded-lg relative">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-1">
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                        手順 {idx + 1}
                      </span>
                      {contents.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setContents(prev => prev.filter(c => c.id !== content.id))}
                          className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded flex items-center justify-center transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col gap-4">
                      {/* 場所/区域 (Multi-select combobox) */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-700">場所/区域 <span className="text-red-500">*</span></label>
                        {/* Selected area chips */}
                        {content.selectedAreas.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-1">
                            {content.selectedAreas.map((area: string) => (
                              <span key={area} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium border border-blue-200">
                                {area}
                                <button
                                  type="button"
                                  onClick={() => setContents(prev => prev.map(c => c.id === content.id ? { ...c, selectedAreas: c.selectedAreas.filter((a: string) => a !== area) } : c))}
                                  className="text-blue-500 hover:text-blue-700"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Dropdown combobox */}
                        <div className="relative">
                          <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden focus-within:ring-1 focus-within:ring-blue-500">
                            <Search className="h-4 w-4 text-slate-400 ml-3 shrink-0" />
                            <input
                              type="text"
                              placeholder="エリアを検索または追加..."
                              value={content.areaSearch}
                              onChange={e => setContents(prev => prev.map(c => c.id === content.id ? { ...c, areaSearch: e.target.value, isAreaDropdownOpen: true } : c))}
                              onFocus={() => setContents(prev => prev.map(c => c.id === content.id ? { ...c, isAreaDropdownOpen: true } : c))}
                              onBlur={() => {
                                setTimeout(() => {
                                  setContents(prev => prev.map(c => c.id === content.id ? { ...c, isAreaDropdownOpen: false } : c));
                                }, 200);
                              }}
                              onKeyDown={e => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const name = content.areaSearch.trim();
                                  if (name && !(areasData || []).some(a => a.name === name)) {
                                    createAreaMutation.mutate({ name }, {
                                      onSuccess: (newArea: any) => {
                                        setContents(prev => prev.map(c => c.id === content.id ? { ...c, selectedAreas: [...c.selectedAreas, (newArea?.name || name)], areaSearch: "", isAreaDropdownOpen: false } : c));
                                      }
                                    });
                                  }
                                }
                              }}
                              className="h-10 px-2 flex-1 text-sm bg-transparent outline-none"
                            />
                          </div>
                          {content.isAreaDropdownOpen && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {(areasData || [])
                                .filter(a => a.name.toLowerCase().includes(content.areaSearch.toLowerCase()) && !content.selectedAreas.includes(a.name))
                                .map(area => (
                                  <button
                                    key={area.id}
                                    type="button"
                                    onClick={() => setContents(prev => prev.map(c => c.id === content.id ? { ...c, selectedAreas: [...c.selectedAreas, area.name], areaSearch: "", isAreaDropdownOpen: false } : c))}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                                  >
                                    <MapPin className="h-3.5 w-3.5 shrink-0" /> {area.name}
                                  </button>
                                ))}
                              {/* Add new option */}
                              {content.areaSearch.trim() && !(areasData || []).some(a => a.name === content.areaSearch.trim()) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const name = content.areaSearch.trim();
                                    createAreaMutation.mutate({ name }, {
                                      onSuccess: (newArea: any) => {
                                        setContents(prev => prev.map(c => c.id === content.id ? { ...c, selectedAreas: [...c.selectedAreas, (newArea?.name || name)], areaSearch: "", isAreaDropdownOpen: false } : c));
                                      }
                                    });
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 font-medium border-t border-slate-100"
                                >
                                  <Plus className="h-3.5 w-3.5" /> 「{content.areaSearch}」を追加
                                </button>
                              )}
                              {(areasData || []).filter(a => a.name.toLowerCase().includes(content.areaSearch.toLowerCase()) && !content.selectedAreas.includes(a.name)).length === 0
                                && !content.areaSearch.trim() && (
                                <p className="px-4 py-3 text-xs text-slate-400 text-center">エリアが見つかりません</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 作業内容 */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-700">作業内容 <span className="text-red-500">*</span></label>
                        <RichTextEditor 
                          id={`work-content-${content.id}`} 
                          value={content.workContent} 
                          onChange={(val) => setContents(prev => prev.map(c => c.id === content.id ? { ...c, workContent: val } : c))} 
                          placeholder="具体的な清掃手順を入力してください" 
                          minHeight="60px"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={() => setContents(prev => [...prev, { id: crypto.randomUUID(), selectedAreas: [], workContent: "", areaSearch: "", isAreaDropdownOpen: false }])}
                  className="inline-flex items-center justify-center gap-2 h-10 border border-dashed border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-semibold mt-1"
                >
                  <Plus className="h-4 w-4" /> 手順を追加
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">特記事項</label>
                <textarea rows={2} value={specialNotes} onChange={e => setSpecialNotes(e.target.value)} className="w-full resize-none p-3 rounded-lg border border-slate-200 text-sm focus:ring-1 focus:ring-blue-500" />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsOpen(false)} className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">キャンセル</button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateTaskMutation.isPending || contents.length === 0 || contents.some(c => c.selectedAreas.length === 0 || isRichTextEmpty(c.workContent))}
                  className="inline-flex items-center h-10 px-6 rounded-lg bg-[#1E60F2] hover:bg-[#0F4FD0] text-sm font-semibold text-white transition-colors disabled:opacity-50"
                >
                  {(createMutation.isPending || updateTaskMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {editingTask ? "保存" : "登録"}
                </button>
              </div>
            </form>

          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Task Confirmation */}
      <Dialog.Root open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl focus:outline-none animate-in fade-in-50 zoom-in-95">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-6 w-6 shrink-0" />
                <Dialog.Title className="text-lg font-bold">作業を削除しますか？</Dialog.Title>
              </div>
              <Dialog.Close asChild><button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></Dialog.Close>
            </div>
            <div className="text-sm text-slate-600 mb-6">
              <p className="mb-2 font-bold text-slate-800">
                作業場所: {taskToDelete?.contents && taskToDelete.contents.length > 0 
                  ? taskToDelete.contents.map(c => c.area_name).join(" / ") 
                  : "未設定"}
              </p>
              <p>この作業データを完全に削除します。よろしいですか？</p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button type="button" onClick={() => setIsDeleteOpen(false)} className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm font-semibold">キャンセル</button>
              <button type="button" onClick={handleDeleteTask} disabled={deleteTaskMutation.isPending} className="h-10 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold inline-flex items-center">
                {deleteTaskMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 削除
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Manage Areas Modal */}
      <Dialog.Root open={isManageAreasOpen} onOpenChange={setIsManageAreasOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl focus:outline-none animate-in fade-in-50 zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-4">
              <Dialog.Title className="text-lg font-bold text-slate-900">場所/区域の管理</Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
              </Dialog.Close>
            </div>
            
            <div className="flex gap-2 mb-6">
              <input 
                type="text" 
                value={newAreaName} 
                onChange={e => setNewAreaName(e.target.value)} 
                placeholder="新しいエリア名を入力" 
                className="flex-1 h-10 px-3 rounded-lg border border-slate-200 text-sm focus:ring-1 focus:ring-blue-500" 
              />
              <button 
                type="button" 
                onClick={() => {
                  if (newAreaName.trim()) {
                    createAreaMutation.mutate({ name: newAreaName.trim() }, {
                      onSuccess: () => setNewAreaName("")
                    });
                  }
                }}
                disabled={!newAreaName.trim() || createAreaMutation.isPending}
                className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-50 inline-flex items-center gap-1"
              >
                <Plus className="h-4 w-4" /> 追加
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[200px]">
              {areasData?.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">登録されているエリアはありません</p>
              ) : (
                <ul className="space-y-2">
                  {areasData?.map(area => (
                    <li key={area.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors">
                      {editingAreaId === area.id ? (
                        <div className="flex items-center gap-2 flex-1 mr-2">
                          <input 
                            type="text"
                            value={editingAreaName}
                            onChange={e => setEditingAreaName(e.target.value)}
                            className="flex-1 h-8 px-2 rounded border border-slate-300 text-sm focus:ring-1 focus:ring-blue-500"
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              if (editingAreaName.trim() && editingAreaName.trim() !== area.name) {
                                updateAreaMutation.mutate({ id: area.id, data: { name: editingAreaName.trim() } }, {
                                  onSuccess: () => setEditingAreaId(null)
                                });
                              } else {
                                setEditingAreaId(null);
                              }
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => setEditingAreaId(null)}
                            className="p-1.5 text-slate-500 hover:bg-slate-200 rounded"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-medium text-slate-700">{area.name}</span>
                          <div className="flex items-center gap-1">
                            <button 
                              type="button" 
                              onClick={() => {
                                setEditingAreaId(area.id);
                                setEditingAreaName(area.name);
                              }}
                              className="p-1.5 text-slate-500 hover:bg-white hover:text-blue-600 hover:shadow-sm rounded transition-all"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              type="button" 
                              onClick={() => {
                                if (window.confirm(`「${area.name}」を削除してもよろしいですか？`)) {
                                  deleteAreaMutation.mutate(area.id);
                                }
                              }}
                              className="p-1.5 text-slate-500 hover:bg-white hover:text-red-600 hover:shadow-sm rounded transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function TaskItem({ 
  task, 
  canEdit, 
  onEdit, 
  onDelete 
}: { 
  task: DailyCleaningTaskResponse; 
  canEdit: boolean; 
  onEdit: (task: DailyCleaningTaskResponse) => void; 
  onDelete: (task: DailyCleaningTaskResponse) => void; 
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row md:items-start gap-4 transition-shadow">
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {(task.start_time || ((task as any).contract && (task as any).contract.work_duration_hours)) && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 rounded-md px-2 py-1">
              <Clock className="h-3.5 w-3.5" /> {task.start_time ? task.start_time.slice(0, 5) : ((task as any).contract?.work_duration_hours ? `${(task as any).contract.work_duration_hours}h` : "未定")}
            </span>
          )}
          {task.floor && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-md px-2 py-1">
              <Layers className="h-3.5 w-3.5" /> {task.floor}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 rounded-md px-2 py-1">
            <Calendar className="h-3.5 w-3.5" /> {getWeekdayLabel(task.day_of_week)}
          </span>
        </div>
        
        {/* Render area/content pairs */}
        {task.contents && task.contents.length > 0 && (
          <div className="flex flex-col gap-3 pl-4 mt-1 border-l-2 border-slate-100">
            {task.contents.map(c => (
              <div key={c.id} className="flex flex-col gap-1">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 w-fit mb-1">
                  <MapPin className="h-3 w-3" /> {c.area_name}
                </span>
                <div className="text-sm text-slate-700 prose prose-slate max-w-none break-all pl-8">
                  <div dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(c.work_content) }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {task.special_notes && (
          <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded mt-2 border border-amber-100/50">
            <span className="font-bold">特記事項: </span>{task.special_notes}
          </p>
        )}
      </div>
      
      {canEdit && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onEdit(task)}
            className="p-1.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(task)}
            className="p-1.5 rounded border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
