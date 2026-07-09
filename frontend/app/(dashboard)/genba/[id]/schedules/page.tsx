"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import {
  useWorkSchedules,
  useCreateWorkSchedule,
  useUpdateWorkSchedule,
  useDeleteWorkSchedule,
  useCustomHolidays,
  useCreateCustomHoliday,
  useUpdateCustomHoliday,
  useDeleteCustomHoliday,
  type WorkScheduleResponse,
  type GenbaCustomHolidayResponse,
} from "@/hooks/useSchedules";
import { useContracts } from "@/hooks/useContracts";
import { useCurrentUser } from "@/hooks/useAuth";
import { Loader2, Plus, Edit, Trash2, Calendar, Clock, AlertTriangle, X, Check, ShieldAlert, AlertCircle } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

const HOLIDAY_RULES = [
  { value: "OFF", label: "休日扱い (OFF)" },
  { value: "SHIFT_BEFORE", label: "前日に前倒し (SHIFT_BEFORE)" },
  { value: "SHIFT_AFTER", label: "翌日に繰り越し (SHIFT_AFTER)" },
  { value: "WORK", label: "通常稼働 (WORK)" },
];

export default function WorkSchedulesPage() {
  const params = useParams();
  const genbaId = params.id as string;

  const { data: schedules = [], isLoading: isSchedulesLoading, error: schedulesError } = useWorkSchedules(genbaId);
  const { data: holidays = [], isLoading: isHolidaysLoading, error: holidaysError } = useCustomHolidays(genbaId);
  
  // Fetch contracts to show holiday rules
  const { data: contractsData, isLoading: isContractsLoading } = useContracts({ genba_id: genbaId });
  const contractsWithHolidayRules = contractsData?.items?.filter(c => c.holiday_rules && c.holiday_rules.length > 0) || [];

  const createScheduleMutation = useCreateWorkSchedule();
  const updateScheduleMutation = useUpdateWorkSchedule();
  const deleteScheduleMutation = useDeleteWorkSchedule();

  const createHolidayMutation = useCreateCustomHoliday();
  const updateHolidayMutation = useUpdateCustomHoliday();
  const deleteHolidayMutation = useDeleteCustomHoliday();

  const { data: user } = useCurrentUser();

  // Dialog open/close states
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isHolidayOpen, setIsHolidayOpen] = useState(false);
  const [isDeleteScheduleOpen, setIsDeleteScheduleOpen] = useState(false);
  const [isDeleteHolidayOpen, setIsDeleteHolidayOpen] = useState(false);

  // Focus entity states
  const [editingSchedule, setEditingSchedule] = useState<WorkScheduleResponse | null>(null);
  const [editingHoliday, setEditingHoliday] = useState<GenbaCustomHolidayResponse | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<WorkScheduleResponse | null>(null);
  const [holidayToDelete, setHolidayToDelete] = useState<GenbaCustomHolidayResponse | null>(null);

  // Form states for Schedule
  const [shiftLabel, setShiftLabel] = useState<string>("");
  const [workDays, setWorkDays] = useState<string>("月火水木金");
  const [startTime, setStartTime] = useState<string>("08:00");
  const [endTime, setEndTime] = useState<string>("17:00");
  const [breakMinutes, setBreakMinutes] = useState<number>(60);
  const [timesPerWeek, setTimesPerWeek] = useState<string>("");
  const [hoursPerDay, setHoursPerDay] = useState<string>("8");
  const [holidayRule, setHolidayRule] = useState<string>("OFF");
  const [obonWork, setObonWork] = useState<boolean>(false);
  const [newYearWork, setNewYearWork] = useState<boolean>(false);
  const [holidayShiftRule, setHolidayShiftRule] = useState<string>("");

  // Form states for Holiday
  const [holidayDate, setHolidayDate] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [substituteDate, setSubstituteDate] = useState<string>("");

  // Roles authorized to edit (ADMIN, SENIOR_STAFF, INTERNAL_STAFF)
  const canEdit = user && ["ADMIN", "SENIOR_STAFF", "INTERNAL_STAFF"].includes(user.role);

  const resetScheduleForm = () => {
    setShiftLabel("");
    setWorkDays("月火水木金");
    setStartTime("08:00");
    setEndTime("17:00");
    setBreakMinutes(60);
    setTimesPerWeek("");
    setHoursPerDay("8");
    setHolidayRule("OFF");
    setObonWork(false);
    setNewYearWork(false);
    setHolidayShiftRule("");
    setEditingSchedule(null);
  };

  const resetHolidayForm = () => {
    setHolidayDate("");
    setDescription("");
    setSubstituteDate("");
    setEditingHoliday(null);
  };

  const handleOpenCreateSchedule = () => {
    resetScheduleForm();
    setIsScheduleOpen(true);
  };

  const handleOpenEditSchedule = (sched: WorkScheduleResponse) => {
    setEditingSchedule(sched);
    setShiftLabel(sched.shift_label || "");
    setWorkDays(sched.work_days);
    setStartTime(sched.start_time.slice(0, 5));
    setEndTime(sched.end_time.slice(0, 5));
    setBreakMinutes(sched.break_minutes);
    setTimesPerWeek(sched.times_per_week ? String(sched.times_per_week) : "");
    setHoursPerDay(sched.hours_per_day ? String(sched.hours_per_day) : "");
    setHolidayRule(sched.holiday_rule);
    setObonWork(sched.obon_work);
    setNewYearWork(sched.new_year_work);
    setHolidayShiftRule(sched.holiday_shift_rule || "");
    setIsScheduleOpen(true);
  };

  const handleOpenCreateHoliday = () => {
    resetHolidayForm();
    setIsHolidayOpen(true);
  };

  const handleOpenEditHoliday = (hol: GenbaCustomHolidayResponse) => {
    setEditingHoliday(hol);
    setHolidayDate(hol.holiday_date);
    setDescription(hol.description || "");
    setSubstituteDate(hol.substitute_date || "");
    setIsHolidayOpen(true);
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workDays || !startTime || !endTime) return;

    const formattedStartTime = startTime.length === 5 ? `${startTime}:00` : startTime;
    const formattedEndTime = endTime.length === 5 ? `${endTime}:00` : endTime;

    const payload = {
      shift_label: shiftLabel || null,
      work_days: workDays,
      start_time: formattedStartTime,
      end_time: formattedEndTime,
      break_minutes: breakMinutes,
      times_per_week: timesPerWeek ? parseInt(timesPerWeek) : null,
      hours_per_day: hoursPerDay ? parseFloat(hoursPerDay) : null,
      holiday_rule: holidayRule,
      obon_work: obonWork,
      new_year_work: newYearWork,
      holiday_shift_rule: holidayShiftRule || null,
    };

    if (editingSchedule) {
      updateScheduleMutation.mutate(
        {
          genbaId,
          scheduleId: editingSchedule.id,
          data: payload,
        },
        {
          onSuccess: () => {
            setIsScheduleOpen(false);
            resetScheduleForm();
          },
        }
      );
    } else {
      createScheduleMutation.mutate(
        {
          genbaId,
          data: payload,
        },
        {
          onSuccess: () => {
            setIsScheduleOpen(false);
            resetScheduleForm();
          },
        }
      );
    }
  };

  const handleSaveHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayDate) return;

    const payload = {
      holiday_date: holidayDate,
      description: description || null,
      substitute_date: substituteDate || null,
    };

    if (editingHoliday) {
      updateHolidayMutation.mutate(
        {
          genbaId,
          holidayId: editingHoliday.id,
          data: payload,
        },
        {
          onSuccess: () => {
            setIsHolidayOpen(false);
            resetHolidayForm();
          },
        }
      );
    } else {
      createHolidayMutation.mutate(
        {
          genbaId,
          data: payload,
        },
        {
          onSuccess: () => {
            setIsHolidayOpen(false);
            resetHolidayForm();
          },
        }
      );
    }
  };

  const handleDeleteSchedule = () => {
    if (!scheduleToDelete) return;

    deleteScheduleMutation.mutate(
      {
        genbaId,
        scheduleId: scheduleToDelete.id,
      },
      {
        onSuccess: () => {
          setIsDeleteScheduleOpen(false);
          setScheduleToDelete(null);
        },
      }
    );
  };

  const handleDeleteHoliday = () => {
    if (!holidayToDelete) return;

    deleteHolidayMutation.mutate(
      {
        genbaId,
        holidayId: holidayToDelete.id,
      },
      {
        onSuccess: () => {
          setIsDeleteHolidayOpen(false);
          setHolidayToDelete(null);
        },
      }
    );
  };

  if (schedulesError || holidaysError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <h2 className="text-lg font-bold text-red-800">エラーが発生しました</h2>
        <p className="text-sm text-red-600 mt-2">勤務スケジュール・祝日データの取得中にエラーが発生しました。</p>
      </div>
    );
  }

  const isPageLoading = isSchedulesLoading || isHolidaysLoading;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Schedules Section */}
      <div className="flex flex-col gap-4 lg:col-span-2">
        {/* Holiday Rules Priority Alert */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-bold text-amber-900">
                ※ 契約に休日規定が設定されている場合、契約の設定が現場の設定より優先されます
              </p>
              <p className="text-xs text-amber-700">
                現場の勤務スケジュール・特別休日に関わらず、契約側で「休む」「振替」などのルールが設定されている場合はそちらが適用されます。
              </p>
            </div>
          </div>
          
          {contractsWithHolidayRules.length > 0 && (
            <div className="mt-2 pl-7 flex flex-col gap-2">
              <span className="text-xs font-bold text-amber-800 border-b border-amber-200/50 pb-1">契約ごとの優先休日ルール:</span>
              <div className="grid grid-cols-1 gap-2">
                {contractsWithHolidayRules.map(contract => (
                  <div key={contract.id} className="bg-white/60 rounded border border-amber-200/50 p-2 text-xs">
                    <div className="font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                      <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[10px]">
                        {contract.contract_type === "RECEIVING" ? "受託" : "発注"}
                      </span>
                      <span>{contract.service_type || "名称未設定"}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {contract.holiday_rules?.map((rule, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded px-2 py-1">
                          <span className="font-semibold text-slate-600">{rule.rule_type}:</span>
                          <span className="font-bold text-blue-700">{rule.action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <span>基本勤務スケジュール (シフト)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">現場における日常の定常清掃シフトを設定します。</p>
          </div>
          {canEdit && (
            <button
              onClick={handleOpenCreateSchedule}
              className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-[#1E60F2] hover:bg-[#0F4FD0] text-xs font-semibold text-white transition-all shadow-sm shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>シフト追加</span>
            </button>
          )}
        </div>

        {isPageLoading ? (
          /* Skeletons */
          <div className="flex flex-col gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse flex flex-col gap-3">
                <div className="h-5 w-32 bg-slate-200 rounded"></div>
                <div className="h-4 w-48 bg-slate-200 rounded"></div>
                <div className="h-4 w-64 bg-slate-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : schedules.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[240px] bg-slate-50 rounded-xl border border-dashed border-slate-200 p-8 text-center">
            <span className="text-sm font-semibold text-slate-400">勤務スケジュールはありません</span>
            {canEdit && (
              <button
                onClick={handleOpenCreateSchedule}
                className="mt-4 inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>シフトを登録する</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {schedules.map((sched) => (
              <div
                key={sched.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h4 className="font-bold text-slate-800 text-base">{sched.shift_label || "一般勤務"}</h4>
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditSchedule(sched)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded"
                          title="編集"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setScheduleToDelete(sched);
                            setIsDeleteScheduleOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                          title="削除"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700 w-16 shrink-0">勤務曜日:</span>
                      <span className="bg-slate-100 rounded px-1.5 py-0.5 text-slate-800 font-semibold">{sched.work_days}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700 w-16 shrink-0">時間:</span>
                      <span className="font-medium text-blue-700 bg-blue-50/50 rounded px-1.5 py-0.5">
                        {sched.start_time.slice(0, 5)} 〜 {sched.end_time.slice(0, 5)} (休憩 {sched.break_minutes}分)
                      </span>
                    </div>
                    {sched.hours_per_day && (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700 w-16 shrink-0">日稼働時間:</span>
                        <span>{sched.hours_per_day} 時間/日</span>
                      </div>
                    )}
                    {sched.times_per_week && (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700 w-16 shrink-0">週稼働回数:</span>
                        <span>週 {sched.times_per_week} 回</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1 pt-1.5 border-t border-slate-100">
                      <span className="font-bold text-slate-700 w-16 shrink-0">祝日対応:</span>
                      <span>
                        {sched.holiday_rule === "OFF"
                          ? "祝日休み"
                          : sched.holiday_rule === "SHIFT_BEFORE"
                          ? "祝日前日へ振替"
                          : sched.holiday_rule === "SHIFT_AFTER"
                          ? "祝日翌日へ振替"
                          : "通常どおり稼働"}
                      </span>
                    </div>
                    {(sched.obon_work || sched.new_year_work) && (
                      <div className="flex items-center gap-3 mt-1.5">
                        {sched.obon_work && (
                          <span className="inline-flex items-center gap-0.5 bg-amber-50 text-amber-800 border border-amber-200/50 rounded px-1.5 py-0.5 text-[10px] font-bold">
                            <Check className="h-3 w-3 stroke-[2.5]" /> お盆稼働
                          </span>
                        )}
                        {sched.new_year_work && (
                          <span className="inline-flex items-center gap-0.5 bg-amber-50 text-amber-800 border border-amber-200/50 rounded px-1.5 py-0.5 text-[10px] font-bold">
                            <Check className="h-3 w-3 stroke-[2.5]" /> 年末年始稼働
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Custom Holidays Section */}
      <div className="flex flex-col gap-4 lg:border-l lg:border-slate-200 lg:pl-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-600" />
              <span>特別休日・振替日</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">当現場独自の公休日や振替勤務日を設定します。</p>
          </div>
          {canEdit && (
            <button
              onClick={handleOpenCreateHoliday}
              className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition-all shadow-sm shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>休日追加</span>
            </button>
          )}
        </div>

        {isPageLoading ? (
          /* Skeletons */
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-50 border border-slate-200 rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : holidays.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[200px] bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-400">
            <span className="text-xs">特別休日の設定はありません。</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {holidays.map((hol) => (
              <div
                key={hol.id}
                className="bg-white rounded-lg border border-slate-200 p-3.5 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between gap-3"
              >
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-red-600 text-sm">{hol.holiday_date}</span>
                    <span className="bg-red-50 text-red-800 rounded px-1.5 py-0.5 font-bold scale-90">休日</span>
                  </div>
                  {hol.description && <p className="text-slate-600 mt-0.5 font-semibold">{hol.description}</p>}
                  {hol.substitute_date && (
                    <div className="flex items-center gap-1.5 mt-1 text-emerald-700 font-bold bg-emerald-50/50 rounded px-1.5 py-0.5 w-fit">
                      <Check className="h-3 w-3" />
                      <span>振替稼働日: {hol.substitute_date}</span>
                    </div>
                  )}
                </div>

                {canEdit && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditHoliday(hol)}
                      className="p-1 text-slate-400 hover:text-blue-600 rounded"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setHolidayToDelete(hol);
                        setIsDeleteHolidayOpen(true);
                      }}
                      className="p-1 text-slate-400 hover:text-red-600 rounded"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedule Create / Edit Modal */}
      <Dialog.Root open={isScheduleOpen} onOpenChange={(open) => !open && resetScheduleForm() || setIsScheduleOpen(open)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl focus:outline-none animate-in fade-in-50 zoom-in-95 overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between gap-4 mb-4 border-b border-slate-100 pb-3">
              <Dialog.Title className="text-lg font-bold text-slate-900">
                {editingSchedule ? "勤務スケジュールを編集" : "勤務スケジュールを新規追加"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            <form onSubmit={handleSaveSchedule} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Shift Label */}
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label htmlFor="shift-label" className="text-xs font-bold text-slate-700">シフト名 (例: 午前清掃, 週次定期など)</label>
                  <input
                    type="text"
                    id="shift-label"
                    maxLength={50}
                    value={shiftLabel}
                    onChange={(e) => setShiftLabel(e.target.value)}
                    className="h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="例: 日勤A"
                  />
                </div>

                {/* Work Days */}
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label htmlFor="work-days" className="text-xs font-bold text-slate-700">
                    勤務曜日 (適用する曜日を並べて入力してください) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="work-days"
                    required
                    maxLength={50}
                    value={workDays}
                    onChange={(e) => setWorkDays(e.target.value)}
                    className="h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="例: 月水金 (毎日稼働の場合は 月火水木金土日)"
                  />
                </div>

                {/* Start Time */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="sched-start" className="text-xs font-bold text-slate-700">勤務開始時間 <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    id="sched-start"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  />
                </div>

                {/* End Time */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="sched-end" className="text-xs font-bold text-slate-700">勤務終了時間 <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    id="sched-end"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  />
                </div>

                {/* Break Minutes */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="break-mins" className="text-xs font-bold text-slate-700">休憩時間 (分)</label>
                  <input
                    type="number"
                    id="break-mins"
                    min={0}
                    value={breakMinutes}
                    onChange={(e) => setBreakMinutes(parseInt(e.target.value) || 0)}
                    className="h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Hours Per Day */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="hours-per-day" className="text-xs font-bold text-slate-700">日稼働時間 (時間)</label>
                  <input
                    type="number"
                    id="hours-per-day"
                    min={0}
                    step={0.5}
                    value={hoursPerDay}
                    onChange={(e) => setHoursPerDay(e.target.value)}
                    className="h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="例: 7.5"
                  />
                </div>

                {/* Times Per Week */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="times-week" className="text-xs font-bold text-slate-700">週稼働回数 (回)</label>
                  <input
                    type="number"
                    id="times-week"
                    min={1}
                    value={timesPerWeek}
                    onChange={(e) => setTimesPerWeek(e.target.value)}
                    className="h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="例: 5"
                  />
                </div>

                {/* Holiday Rule */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="holiday-rule" className="text-xs font-bold text-slate-700">祝日稼働ルール</label>
                  <select
                    id="holiday-rule"
                    value={holidayRule}
                    onChange={(e) => setHolidayRule(e.target.value)}
                    className="h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  >
                    {HOLIDAY_RULES.map((rule) => (
                      <option key={rule.value} value={rule.value}>
                        {rule.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Holiday Shift Rule Extra Text */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="holiday-shift-rule" className="text-xs font-bold text-slate-700">祝日振替の補足ルール (任意)</label>
                <input
                  type="text"
                  id="holiday-shift-rule"
                  maxLength={50}
                  value={holidayShiftRule}
                  onChange={(e) => setHolidayShiftRule(e.target.value)}
                  className="h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="例: ゴールデンウィーク、お盆等の例外規則"
                />
              </div>

              {/* Obon & New Year checkbox */}
              <div className="flex gap-6 mt-1.5 border border-slate-100 rounded-lg p-3 bg-slate-50/30">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 font-semibold">
                  <input
                    type="checkbox"
                    checked={obonWork}
                    onChange={(e) => setObonWork(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>お盆期間の稼働あり</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 font-semibold">
                  <input
                    type="checkbox"
                    checked={newYearWork}
                    onChange={(e) => setNewYearWork(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>年末年始の稼働あり</span>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsScheduleOpen(false)}
                  className="h-[52px] px-6 rounded-lg border border-slate-200 bg-white text-base font-semibold text-slate-800 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={createScheduleMutation.isPending || updateScheduleMutation.isPending}
                  className="inline-flex items-center justify-center h-[52px] px-6 rounded-lg bg-[#1E60F2] hover:bg-[#0F4FD0] text-base font-semibold text-white transition-colors disabled:opacity-50 shadow-sm"
                >
                  {(createScheduleMutation.isPending || updateScheduleMutation.isPending) && (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  )}
                  {editingSchedule ? "保存" : "登録"}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Holiday Create / Edit Modal */}
      <Dialog.Root open={isHolidayOpen} onOpenChange={(open) => !open && resetHolidayForm() || setIsHolidayOpen(open)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl focus:outline-none animate-in fade-in-50 zoom-in-95">
            <div className="flex items-start justify-between gap-4 mb-4 border-b border-slate-100 pb-3">
              <Dialog.Title className="text-lg font-bold text-slate-900">
                {editingHoliday ? "特別休日を編集" : "特別休日を新規追加"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            <form onSubmit={handleSaveHoliday} className="flex flex-col gap-4">
              {/* Holiday Date */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="holiday-date" className="text-xs font-bold text-slate-700">特別休日 <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  id="holiday-date"
                  required
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="holiday-desc" className="text-xs font-bold text-slate-700">休日の理由・名称 (例: お盆休み, ビルメンテナンス日)</label>
                <input
                  type="text"
                  id="holiday-desc"
                  maxLength={200}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="例: 年末年始休業"
                />
              </div>

              {/* Substitute Date */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="substitute-date" className="text-xs font-bold text-slate-700">振替出勤日 (任意: 休日とする代わりに稼働する別の日)</label>
                <input
                  type="date"
                  id="substitute-date"
                  value={substituteDate}
                  onChange={(e) => setSubstituteDate(e.target.value)}
                  className="h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsHolidayOpen(false)}
                  className="h-[52px] px-6 rounded-lg border border-slate-200 bg-white text-base font-semibold text-slate-800 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={createHolidayMutation.isPending || updateHolidayMutation.isPending}
                  className="inline-flex items-center justify-center h-[52px] px-6 rounded-lg bg-[#1E60F2] hover:bg-[#0F4FD0] text-base font-semibold text-white transition-colors disabled:opacity-50 shadow-sm"
                >
                  {(createHolidayMutation.isPending || updateHolidayMutation.isPending) && (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  )}
                  {editingHoliday ? "保存" : "登録"}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Schedule Confirmation Modal */}
      <Dialog.Root open={isDeleteScheduleOpen} onOpenChange={setIsDeleteScheduleOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl focus:outline-none animate-in fade-in-50 zoom-in-95">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500 shrink-0" />
              <div>
                <Dialog.Title className="text-lg font-bold text-slate-900">
                  勤務スケジュールを削除しますか？
                </Dialog.Title>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  シフト「<span className="font-semibold">{scheduleToDelete?.shift_label || "一般勤務"}</span>」を完全に削除します。
                  この操作は元に戻せません。よろしいですか？
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIsDeleteScheduleOpen(false)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDeleteSchedule}
                disabled={deleteScheduleMutation.isPending}
                className="inline-flex items-center justify-center h-10 rounded-lg bg-[#F83B3B] hover:bg-[#E51E1E] px-4 text-sm font-semibold text-white transition-colors disabled:opacity-50"
              >
                {deleteScheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {deleteScheduleMutation.isPending ? "削除中..." : "削除する"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Holiday Confirmation Modal */}
      <Dialog.Root open={isDeleteHolidayOpen} onOpenChange={setIsDeleteHolidayOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl focus:outline-none animate-in fade-in-50 zoom-in-95">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500 shrink-0" />
              <div>
                <Dialog.Title className="text-lg font-bold text-slate-900">
                  特別休日を削除しますか？
                </Dialog.Title>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  特別休日「<span className="font-semibold">{holidayToDelete?.holiday_date} ({holidayToDelete?.description || "説明なし"})</span>」を削除します。
                  この操作は元に戻せません。よろしいですか？
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIsDeleteHolidayOpen(false)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDeleteHoliday}
                disabled={deleteHolidayMutation.isPending}
                className="inline-flex items-center justify-center h-10 rounded-lg bg-[#F83B3B] hover:bg-[#E51E1E] px-4 text-sm font-semibold text-white transition-colors disabled:opacity-50"
              >
                {deleteHolidayMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {deleteHolidayMutation.isPending ? "削除中..." : "削除する"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
