"use client";

import React, { useState } from "react";
import {
  usePartners,
  usePartnerDetail,
  useCreatePartner,
  useUpdatePartner,
  useReorderPartners
} from "@/hooks/usePartners";
import { useCurrentUser } from "@/hooks/useAuth";
import { SortablePartnerList } from "@/components/SortablePartnerList";
import {
  Building2,
  Phone,
  Mail,
  Plus,
  Edit2,
  Search,
  X,
  Loader2,
  Building,
  Info,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { PartnerCompany } from "@/types/partner";

const partnerSchema = z.object({
  company_name: z.string().min(1, "協力会社名は必須です。").max(200, "会社名は200文字以内で入力してください。"),
  short_name: z.string().max(100, "略称は100文字以内で入力してください。").optional().or(z.literal("")),
  executive: z.string().max(100, "役員名は100文字以内で入力してください。").optional().or(z.literal("")),
  postal_code: z.string().max(20, "郵便番号は20文字以内で入力してください。").optional().or(z.literal("")),
  phone: z.string().max(20, "電話番号は20文字以内で入力してください。").optional().or(z.literal("")),
  mobile: z.string().max(20, "携帯番号は20文字以内で入力してください。").optional().or(z.literal("")),
  fax: z.string().max(20, "FAX番号は20文字以内で入力してください。").optional().or(z.literal("")),
  email: z.string().email("無効なメールアドレスです。").optional().or(z.literal("")),
  address: z.string().max(500, "住所は500文字以内で入力してください。").optional().or(z.literal("")),
  contact_person: z.string().max(100, "担当者名は100文字以内で入力してください。").optional().or(z.literal("")),
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
});

type PartnerFormValues = z.infer<typeof partnerSchema>;

export default function PartnersPage() {
  const { data: currentUser } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  
  // Dialog visibility states
  const [partnerModal, setPartnerModal] = useState<{ open: boolean; partner?: PartnerCompany } | null>(null);

  // Queries & Mutations
  const { data: partnerList, isLoading: isLoadingList } = usePartners({ search: search || undefined, limit: 1000 });
  const { data: partnerDetail, isLoading: isLoadingDetail } = usePartnerDetail(selectedPartnerId || "");

  const createPartnerMutation = useCreatePartner();
  const updatePartnerMutation = useUpdatePartner();
  const reorderPartnerMutation = useReorderPartners();

  // Form setups
  const partnerForm = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerSchema),
  });

  // Handle partner form submit
  const onPartnerSubmit = (values: PartnerFormValues) => {
    const cleanValues = {
      ...values,
      short_name: values.short_name?.trim() ? values.short_name.trim() : values.company_name,
      executive: values.executive || undefined,
      postal_code: values.postal_code || undefined,
      phone: values.phone || undefined,
      mobile: values.mobile || undefined,
      fax: values.fax || undefined,
      email: values.email || undefined,
      address: values.address || undefined,
      contact_person: values.contact_person || undefined,
      notes: values.notes || undefined,
    };

    const isEdit = !!partnerModal?.partner;
    const mutation = isEdit ? updatePartnerMutation : createPartnerMutation;
    const payload = isEdit 
      ? { id: partnerModal!.partner!.id, data: cleanValues }
      : cleanValues;

    (mutation.mutate as any)(payload, {
      onSuccess: () => {
        setPartnerModal(null);
        partnerForm.reset();
      }
    });
  };

  const openPartnerModal = (partner?: PartnerCompany) => {
    if (partner) {
      partnerForm.reset({
        company_name: partner.company_name,
        short_name: partner.short_name || partner.company_name,
        executive: partner.executive || "",
        postal_code: partner.postal_code || "",
        phone: partner.phone || "",
        mobile: partner.mobile || "",
        fax: partner.fax || "",
        email: partner.email || "",
        address: partner.address || "",
        contact_person: partner.contact_person || "",
        notes: partner.notes || "",
        is_active: partner.is_active,
      });
    } else {
      partnerForm.reset({
        company_name: "",
        short_name: "",
        executive: "",
        postal_code: "",
        phone: "",
        mobile: "",
        fax: "",
        email: "",
        address: "",
        contact_person: "",
        notes: "",
        is_active: true,
      });
    }
    setPartnerModal({ open: true, partner });
  };

  // Only users with write permission (e.g. staff/admin) can register/edit partners
  const canWrite = currentUser?.role === "ADMIN" || currentUser?.role === "SENIOR_STAFF" || currentUser?.role === "INTERNAL_STAFF";

  return (
    <div className="flex flex-col gap-6">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            協力会社管理
          </h1>
          <p className="text-sm text-slate-500">
            清掃業務等を委託する協力会社（パートナー）の情報を管理します。
          </p>
        </div>
        {canWrite && (
          <div>
            <button
              onClick={() => openPartnerModal()}
              className="inline-flex items-center gap-2 h-10 rounded-lg bg-[#1E60F2] px-4 text-sm font-semibold text-white hover:bg-[#0F4FD0] transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>協力会社登録</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Left sidebar (list), Right pane (details) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Partners List */}
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
          <div className="w-full">
            <label className="block text-xs font-medium text-slate-600 mb-1">協力会社名・検索</label>
            <div className="relative w-full">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="協力会社名で検索..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 overflow-y-auto max-h-[600px] pr-1">
            {isLoadingList ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="h-16 w-full bg-slate-100 rounded-lg animate-pulse" />
              ))
            ) : partnerList?.items.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">
                協力会社が見つかりません。
              </p>
            ) : (
              <SortablePartnerList
                items={partnerList?.items || []}
                selectedId={selectedPartnerId}
                onSelect={setSelectedPartnerId}
                isDragEnabled={!search}
                onReorder={(newItems) => {
                  const itemsToUpdate = newItems.map((item, index) => ({
                    id: item.id,
                    display_order: index,
                  }));
                  reorderPartnerMutation.mutate(itemsToUpdate);
                }}
              />
            )}
          </div>
        </div>

        {/* Right Column: Partner Detail Panel */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {isLoadingDetail ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse flex flex-col gap-4">
              <div className="h-6 w-1/3 bg-slate-200 rounded" />
              <div className="h-4 w-3/4 bg-slate-200 rounded" />
              <div className="h-32 w-full bg-slate-100 rounded" />
            </div>
          ) : !partnerDetail ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm flex flex-col items-center justify-center h-[360px]">
              <Info className="h-12 w-12 text-slate-300 mb-3" />
              <p className="text-slate-500 font-semibold">協力会社が選択されていません</p>
              <p className="text-xs text-slate-400 mt-1">左의 リストから協力会社を選択してください。</p>
            </div>
          ) : (
            <>
              {/* Partner Info Panel */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                  <h2 className="text-base font-bold text-slate-900">協力会社基本情報</h2>
                  {canWrite && (
                    <button
                      onClick={() => openPartnerModal(partnerDetail)}
                      className="inline-flex items-center gap-1 h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>編集</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-sm">
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">協力会社名</span>
                    <span className="font-semibold text-slate-800">{partnerDetail.company_name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">略称（ショートネーム）</span>
                    <span className="font-semibold text-slate-800">{partnerDetail.short_name || partnerDetail.company_name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">ステータス</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      partnerDetail.is_active ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
                    }`}>
                      {partnerDetail.is_active ? "有効" : "無効"}
                    </span>
                  </div>
                  {partnerDetail.contact_person && (
                    <div className="md:col-span-2">
                      <span className="text-xs text-slate-400 font-medium block">窓口担当者名</span>
                      <span className="font-semibold text-slate-800">{partnerDetail.contact_person}</span>
                    </div>
                  )}
                  {partnerDetail.executive && (
                    <div className="md:col-span-2">
                      <span className="text-xs text-slate-400 font-medium block">役員</span>
                      <span className="font-semibold text-slate-800">{partnerDetail.executive}</span>
                    </div>
                  )}
                  {partnerDetail.phone && (
                    <div>
                      <span className="text-xs text-slate-400 font-medium block">電話番号</span>
                      <span className="font-semibold text-slate-800">{partnerDetail.phone}</span>
                    </div>
                  )}
                  {partnerDetail.mobile && (
                    <div>
                      <span className="text-xs text-slate-400 font-medium block">携帯番号</span>
                      <span className="font-semibold text-slate-800">{partnerDetail.mobile}</span>
                    </div>
                  )}
                  {partnerDetail.fax && (
                    <div>
                      <span className="text-xs text-slate-400 font-medium block">FAX番号</span>
                      <span className="font-semibold text-slate-800">{partnerDetail.fax}</span>
                    </div>
                  )}
                  {partnerDetail.email && (
                    <div>
                      <span className="text-xs text-slate-400 font-medium block">メールアドレス</span>
                      <span className="font-semibold text-slate-800">{partnerDetail.email}</span>
                    </div>
                  )}
                  {partnerDetail.postal_code && (
                    <div className="md:col-span-2">
                      <span className="text-xs text-slate-400 font-medium block">郵便番号</span>
                      <span className="font-semibold text-slate-800">{partnerDetail.postal_code}</span>
                    </div>
                  )}
                  {partnerDetail.address && (
                    <div className="md:col-span-2">
                      <span className="text-xs text-slate-400 font-medium block">住所</span>
                      <span className="font-semibold text-slate-800">{partnerDetail.address}</span>
                    </div>
                  )}
                  {partnerDetail.notes && (
                    <div className="md:col-span-2">
                      <span className="text-xs text-slate-400 font-medium block">備考</span>
                      <p className="mt-1 text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap">
                        {partnerDetail.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Partner Create/Edit Dialog */}
      <Dialog.Root open={!!partnerModal?.open} onOpenChange={(open) => { if(!open) setPartnerModal(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl focus:outline-none animate-in fade-in-50 zoom-in-95">
            <div className="flex items-start justify-between mb-4">
              <Dialog.Title className="text-lg font-bold text-slate-900">
                {partnerModal?.partner ? "協力会社情報の編集" : "協力会社の新規登録"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            <form onSubmit={partnerForm.handleSubmit(onPartnerSubmit)} className="flex flex-col gap-4 text-sm">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700">協力会社名 <span className="text-destructive">*</span></label>
                <input
                  type="text"
                  placeholder="例: 有限会社クリーンパートナー"
                  {...partnerForm.register("company_name")}
                  className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                {partnerForm.formState.errors.company_name && (
                  <p className="text-xs text-destructive">{partnerForm.formState.errors.company_name.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700">略称（ショートネーム）</label>
                <input
                  type="text"
                  placeholder="未入力の場合は会社名が自動設定されます"
                  {...partnerForm.register("short_name")}
                  className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                {partnerForm.formState.errors.short_name && (
                  <p className="text-xs text-destructive">{partnerForm.formState.errors.short_name.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700">窓口担当者名</label>
                <input
                  type="text"
                  placeholder="例: 佐藤 健二"
                  {...partnerForm.register("contact_person")}
                  className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                {partnerForm.formState.errors.contact_person && (
                  <p className="text-xs text-destructive">{partnerForm.formState.errors.contact_person.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700">役員</label>
                <input
                  type="text"
                  placeholder="例: 代表取締役"
                  {...partnerForm.register("executive")}
                  className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                {partnerForm.formState.errors.executive && (
                  <p className="text-xs text-destructive">{partnerForm.formState.errors.executive.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-700">電話番号</label>
                  <input
                     type="text"
                     placeholder="03-XXXX-XXXX"
                     {...partnerForm.register("phone")}
                     className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  {partnerForm.formState.errors.phone && (
                    <p className="text-xs text-destructive">{partnerForm.formState.errors.phone.message}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-700">携帯番号</label>
                  <input
                     type="text"
                     placeholder="090-XXXX-XXXX"
                     {...partnerForm.register("mobile")}
                     className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  {partnerForm.formState.errors.mobile && (
                    <p className="text-xs text-destructive">{partnerForm.formState.errors.mobile.message}</p>
                  )}
                </div>
              </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-700">FAX番号</label>
                  <input
                     type="text"
                     placeholder="03-XXXX-XXXX"
                     {...partnerForm.register("fax")}
                     className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  {partnerForm.formState.errors.fax && (
                    <p className="text-xs text-destructive">{partnerForm.formState.errors.fax.message}</p>
                  )}
                </div>
              

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700">メールアドレス</label>
                <input
                  type="text"
                  placeholder="info@partner.com"
                  {...partnerForm.register("email")}
                  className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                {partnerForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{partnerForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-700">郵便番号</label>
                  <input
                     type="text"
                     placeholder="100-0001"
                     {...partnerForm.register("postal_code")}
                     className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  {partnerForm.formState.errors.postal_code && (
                    <p className="text-xs text-destructive">{partnerForm.formState.errors.postal_code.message}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-700">住所</label>
                  <input
                    type="text"
                    placeholder="例: 東京都千代田区..."
                    {...partnerForm.register("address")}
                    className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  {partnerForm.formState.errors.address && (
                    <p className="text-xs text-destructive">{partnerForm.formState.errors.address.message}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700">備考</label>
                <textarea
                  rows={3}
                  {...partnerForm.register("notes")}
                  className="rounded-lg border border-slate-200 p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {partnerModal?.partner && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    {...partnerForm.register("is_active")}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="is_active" className="font-semibold text-slate-700 select-none">
                    この協力会社を有功にする
                  </label>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setPartnerModal(null)}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={createPartnerMutation.isPending || updatePartnerMutation.isPending}
                  className="inline-flex items-center justify-center h-10 rounded-lg bg-[#1E60F2] text-white px-6 font-semibold hover:bg-[#0F4FD0] transition-colors disabled:opacity-50"
                >
                  {(createPartnerMutation.isPending || updatePartnerMutation.isPending) && (
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
