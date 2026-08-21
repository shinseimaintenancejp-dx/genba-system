"use client";
import { usePageHeader } from "@/hooks/usePageHeader";

import React, { useState } from "react";
import { 
  useCustomers, 
  useCustomerDetail, 
  useCreateCustomer, 
  useUpdateCustomer,
  useCreateCustomerContact,
  useUpdateCustomerContact,
  useDeleteCustomerContact,
  useReorderCustomers
} from "@/hooks/useCustomers";
import { useCurrentUser } from "@/hooks/useAuth";
import { SortableCustomerList } from "@/components/SortableCustomerList";
import { 
  Building2, 
  Phone, 
  Mail, 
  Plus, 
  Edit2, 
  Trash2, 
  UserPlus, 
  Search, 
  X, 
  Loader2,
  Check,
  Building,
  Info
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Customer, CustomerContact } from "@/types/customer";

// Zod schemas for validation
const customerSchema = z.object({
  full_name: z.string().min(1, "正式名は必須です。").max(200),
  short_name: z.string().min(1, "略称は必須です。").max(50),
  branch_name: z.string().optional(),
  phone: z.string().max(20).optional().or(z.literal("")),
  fax: z.string().max(20).optional().or(z.literal("")),
  email: z.string().email("無効なメールアドレスです。").optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
});

