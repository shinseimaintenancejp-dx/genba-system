"use client";

import React, { useState } from "react";
import { useStaffList, useCreateStaff, useUpdateStaff, type Staff } from "@/hooks/useStaff";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Plus, Search, Edit2, X, Loader2 } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const staffSchema = z.object({
  last_name: z.string().min(1, "姓は必須です。").max(100, "姓は100文字以内で入力してください。"),
  first_name: z.string().min(1, "名は必須です。").max(100, "名は100文字以内で入力してください。"),
  position: z.string().max(50, "役職は50文字以内で入力してください。").optional().or(z.literal("")),
  phone: z.string().max(20, "電話番号は20文字以内で入力してください。").optional().or(z.literal("")),
  email: z.string().email("無効なメールアドレスです。").optional().or(z.literal("")),
});

type StaffFormValues = z.infer<typeof staffSchema>;

export default function StaffPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalState, setModalState] = useState<{ open: boolean; staff?: Staff } | null>(null);
  const [formError, setFormError] = useState("");

  // Queries
  const { data, isLoading } = useStaffList({
    skip: (page - 1) * 10,
    limit: 10,
    search: search || undefined,
  });

  const createStaffMutation = useCreateStaff();
  const updateStaffMutation = useUpdateStaff();

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
  });

  const openModal = (staff?: Staff) => {
    setFormError("");
    if (staff) {
      form.reset({
        last_name: staff.last_name,
        first_name: staff.first_name,
        position: staff.positions?.map((p: any) => p.name).join(", ") || "",
        phone: staff.phone || "",
        email: staff.email || "",
      });
    } else {
      form.reset({
        last_name: "",
        first_name: "",
        position: "",
        phone: "",
        email: "",
      });
    }
    setModalState({ open: true, staff });
  };

  const onSubmit = (values: StaffFormValues) => {
    setFormError("");
    const isEdit = !!modalState?.staff;
    const mutation = isEdit ? updateStaffMutation : createStaffMutation;
    
    // Clean empty values to undefined
    const cleanValues = {
      ...values,
      position: values.position || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
    };

    const payload = isEdit 
      ? { id: modalState!.staff!.id, data: cleanValues }
      : cleanValues;

    (mutation.mutate as any)(payload, {
      onSuccess: () => {
        setModalState(null);
        form.reset();
      },
      onError: (err: any) => {
        const errMsg = err.response?.data?.detail?.error?.message || "処理に失敗しました。";
        setFormError(errMsg);
      }
    });
  };

  const columns: Column<Staff>[] = [
    {
      header: "氏名",
      accessorKey: "full_name",
      render: (row) => `${row.last_name} ${row.first_name}`,
      sortable: true,
    },
    {
      header: "役職",
      accessorKey: "positions",
      render: (row) => row.positions?.map((p: any) => p.name).join(", ") || "-",
      sortable: false,
    },
    {
      header: "電話番号",
      accessorKey: "phone",
      render: (row) => row.phone || "-",
    },
    {
      header: "メールアドレス",
      accessorKey: "email",
      render: (row) => row.email || "-",
      sortable: true,
    },
    {
      header: "ステータス",
      accessorKey: "is_active",
      render: (row) => (
        <span
          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset ${
            row.is_active
              ? "bg-emerald-50 text-emerald-700 ring-emerald-600/10"
              : "bg-slate-50 text-slate-600 ring-slate-500/10"
          }`}
        >
          {row.is_active ? "有効" : "無効"}
        </span>
      ),
    },
    {
      header: "操作",
      render: (row) => (
        <button
          onClick={() => openModal(row)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Edit2 className="h-3.5 w-3.5" />
          <span>編集</span>
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            社内担当者管理
          </h1>
          <p className="text-sm text-slate-500">
            社内の管理スタッフ・責任者の連絡先を登録・編集します。
          </p>
        </div>
        <div>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 h-10 rounded-lg bg-[#1E60F2] px-4 text-sm font-semibold text-white hover:bg-[#0F4FD0] transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>担当者登録</span>
          </button>
        </div>
      </div>

      {/* Search Filter */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="氏名やメールアドレスで検索..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full h-10 rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Grid Table */}
      <DataTable
        columns={columns}
        data={data?.items}
        isLoading={isLoading}
        totalCount={data?.total}
        page={page}
        limit={10}
        onPageChange={setPage}
        emptyMessage="該当する担当者が見つかりません。"
      />

      {/* Create/Edit Dialog Modal */}
      <Dialog.Root open={!!modalState?.open} onOpenChange={(open) => { if (!open) setModalState(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl focus:outline-none animate-in fade-in-50 zoom-in-95">
            <div className="flex items-start justify-between mb-4">
              <Dialog.Title className="text-lg font-bold text-slate-900">
                {modalState?.staff ? "担当者情報の編集" : "担当者の新規登録"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 text-sm">
              <div className="flex gap-4">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="font-semibold text-slate-700">姓 <span className="text-destructive">*</span></label>
                  <input
                    type="text"
                    placeholder="例: 関西"
                    {...form.register("last_name")}
                    className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  {form.formState.errors.last_name && (
                    <p className="text-xs text-destructive">{form.formState.errors.last_name.message}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="font-semibold text-slate-700">名 <span className="text-destructive">*</span></label>
                  <input
                    type="text"
                    placeholder="例: 太郎"
                    {...form.register("first_name")}
                    className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  {form.formState.errors.first_name && (
                    <p className="text-xs text-destructive">{form.formState.errors.first_name.message}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700">役職</label>
                <input
                  type="text"
                  placeholder="例: エリアマネージャー"
                  {...form.register("position")}
                  className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                {form.formState.errors.position && (
                  <p className="text-xs text-destructive">{form.formState.errors.position.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700">電話番号</label>
                <input
                  type="text"
                  placeholder="例: 06-XXXX-XXXX"
                  {...form.register("phone")}
                  className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                {form.formState.errors.phone && (
                  <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700">メールアドレス</label>
                <input
                  type="text"
                  placeholder="staff@example.com"
                  {...form.register("email")}
                  className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>

              {formError && (
                <p className="text-xs font-semibold text-destructive">{formError}</p>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setModalState(null)}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={createStaffMutation.isPending || updateStaffMutation.isPending}
                  className="inline-flex items-center justify-center h-10 rounded-lg bg-[#1E60F2] text-white px-6 font-semibold hover:bg-[#0F4FD0] transition-colors disabled:opacity-50"
                >
                  {(createStaffMutation.isPending || updateStaffMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  保存
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
