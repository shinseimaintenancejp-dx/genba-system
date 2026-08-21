"use client";
import { usePageHeader } from "@/hooks/usePageHeader";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateGenba } from "@/hooks/useGenba";
import { useCustomers, useCustomerContacts } from "@/hooks/useCustomers";
import { useStaffList } from "@/hooks/useStaff";
import { Loader2, AlertTriangle, X, Plus, Trash2 } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import type { DuplicateWarning, Genba } from "@/types/genba";

// Validation schema conforming to backend constraints
const genbaSchema = z.object({
  property_name: z.string().min(1, "物件名は必須です。").max(200, "物件名は200文字以内で入力してください。"),
  address: z.string().min(1, "住所は必須です。").max(500, "住所は500文字以内で入力してください。"),
  transportation: z.string().optional(),
  phone: z.string().max(20, "電話番号は20文字以内で入力してください。").optional().or(z.literal("")),
  external_partner_code: z.string().max(20, "外部コードは20文字以内で入力してください。").optional().or(z.literal("")),
  special_notes: z.string().optional(),
  management_start_date: z.string().min(1, "管理開始日は必須です。"),
  customer_id: z.string().min(1, "取引先は必須です。"),

  // Sprint 5 fields
  genba_type: z.enum(["MANSION", "OFFICE_BUILDING", "LOGISTICS_CENTER", "OTHER"]).optional().or(z.literal("")),
  genba_type_other: z.string().max(100, "100文字以内で入力してください").optional(),
  floor_above_ground: z.number().min(0).max(200).optional().or(z.literal("")),
  floor_basement: z.number().min(0).max(30).optional().or(z.literal("")),

  contact_ids: z.array(z.string()).optional(),
  new_contacts: z.array(z.object({
    full_name: z.string().min(1, "氏名を入力してください"),
    phone: z.string().optional(),
    email: z.string().email("有効なメールアドレスを入力してください").optional().or(z.literal("")),
    position: z.string().optional(),
  })).optional(),

  staff_assignments: z.array(z.object({
    staff_id: z.string().min(1, "担当者を選択してください"),
    role_type: z.enum(["MAIN", "SUB"]),
  })).optional(),
}).refine(data => {
  if (data.genba_type === "OTHER" && !data.genba_type_other) {
    return false;
  }
  return true;
}, {
  message: "現場タイプが「その他」の場合、詳細を入力してください。",
  path: ["genba_type_other"]
});

type GenbaFormValues = z.infer<typeof genbaSchema>;