const contactSchema = z.object({
  full_name: z.string().min(1, "担当者名は必須です。").max(100),
  position: z.string().max(100).optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  email: z.string().email("無効なメールアドレスです。").optional().or(z.literal("")),
  notes: z.string().optional(),
  is_primary: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

type CustomerFormValues = z.infer<typeof customerSchema>;
type ContactFormValues = z.infer<typeof contactSchema>;

export default function CustomersPage() {
  usePageHeader("取引先管理", "清掃業務等を依頼する顧客・取引先の情報を管理します。");
  const { data: currentUser } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  
  // Dialog visibility states
  const [customerModal, setCustomerModal] = useState<{ open: boolean; customer?: Customer } | null>(null);
  const [contactModal, setContactModal] = useState<{ open: boolean; contact?: CustomerContact } | null>(null);
  const [deleteContactConfirm, setDeleteContactConfirm] = useState<CustomerContact | null>(null);

  // Queries & Mutations
  const { data: customerList, isLoading: isLoadingList } = useCustomers({ search: search || undefined, limit: 1000 });
  const { data: customerDetail, isLoading: isLoadingDetail } = useCustomerDetail(selectedCustomerId || "");

  const createCustomerMutation = useCreateCustomer();
  const updateCustomerMutation = useUpdateCustomer();
  const reorderCustomerMutation = useReorderCustomers();
  const createContactMutation = useCreateCustomerContact(selectedCustomerId || "");
  const updateContactMutation = useUpdateCustomerContact(selectedCustomerId || "");
  const deleteContactMutation = useDeleteCustomerContact(selectedCustomerId || "");

  // Form setups
  const customerForm = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
  });

  const contactForm = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
  });

  // Handle customer form submit
  const onCustomerSubmit = (values: CustomerFormValues) => {
    // Convert empty strings to undefined so backend Pydantic models validate properly
    const cleanValues = {
      ...values,
      branch_name: values.branch_name || undefined,
      phone: values.phone || undefined,
      fax: values.fax || undefined,
      email: values.email || undefined,
      address: values.address || undefined,
      notes: values.notes || undefined,
    };

    const isEdit = !!customerModal?.customer;
    const mutation = isEdit ? updateCustomerMutation : createCustomerMutation;
    const payload = isEdit 
      ? { id: customerModal!.customer!.id, data: cleanValues }
      : cleanValues;

    (mutation.mutate as any)(payload, {
      onSuccess: () => {
        setCustomerModal(null);
        customerForm.reset();
      }
    });
  };

  // Handle contact form submit
  const onContactSubmit = (values: ContactFormValues) => {
    if (!selectedCustomerId) return;

    // Convert empty strings to undefined
    const cleanValues = {
      ...values,
      position: values.position || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      notes: values.notes || undefined,
    };

    const isEdit = !!contactModal?.contact;
    const mutation = isEdit ? updateContactMutation : createContactMutation;
    const payload = isEdit
      ? { contactId: contactModal!.contact!.id, data: cleanValues }
      : cleanValues;

    (mutation.mutate as any)(payload, {
      onSuccess: () => {
        setContactModal(null);
        contactForm.reset();
      }
    });
  };

  const handleDeleteContact = () => {
    if (!deleteContactConfirm || !selectedCustomerId) return;
    deleteContactMutation.mutate(deleteContactConfirm.id, {
      onSuccess: () => {
        setDeleteContactConfirm(null);
      }
    });
  };

  const openCustomerModal = (customer?: Customer) => {
    if (customer) {
      customerForm.reset({
        full_name: customer.full_name,
        short_name: customer.short_name,
        branch_name: customer.branch_name || "",
        phone: customer.phone || "",
        fax: customer.fax || "",
        email: customer.email || "",
        address: customer.address || "",
        notes: customer.notes || "",
        is_active: customer.is_active,
      });
    } else {
      customerForm.reset({
        full_name: "",
        short_name: "",
        branch_name: "",
        phone: "",
        fax: "",
        email: "",
        address: "",
        notes: "",
        is_active: true,
      });
    }
    setCustomerModal({ open: true, customer });
  };

  const openContactModal = (contact?: CustomerContact) => {
    if (contact) {
      contactForm.reset({
        full_name: contact.full_name,
        position: contact.position || "",
        phone: contact.phone || "",
        email: contact.email || "",
        notes: contact.notes || "",
        is_primary: contact.is_primary,
        is_active: contact.is_active,
      });
    } else {
      contactForm.reset({
        full_name: "",
        position: "",
        phone: "",
        email: "",
        notes: "",
        is_primary: false,
        is_active: true,
      });
    }
    setContactModal({ open: true, contact });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            取引先管理
          </h1>
          <p className="text-sm text-slate-500">
            取引先の会社情報および担当者の連絡先情報を管理します。
          </p>
        </div>
        <div>
          <button
            onClick={() => openCustomerModal()}
            className="inline-flex items-center gap-2 h-10 rounded-lg bg-[#1E60F2] px-4 text-sm font-semibold text-white hover:bg-[#0F4FD0] transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>取引先登録</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left sidebar (list), Right pane (details) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Customers List */}
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
          <div className="w-full">
            <label className="block text-xs font-medium text-slate-600 mb-1">取引先名・検索</label>
            <div className="relative w-full">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="取引先名で検索..."
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
            ) : customerList?.items.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">
                取引先が見つかりません。
              </p>
            ) : (
              <SortableCustomerList
                items={customerList?.items || []}
                selectedId={selectedCustomerId}
                onSelect={setSelectedCustomerId}
                isDragEnabled={!search}
                onReorder={(newItems) => {
                  const itemsToUpdate = newItems.map((item, index) => ({
                    id: item.id,
                    display_order: index,
                  }));
                  reorderCustomerMutation.mutate(itemsToUpdate);
                }}
              />
            )}
          </div>
        </div>

        {/* Right Column: Customer & Contacts Detail Panel */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {isLoadingDetail ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse flex flex-col gap-4">
              <div className="h-6 w-1/3 bg-slate-200 rounded" />
              <div className="h-4 w-3/4 bg-slate-200 rounded" />
              <div className="h-32 w-full bg-slate-100 rounded" />
            </div>
          ) : !customerDetail ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm flex flex-col items-center justify-center h-[360px]">
              <Info className="h-12 w-12 text-slate-300 mb-3" />
              <p className="text-slate-500 font-semibold">取引先が選択されていません</p>
              <p className="text-xs text-slate-400 mt-1">左のリストから取引先を選択してください。</p>
            </div>
          ) : (
            <>
              {/* Client Info Panel */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                  <h2 className="text-base font-bold text-slate-900">取引先基本情報</h2>
                  <button
                    onClick={() => openCustomerModal(customerDetail)}
                    className="inline-flex items-center gap-1 h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>編集</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-sm">
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">正式名</span>
                    <span className="font-semibold text-slate-800">{customerDetail.full_name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">略称</span>
                    <span className="font-semibold text-slate-800">{customerDetail.short_name}</span>
                  </div>
                  {customerDetail.branch_name && (
                    <div>
                      <span className="text-xs text-slate-400 font-medium block">支店・営業所名</span>
                      <span className="font-semibold text-slate-800">{customerDetail.branch_name}</span>
                    </div>
                  )}
                  {customerDetail.phone && (
                    <div>
                      <span className="text-xs text-slate-400 font-medium block">電話番号</span>
                      <span className="font-semibold text-slate-800">{customerDetail.phone}</span>
                    </div>
                  )}
                  {customerDetail.fax && (
                    <div>
                      <span className="text-xs text-slate-400 font-medium block">FAX番号</span>
                      <span className="font-semibold text-slate-800">{customerDetail.fax}</span>
                    </div>
                  )}
                  {customerDetail.email && (
                    <div>
                      <span className="text-xs text-slate-400 font-medium block">メールアドレス</span>
                      <span className="font-semibold text-slate-800">{customerDetail.email}</span>
                    </div>
                  )}
                  {customerDetail.address && (
                    <div className="md:col-span-2">
                      <span className="text-xs text-slate-400 font-medium block">住所</span>
                      <span className="font-semibold text-slate-800">{customerDetail.address}</span>
                    </div>
                  )}
                  {customerDetail.notes && (
                    <div className="md:col-span-2">
                      <span className="text-xs text-slate-400 font-medium block">備考</span>
                      <p className="mt-1 text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap">
                        {customerDetail.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Contacts Panel */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                  <h2 className="text-base font-bold text-slate-900">担当者連絡先</h2>
                  <button
                    onClick={() => openContactModal()}
                    className="inline-flex items-center gap-1.5 h-9 rounded-lg bg-[#1E60F2] text-white px-3 text-xs font-semibold hover:bg-[#0F4FD0] transition-colors"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>担当者追加</span>
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {customerDetail.contacts.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                      担当者が登録されていません。
                    </p>
                  ) : (
                    customerDetail.contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                          contact.is_primary 
                            ? "border-blue-100 bg-blue-50/10"
                            : "border-slate-100 bg-slate-50/20"
                        }`}
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800 text-sm">
                              {contact.full_name}
                            </span>
                            {contact.position && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                                {contact.position}
                              </span>
                            )}
                            {contact.is_primary && (
                              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                                主担当者
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500 mt-1">
                            {contact.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {contact.phone}
                              </span>
                            )}
                            {contact.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {contact.email}
                              </span>
                            )}
                          </div>
                          {contact.notes && (
                            <p className="text-xs text-slate-400 mt-1 italic">
                              メモ: {contact.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
                          <button
                            onClick={() => openContactModal(contact)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                            aria-label="Edit contact"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          
                          {/* Only ADMIN role can delete contact on backend */}
                          {currentUser?.role === "ADMIN" && (
                            <button
                              onClick={() => setDeleteContactConfirm(contact)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-red-50 hover:text-red-600 text-slate-600 transition-colors"
                              aria-label="Delete contact"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Customer Create/Edit Dialog */}
      <Dialog.Root open={!!customerModal?.open} onOpenChange={(open) => { if(!open) setCustomerModal(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl focus:outline-none animate-in fade-in-50 zoom-in-95">
            <div className="flex items-start justify-between mb-4">
              <Dialog.Title className="text-lg font-bold text-slate-900">
                {customerModal?.customer ? "取引先情報の編集" : "取引先の新規登録"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            <form onSubmit={customerForm.handleSubmit(onCustomerSubmit)} className="flex flex-col gap-4 text-sm">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700">正式名 <span className="text-destructive">*</span></label>
                <input
                  type="text"
                  placeholder="例: 株式会社新世紀商事"
                  {...customerForm.register("full_name")}
                  className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                {customerForm.formState.errors.full_name && (
                  <p className="text-xs text-destructive">{customerForm.formState.errors.full_name.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700">略称 <span className="text-destructive">*</span></label>
                <input
                  type="text"
                  placeholder="例: 新世紀商事"
                  {...customerForm.register("short_name")}
                  className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                {customerForm.formState.errors.short_name && (
                  <p className="text-xs text-destructive">{customerForm.formState.errors.short_name.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700">支店・営業所名</label>
                <input
                  type="text"
                  placeholder="例: 大阪支店"
                  {...customerForm.register("branch_name")}
                  className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-700">電話番号</label>
                  <input
                    type="text"
                    placeholder="06-XXXX-XXXX"
                    {...customerForm.register("phone")}
                    className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-700">FAX番号</label>
                  <input
                    type="text"
                    placeholder="06-XXXX-XXXX"
                    {...customerForm.register("fax")}
                    className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700">メールアドレス</label>
                <input
                  type="text"
                  placeholder="contact@example.com"
                  {...customerForm.register("email")}
                  className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                {customerForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{customerForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700">住所</label>
                <input
                  type="text"
                  placeholder="大阪府大阪市..."
                  {...customerForm.register("address")}
                  className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700">備考</label>
                <textarea
                  rows={3}
                  {...customerForm.register("notes")}
                  className="rounded-lg border border-slate-200 p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setCustomerModal(null)}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={createCustomerMutation.isPending || updateCustomerMutation.isPending}
                  className="inline-flex items-center justify-center h-10 rounded-lg bg-[#1E60F2] text-white px-6 font-semibold hover:bg-[#0F4FD0] transition-colors disabled:opacity-50"
                >
                  {(createCustomerMutation.isPending || updateCustomerMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  保存
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Contact Create/Edit Dialog */}
      <Dialog.Root open={!!contactModal?.open} onOpenChange={(open) => { if(!open) setContactModal(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl focus:outline-none animate-in fade-in-50 zoom-in-95">
            <div className="flex items-start justify-between mb-4">
              <Dialog.Title className="text-lg font-bold text-slate-900">
                {contactModal?.contact ? "担当者連絡先の編集" : "担当者の追加"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            <form onSubmit={contactForm.handleSubmit(onContactSubmit)} className="flex flex-col gap-4 text-sm">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700">担当者名 <span className="text-destructive">*</span></label>
                <input
                  type="text"
                  placeholder="例: 山田 太郎"
                  {...contactForm.register("full_name")}
                  className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                {contactForm.formState.errors.full_name && (
                  <p className="text-xs text-destructive">{contactForm.formState.errors.full_name.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700">役職</label>
                <input
                  type="text"
                  placeholder="例: 総務部 課長"
                  {...contactForm.register("position")}
                  className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700">電話番号</label>
                <input
                  type="text"
                  placeholder="例: 090-XXXX-XXXX"
                  {...contactForm.register("phone")}
                  className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700">メールアドレス</label>
                <input
                  type="text"
                  placeholder="yamada@example.com"
                  {...contactForm.register("email")}
                  className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                {contactForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{contactForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_primary"
                  {...contactForm.register("is_primary")}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_primary" className="font-semibold text-slate-700">
                  この取引先の主担当者として設定する
                </label>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700">備考</label>
                <textarea
                  rows={2}
                  {...contactForm.register("notes")}
                  className="rounded-lg border border-slate-200 p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setContactModal(null)}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={createContactMutation.isPending || updateContactMutation.isPending}
                  className="inline-flex items-center justify-center h-10 rounded-lg bg-[#1E60F2] text-white px-6 font-semibold hover:bg-[#0F4FD0] transition-colors disabled:opacity-50"
                >
                  {(createContactMutation.isPending || updateContactMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  保存
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* 2-Way Contact Delete Confirmation Dialog */}
      <Dialog.Root open={!!deleteContactConfirm} onOpenChange={(open) => { if(!open) setDeleteContactConfirm(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl focus:outline-none animate-in fade-in-50 zoom-in-95">
            <div className="flex items-start justify-between mb-4">
              <Dialog.Title className="text-lg font-bold text-slate-900">
                担当者の削除確認
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            <div className="text-sm text-slate-600 mb-6 leading-relaxed">
              <p className="mb-2 font-semibold text-slate-800">
                担当者名: {deleteContactConfirm?.full_name}
              </p>
              <p>この担当者情報を削除しますか？この操作は取り消せません。</p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteContactConfirm(null)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDeleteContact}
                disabled={deleteContactMutation.isPending}
                className="inline-flex items-center justify-center h-10 rounded-lg bg-[#F83B3B] hover:bg-[#E51E1E] text-white px-5 font-semibold transition-colors disabled:opacity-50"
              >
                {deleteContactMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                削除する
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
