"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { 
  useGenbaStaff as useGenbaStaffAssignments, 
  useAssignGenbaStaff as useAssignStaff, 
  useRemoveGenbaStaff as useUnassignStaff,
  useStaffList 
} from "@/hooks/useStaff";
import { 
  useGenbaWorkerAssignments, 
  useAssignWorker, 
  useUnassignWorker,
  useWorkersList 
} from "@/hooks/useWorkers";
import { 
  UserCheck, 
  UserX, 
  Plus, 
  Loader2, 
  ShieldAlert,
  User,
  Users as UsersIcon,
  ShieldCheck
} from "lucide-react";

export default function GenbaWorkersPage() {
  const params = useParams();
  const genbaId = params.id as string;

  // Selected staff and worker IDs for assignment
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [roleType, setRoleType] = useState<"MAIN" | "SUB">("SUB");
  const [selectedWorkerId, setSelectedWorkerId] = useState("");

  // Error message states
  const [staffError, setStaffError] = useState("");
  const [workerError, setWorkerError] = useState("");

  // Assignments queries
  const { data: staffAssignments, isLoading: isLoadingStaff } = useGenbaStaffAssignments(genbaId);
  const { data: workerAssignments, isLoading: isLoadingWorkers } = useGenbaWorkerAssignments(genbaId);

  // Available staff and workers for dropdowns
  const { data: availableStaff } = useStaffList({ limit: 100, is_active: true });
  const { data: availableWorkers } = useWorkersList({ limit: 100, is_active: true });

  // Mutations
  const assignStaffMutation = useAssignStaff(genbaId);
  const unassignStaffMutation = useUnassignStaff(genbaId);
  const assignWorkerMutation = useAssignWorker(genbaId);
  const unassignWorkerMutation = useUnassignWorker(genbaId);

  const handleAssignStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) return;
    setStaffError("");

    assignStaffMutation.mutate(
      { staff_id: selectedStaffId, role_type: roleType },
      {
        onSuccess: () => {
          setSelectedStaffId("");
          setRoleType("SUB");
        },
        onError: (err: any) => {
          const errMsg = err.response?.data?.detail?.error?.message || "割り当てに失敗しました。";
          setStaffError(errMsg);
        }
      }
    );
  };

  const handleAssignWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerId) return;
    setWorkerError("");

    assignWorkerMutation.mutate(
      { worker_id: selectedWorkerId },
      {
        onSuccess: () => {
          setSelectedWorkerId("");
        },
        onError: (err: any) => {
          const errMsg = err.response?.data?.detail?.error?.message || "割り当てに失敗しました。";
          setWorkerError(errMsg);
        }
      }
    );
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Left Pane: Staff Assignments (社内担当者) */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-500" />
            <span>社内担当者（管理責任者）</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            この現場を統括する社内担当者（代表担当者1名、およびサブ担当者）を割り当てます。
          </p>
        </div>

        {/* Assignment Form */}
        <form onSubmit={handleAssignStaff} className="flex flex-col gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">担当者を選択</label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">担当者を選択...</option>
                {availableStaff?.items.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.last_name} {st.first_name} ({st.positions?.map((p: any) => p.name).join(", ") || "役職なし"})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">役割</label>
              <select
                value={roleType}
                onChange={(e) => setRoleType(e.target.value as "MAIN" | "SUB")}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="SUB">サブ担当 (SUB)</option>
                <option value="MAIN">代表担当 (MAIN)</option>
              </select>
            </div>
          </div>

          {staffError && (
            <p className="text-xs font-semibold text-destructive">{staffError}</p>
          )}

          <button
            type="submit"
            disabled={!selectedStaffId || assignStaffMutation.isPending}
            className="inline-flex items-center justify-center h-10 rounded-lg bg-[#1E60F2] text-white px-4 text-xs font-semibold hover:bg-[#0F4FD0] transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            {assignStaffMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {assignStaffMutation.isPending ? "割り当て中..." : "担当者を割り当てる"}
          </button>
        </form>

        {/* Assigned list */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold text-slate-500">割り当て済みの担当者</h3>
          {isLoadingStaff ? (
            Array.from({ length: 2 }).map((_, idx) => (
              <div key={idx} className="h-14 w-full bg-slate-100 rounded-lg animate-pulse" />
            ))
          ) : !staffAssignments || staffAssignments.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
              担当者が設定されていません。
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {staffAssignments.map((assign) => (
                <div
                  key={assign.id}
                  className={`flex items-center justify-between p-3.5 rounded-lg border text-sm ${
                    assign.role_type === "MAIN"
                      ? "border-blue-100 bg-blue-50/10"
                      : "border-slate-100 bg-slate-50/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-slate-400 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">
                          {assign.staff.last_name} {assign.staff.first_name}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            assign.role_type === "MAIN"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {assign.role_type === "MAIN" ? "代表" : "サブ"}
                        </span>
                      </div>
                      {assign.staff.positions?.map((p: any) => p.name).join(", ") && (
                        <p className="text-[10px] text-slate-500 mt-0.5">{assign.staff.positions?.map((p: any) => p.name).join(", ")}</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => unassignStaffMutation.mutate(assign.staff_id)}
                    disabled={unassignStaffMutation.isPending}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-red-50 hover:text-red-600 text-slate-400 transition-colors"
                    aria-label="Remove assignment"
                  >
                    <UserX className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Pane: Worker Assignments (現場員) */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-blue-500" />
            <span>現場員（作業スタッフ）</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            現地で清掃や保守管理作業を担当する現場員を配置します。
          </p>
        </div>

        {/* Assignment Form */}
        <form onSubmit={handleAssignWorker} className="flex flex-col gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">現場员を選択</label>
            <select
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">現場員を選択...</option>
              {availableWorkers?.items.map((wk) => (
                <option key={wk.id} value={wk.id}>
                  {wk.full_name} {wk.phone ? `(${wk.phone})` : ""}
                </option>
              ))}
            </select>
          </div>

          {workerError && (
            <p className="text-xs font-semibold text-destructive">{workerError}</p>
          )}

          <button
            type="submit"
            disabled={!selectedWorkerId || assignWorkerMutation.isPending}
            className="inline-flex items-center justify-center h-10 rounded-lg bg-[#1E60F2] text-white px-4 text-xs font-semibold hover:bg-[#0F4FD0] transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            {assignWorkerMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {assignWorkerMutation.isPending ? "配置中..." : "現場員を配置する"}
          </button>
        </form>

        {/* Assigned list */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold text-slate-500">配置済みの現場員</h3>
          {isLoadingWorkers ? (
            Array.from({ length: 2 }).map((_, idx) => (
              <div key={idx} className="h-14 w-full bg-slate-100 rounded-lg animate-pulse" />
            ))
          ) : !workerAssignments || workerAssignments.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
              現場員が配置されていません。
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {workerAssignments.map((assign) => (
                <div
                  key={assign.id}
                  className="flex items-center justify-between p-3.5 rounded-lg border border-slate-100 bg-slate-50/20 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <UserCheck className="h-5 w-5 text-emerald-500 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800">
                        {assign.worker.full_name}
                      </p>
                      {assign.worker.phone && (
                        <p className="text-[10px] text-slate-500 mt-0.5">{assign.worker.phone}</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => unassignWorkerMutation.mutate(assign.worker_id)}
                    disabled={unassignWorkerMutation.isPending}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-red-50 hover:text-red-600 text-slate-400 transition-colors"
                    aria-label="Remove assignment"
                  >
                    <UserX className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