export default function NewGenbaPage() {
  usePageHeader("現場登録", "新規に管理する現場の情報を登録します。");
  const router = useRouter();
  const createGenbaMutation = useCreateGenba();
  const { data: customerData } = useCustomers({ limit: 100 });
  const { data: staffData } = useStaffList({ limit: 100 });
  
  // Duplicate warning state
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateWarning | null>(null);
  const [pendingFormData, setPendingFormData] = useState<GenbaFormValues | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<GenbaFormValues>({
    resolver: zodResolver(genbaSchema),
    defaultValues: {
      property_name: "",
      address: "",
      transportation: "",
      phone: "",
      external_partner_code: "",
      special_notes: "",
      management_start_date: new Date().toISOString().split("T")[0],
      customer_id: "",
      genba_type: "",
      genba_type_other: "",
      floor_above_ground: "",
      floor_basement: "",
      contact_ids: [],
      new_contacts: [],
      staff_assignments: [],
    },
  });

  const selectedCustomerId = watch("customer_id");
  const selectedGenbaType = watch("genba_type");

  // Fetch contacts for selected customer
  const { data: customerContacts } = useCustomerContacts(selectedCustomerId);

  // Field Arrays for dynamic sections
  const { fields: newContactFields, append: appendNewContact, remove: removeNewContact } = useFieldArray({
    control,
    name: "new_contacts"
  });

  const { fields: staffFields, append: appendStaff, remove: removeStaff } = useFieldArray({
    control,
    name: "staff_assignments"
  });

  // Clear contacts when customer changes
  useEffect(() => {
    setValue("contact_ids", []);
    setValue("new_contacts", []);
  }, [selectedCustomerId, setValue]);

  const onSubmit = async (values: GenbaFormValues) => {
    // Format numeric strings to numbers before sending
    const formattedValues = {
      ...values,
      floor_above_ground: values.floor_above_ground === "" ? null : Number(values.floor_above_ground),
      floor_basement: values.floor_basement === "" ? null : Number(values.floor_basement),
      genba_type: values.genba_type === "" ? null : values.genba_type,
    };

    createGenbaMutation.mutate(
      {
        ...formattedValues,
        confirm_duplicate: false,
      } as any,
      {
        onSuccess: (response) => {
          if ("warning" in response) {
            setDuplicateWarning(response as DuplicateWarning);
            setPendingFormData(values);
          } else {
            router.push(`/genba/${(response as any).id}/basic`);
          }
        },
      }
    );
  };

  const handleForceSubmit = () => {
    if (!pendingFormData) return;
    
    const formattedValues = {
      ...pendingFormData,
      floor_above_ground: pendingFormData.floor_above_ground === "" ? null : Number(pendingFormData.floor_above_ground),
      floor_basement: pendingFormData.floor_basement === "" ? null : Number(pendingFormData.floor_basement),
      genba_type: pendingFormData.genba_type === "" ? null : pendingFormData.genba_type,
    };

    createGenbaMutation.mutate(
      {
        ...formattedValues,
        confirm_duplicate: true,
      } as any,
      {
        onSuccess: (response) => {
          if (!("warning" in response)) {
            setDuplicateWarning(null);
            router.push(`/genba/${(response as any).id}/basic`);
          }
        },
      }
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header section */}
      

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        
        {/* ========================================================= */}
        {/* Basic Info Section */}
        {/* ========================================================= */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-6">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">基本情報</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            
            {/* Customer */}
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">
                取引先 <span className="text-destructive">*</span>
              </label>
              <select
                {...register("customer_id")}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              >
                <option value="">取引先を選択してください</option>
                {customerData?.items.map((cust) => (
                  <option key={cust.id} value={cust.id}>
                    {cust.full_name}
                  </option>
                ))}
              </select>
              {errors.customer_id && <p className="text-xs text-destructive">{errors.customer_id.message}</p>}
            </div>

            {/* Property Name */}
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">
                物件名 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="例: 新大阪第一ビル"
                {...register("property_name")}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
              {errors.property_name && <p className="text-xs text-destructive">{errors.property_name.message}</p>}
            </div>

            {/* Genba Type */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">
                現場タイプ
              </label>
              <select
                {...register("genba_type")}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              >
                <option value="">選択してください</option>
                <option value="MANSION">マンション</option>
                <option value="OFFICE_BUILDING">オフィスビル</option>
                <option value="LOGISTICS_CENTER">物流センター</option>
                <option value="OTHER">その他</option>
              </select>
            </div>

            {/* Genba Type Other (Conditional) */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">
                その他（詳細） {selectedGenbaType === "OTHER" && <span className="text-destructive">*</span>}
              </label>
              <input
                type="text"
                disabled={selectedGenbaType !== "OTHER"}
                placeholder="現場タイプがその他の場合に入力"
                {...register("genba_type_other")}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all disabled:bg-slate-50 disabled:text-slate-400"
              />
              {errors.genba_type_other && <p className="text-xs text-destructive">{errors.genba_type_other.message}</p>}
            </div>

            {/* Address */}
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">
                住所 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="例: 大阪府大阪市淀川区宮原X-X-X"
                {...register("address")}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
              {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
            </div>

            {/* Floor Count */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">地上階数</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  {...register("floor_above_ground", { valueAsNumber: true })}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 pr-8 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <span className="absolute right-3 top-2.5 text-sm text-slate-500">階</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">地下階数</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  {...register("floor_basement", { valueAsNumber: true })}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 pr-8 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <span className="absolute right-3 top-2.5 text-sm text-slate-500">階</span>
              </div>
            </div>

            {/* Phone Number */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">現地電話番号</label>
              <input
                type="text"
                placeholder="例: 06-XXXX-XXXX"
                {...register("phone")}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
            </div>

            {/* Transportation */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">交通手段</label>
              <input
                type="text"
                placeholder="例: JR新大阪駅 徒歩5分"
                {...register("transportation")}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Management Start Date */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">
                管理開始日 <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                {...register("management_start_date")}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
              {errors.management_start_date && <p className="text-xs text-destructive">{errors.management_start_date.message}</p>}
            </div>

            {/* External Partner Code */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">外部連携コード (協力会社コード)</label>
              <input
                type="text"
                placeholder="例: P10023"
                {...register("external_partner_code")}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
            
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">特記事項 (特記事項・引継ぎ事項)</label>
              <textarea
                rows={3}
                placeholder="現場での特記ルール、作業上の注意点などを入力します"
                {...register("special_notes")}
                className="rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>
        </section>


        {/* ========================================================= */}
        {/* Customer Contacts Section */}
        {/* ========================================================= */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-6">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center justify-between">
            取引先 担当者情報
          </h2>
          
          {!selectedCustomerId ? (
            <div className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-100 text-center">
              先に取引先を選択してください。
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Existing Contacts Selection */}
              {customerContacts && customerContacts.length > 0 && (
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-semibold text-slate-700">登録済みの担当者から選択</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {customerContacts.map((contact) => (
                      <label key={contact.id} className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          value={contact.id}
                          {...register("contact_ids")}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-800">{contact.full_name}</span>
                          <span className="text-xs text-slate-500">{contact.position || "役職なし"}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* New Contacts Creation */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700">新しい担当者を登録して追加</label>
                  <button
                    type="button"
                    onClick={() => appendNewContact({ full_name: "", phone: "", email: "", position: "" })}
                    className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-1" /> 追加する
                  </button>
                </div>
                
                {newContactFields.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">追加する新しい担当者はいません。</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {newContactFields.map((field, index) => (
                      <div key={field.id} className="relative p-4 border border-blue-100 bg-blue-50/30 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => removeNewContact(index)}
                          className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-slate-600">氏名 <span className="text-destructive">*</span></label>
                          <input
                            type="text"
                            {...register(`new_contacts.${index}.full_name` as const)}
                            className="h-8 rounded border border-slate-200 px-2 text-sm"
                          />
                          {errors.new_contacts?.[index]?.full_name && (
                            <p className="text-[10px] text-destructive">{errors.new_contacts[index]?.full_name?.message}</p>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-slate-600">役職</label>
                          <input
                            type="text"
                            {...register(`new_contacts.${index}.position` as const)}
                            className="h-8 rounded border border-slate-200 px-2 text-sm"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-slate-600">電話番号</label>
                          <input
                            type="text"
                            {...register(`new_contacts.${index}.phone` as const)}
                            className="h-8 rounded border border-slate-200 px-2 text-sm"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-slate-600">メールアドレス</label>
                          <input
                            type="email"
                            {...register(`new_contacts.${index}.email` as const)}
                            className="h-8 rounded border border-slate-200 px-2 text-sm"
                          />
                          {errors.new_contacts?.[index]?.email && (
                            <p className="text-[10px] text-destructive">{errors.new_contacts[index]?.email?.message}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>


        {/* ========================================================= */}
        {/* Internal Staff Assignment Section */}
        {/* ========================================================= */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-lg font-bold text-slate-800">自社 担当者情報</h2>
            <button
              type="button"
              onClick={() => appendStaff({ staff_id: "", role_type: "MAIN" })}
              className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors"
            >
              <Plus className="h-4 w-4 mr-1" /> 担当者を追加
            </button>
          </div>

          {staffFields.length === 0 ? (
            <div className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-100 text-center">
              自社の担当者が設定されていません。右上のボタンから追加してください。
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {staffFields.map((field, index) => (
                <div key={field.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                  <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
                    <div className="flex-1">
                      <select
                        {...register(`staff_assignments.${index}.staff_id` as const)}
                        className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
                      >
                        <option value="">担当者を選択</option>
                        {staffData?.items.map((staff: any) => (
                          <option key={staff.id} value={staff.id}>
                            {staff.full_name} {staff.position ? `(${staff.position})` : ""}
                          </option>
                        ))}
                      </select>
                      {errors.staff_assignments?.[index]?.staff_id && (
                        <p className="text-xs text-destructive mt-1">{errors.staff_assignments[index]?.staff_id?.message}</p>
                      )}
                    </div>
                    <div className="w-full sm:w-48">
                      <select
                        {...register(`staff_assignments.${index}.role_type` as const)}
                        className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 bg-white"
                      >
                        <option value="MAIN">主担当 (MAIN)</option>
                        <option value="SUB">副担当 (SUB)</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeStaff(index)}
                    className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>


        {/* ========================================================= */}
        {/* Submit Actions */}
        {/* ========================================================= */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/genba")}
            disabled={createGenbaMutation.isPending}
            className="h-12 rounded-lg border border-slate-200 bg-white px-6 font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            キャンセル
          </button>
          
          <button
            type="submit"
            disabled={createGenbaMutation.isPending}
            className="inline-flex items-center justify-center h-12 rounded-lg bg-[#1E60F2] px-8 font-bold text-white hover:bg-[#0F4FD0] transition-colors disabled:opacity-50 shadow-sm"
          >
            {createGenbaMutation.isPending && (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            )}
            {createGenbaMutation.isPending ? "登録中..." : "現場を登録する"}
          </button>
        </div>
      </form>

      {/* 2-Way Duplicate Warning Confirmation Dialog */}
      <Dialog.Root open={!!duplicateWarning} onOpenChange={(open) => { if (!open) setDuplicateWarning(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in-50 zoom-in-95 focus:outline-none">
            
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-6 w-6 shrink-0" />
                <Dialog.Title className="text-lg font-bold text-slate-900">
                  類似する現場が存在します
                </Dialog.Title>
              </div>
              <Dialog.Close asChild>
                <button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            <div className="text-sm text-slate-600 mb-6 flex flex-col gap-3">
              <p>
                入力された物件名と類似する名前の現場が既に登録されています。重複登録でないか確認してください。
              </p>
              <div className="rounded-lg bg-amber-50/50 border border-amber-100 p-3 flex flex-col gap-2 max-h-[160px] overflow-y-auto">
                <p className="text-xs font-semibold text-amber-800">
                  既に登録されている現場:
                </p>
                {duplicateWarning?.duplicates.map((dup: Genba) => (
                  <div key={dup.id} className="text-xs border-b border-amber-100/50 pb-1.5 last:border-0 last:pb-0">
                    <p className="font-semibold text-slate-800">{dup.property_name}</p>
                    <p className="text-slate-500">{dup.address}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                ※このまま登録を続ける場合は「強制登録する」をクリックしてください。
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDuplicateWarning(null)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                キャンセル
              </button>
              
              <button
                type="button"
                onClick={handleForceSubmit}
                disabled={createGenbaMutation.isPending}
                className="inline-flex items-center justify-center h-10 rounded-lg bg-[#1E60F2] px-4 text-sm font-semibold text-white hover:bg-[#0F4FD0] transition-colors disabled:opacity-50"
              >
                {createGenbaMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                強制登録する
              </button>
            </div>

          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
