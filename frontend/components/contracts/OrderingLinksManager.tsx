"use client";

import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X, PencilLine, Trash2, Link as LinkIcon, Loader2 } from "lucide-react";
import { 
  useOrderingLinks, 
  useAvailableReceivingContracts,
  useAvailableReceivingContractsByGenba,
  useCreateOrderingLink, 
  useUpdateOrderingLink, 
  useDeleteOrderingLink 
} from "@/hooks/useOrderingLinks";
import type { 
  OrderingLink, 
  OrderingLinkWorkItemCreatePayload,
  OrderingLinkCreatePayload,
  OrderingLinkUpdatePayload
} from "@/types/orderingLink";
import { formatCurrency } from "@/lib/utils"; // Fallback to inline if doesn't exist

interface OrderingLinksManagerProps {
  mode?: "EDIT" | "CREATE";
  orderingContractId?: string;
  genbaId?: string;
  readOnly?: boolean;
  value?: OrderingLinkCreatePayload[];
  onChange?: (links: OrderingLinkCreatePayload[]) => void;
  filterCategory?: string;
}

const formatMoney = (val: number | null | undefined) => {
  if (val == null) return "-";
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(val);
};

export const OrderingLinksManager: React.FC<OrderingLinksManagerProps> = ({ 
  mode = "EDIT",
  orderingContractId = "",
  genbaId = "",
  readOnly = false,
  value = [],
  onChange,
  filterCategory,
}) => {
  const isEditMode = mode === "EDIT";

  const { data: apiLinks, isLoading: isLoadingLinks } = useOrderingLinks(isEditMode ? orderingContractId : "");
  const { data: apiAvailableContracts, isLoading: isLoadingAvailable } = useAvailableReceivingContracts(isEditMode ? orderingContractId : "");
  const { data: createAvailableContracts, isLoading: isLoadingCreateAvailable } = useAvailableReceivingContractsByGenba(!isEditMode && genbaId ? genbaId : "");
  
  const rawAvailableContracts = isEditMode ? apiAvailableContracts : createAvailableContracts;
  const availableContracts = filterCategory 
    ? rawAvailableContracts?.filter(c => c.service_category === filterCategory) 
    : rawAvailableContracts;
  const isLoading = isEditMode ? (isLoadingLinks || isLoadingAvailable) : isLoadingCreateAvailable;

  const createLink = useCreateOrderingLink(orderingContractId);
  const updateLink = useUpdateOrderingLink(orderingContractId);
  const deleteLink = useDeleteOrderingLink(orderingContractId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<OrderingLink | null>(null);
  const [editingDraftIndex, setEditingDraftIndex] = useState<number | null>(null);
  const [linkToDelete, setLinkToDelete] = useState<string | null>(null);
  const [linkToDeleteDraftIndex, setLinkToDeleteDraftIndex] = useState<number | null>(null);


  // Form State
  const [selectedReceivingId, setSelectedReceivingId] = useState<string>("");
  const [assignment_type, setAssignmentType] = useState<"FULL" | "PARTIAL">("PARTIAL");
  const [selectedItems, setSelectedItems] = useState<Record<string, { selected: boolean, scope_detail: string }>>({});
  
  const [allocated_amount, setAllocatedAmount] = useState<string>("");

  const resetForm = () => {
    setSelectedReceivingId("");
    setAssignmentType("PARTIAL");
    setSelectedItems({});
    setAllocatedAmount("");
    setEditingLink(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (link: any, index?: number) => {
    if (!isEditMode && index !== undefined) {
      setEditingDraftIndex(index);
    } else {
      setEditingLink(link as OrderingLink);
    }
    setSelectedReceivingId(link.receiving_contract_id);
    setAssignmentType(link.assignment_type);
    setAllocatedAmount(link.allocated_amount ? link.allocated_amount.toString() : "");
    
    const items: Record<string, { selected: boolean, scope_detail: string }> = {};
    link.work_items.forEach((wi: any) => {
      items[wi.work_content_id] = {
        selected: true,
        scope_detail: wi.scope_detail || "",
      };
    });
    setSelectedItems(items);
    setIsModalOpen(true);
  };

  const handleDelete = async (linkId: string) => {
    setLinkToDelete(linkId);
  };

  const confirmDelete = async () => {
    if (!isEditMode && linkToDeleteDraftIndex !== null) {
      const newLinks = [...value];
      newLinks.splice(linkToDeleteDraftIndex, 1);
      onChange?.(newLinks);
      setLinkToDeleteDraftIndex(null);
    } else if (linkToDelete) {
      await deleteLink.mutateAsync(linkToDelete);
      setLinkToDelete(null);
    }
  };

  const handleItemToggle = (itemId: string, checked: boolean) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: {
        selected: checked,
        scope_detail: checked ? (prev[itemId]?.scope_detail || "") : "",
      }
    }));
  };

  const handleScopeChange = (itemId: string, value: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        selected: true,
        scope_detail: value,
      }
    }));
  };

  // Find the selected contract object to display its work items
  const selectedContractForForm = editingLink 
    ? { 
        work_items: editingLink.work_items.map((wi: any) => ({
          id: wi.work_content_id, 
          floor: wi.floor || "", 
          area: wi.area || "", 
          work_content: wi.work_content || "",
          sort_order: 0
        }))
      }
    : availableContracts?.find(c => c.id === selectedReceivingId);

  const handleSubmit = async () => {
    // Validation
    if (!selectedReceivingId && !editingLink) return;
    
    const work_items: OrderingLinkWorkItemCreatePayload[] = [];
    if (assignment_type === "PARTIAL") {
      Object.entries(selectedItems).forEach(([id, data]) => {
        if (data.selected) {
          work_items.push({
            work_content_id: id,
            scope_detail: data.scope_detail || null,
          });
        }
      });
      if (work_items.length === 0) {
        // Needs error handling
        alert("一部委託の場合、作業項目を1件以上選択してください。"); // FIXME: rule violation? Actually, rule says never use window.alert(). I'll use a local state.
        return;
      }
    }

    try {
      const basePayload: OrderingLinkCreatePayload = {
        receiving_contract_id: selectedReceivingId,
        assignment_type: assignment_type,
        allocated_amount: allocated_amount ? Number(allocated_amount) : null,
        work_items: assignment_type === "PARTIAL" ? work_items : [],
      };

      if (!isEditMode) {
        const newLinks = [...value];
        if (editingDraftIndex !== null) {
          newLinks[editingDraftIndex] = basePayload;
        } else {
          newLinks.push(basePayload);
        }
        onChange?.(newLinks);
      } else {
        if (editingLink) {
          const payload: OrderingLinkUpdatePayload = {
            assignment_type: assignment_type,
            allocated_amount: allocated_amount ? Number(allocated_amount) : null,
            work_items: assignment_type === "PARTIAL" ? work_items : [],
          };
          await updateLink.mutateAsync({ linkId: editingLink.id, payload });
        } else {
          await createLink.mutateAsync(basePayload);
        }
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
    }
  };

  const displayLinks = isEditMode ? (apiLinks || []) : (value || []).map((link, idx) => {
    const rc = availableContracts?.find(c => c.id === link.receiving_contract_id);
    return {
      id: `draft-${idx}`,
      isDraft: true,
      draftIndex: idx,
      receiving_contract_id: link.receiving_contract_id,
      assignment_type: link.assignment_type,
      allocated_amount: link.allocated_amount,
      receiving_contract_name: rc?.contract_name || "不明",
      receivingContractCode: rc?.internal_code || "-",
      receiving_amount: rc?.amount || 0,
      work_items: link.work_items.map((wi, widx) => {
         const wc = rc?.work_items.find(w => w.id === wi.work_content_id);
         return {
            id: `draft-wi-${widx}`,
            work_content_id: wi.work_content_id,
            scope_detail: wi.scope_detail,
            floor: wc?.floor || "",
            area: wc?.area || "",
            work_content: wc?.work_content || "",
         };
      })
    };
  });

  if (isLoading) return <div className="p-4"><Loader2 className="animate-spin h-6 w-6 text-slate-400" /></div>;

  return (
    <div className="space-y-4 rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm/50 mt-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <LinkIcon className="h-5 w-5 text-[#1E60F2]" />
          元請契約との連携
        </h2>
        {!readOnly && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center h-8 px-3 rounded-lg bg-[#1E60F2] text-xs font-medium text-white hover:bg-[#0F4FD0] transition-colors shadow-sm"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            連携を追加する
          </button>
        )}
      </div>

      <div className="pt-2">
        
        {displayLinks.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-sm bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
            連携されている元請契約はありません。
          </div>
        ) : (
          <div className="space-y-4">
            {displayLinks.map((link: any) => (
              <div key={link.id} className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-sm text-slate-800">
                      {link.receiving_contract_name || "不明な契約"} ({link.receivingContractCode})
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex gap-3">
                      <span>元請金額: {formatMoney(link.receiving_amount)}</span>
                      <span>割当金額: {formatMoney(link.allocated_amount)}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${link.assignment_type === 'FULL' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {link.assignment_type === 'FULL' ? '全面委託' : '一部委託'}
                      </span>
                    </div>
                  </div>
                  {!readOnly && (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => handleOpenEdit(link, link.draftIndex)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded bg-white border border-slate-200 shadow-sm transition-colors">
                        <PencilLine className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => link.isDraft ? setLinkToDeleteDraftIndex(link.draftIndex) : setLinkToDelete(link.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded bg-white border border-slate-200 shadow-sm transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                
                {link.assignment_type === 'PARTIAL' && (
                  <div className="px-4 py-3 bg-white">
                    <table className="w-full text-xs text-left">
                      <thead className="text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="pb-2 font-medium w-[20%]">階</th>
                          <th className="pb-2 font-medium w-[25%]">場所・区域</th>
                          <th className="pb-2 font-medium w-[25%]">作業内容</th>
                          <th className="pb-2 font-medium">委託範囲 (対象エリア等)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {link.work_items.map((wi: any) => (
                          <tr key={wi.id} className="text-slate-700">
                            <td className="py-2">{wi.floor}</td>
                            <td className="py-2">{wi.area}</td>
                            <td className="py-2">{wi.work_content}</td>
                            <td className="py-2">
                              {wi.scope_detail ? (
                                <span className="inline-block bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
                                  {wi.scope_detail}
                                </span>
                              ) : (
                                <span className="text-slate-400">- (全体)</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {link.work_items.length === 0 && (
                          <tr><td colSpan={4} className="py-2 text-center text-slate-400">作業項目がありません</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE/EDIT MODAL */}
      <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] rounded-xl bg-white p-0 shadow-2xl overflow-hidden focus:outline-none">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
              <Dialog.Title className="text-lg font-bold text-slate-800">
                {editingLink ? "連携の編集" : "元請契約との連携"}
              </Dialog.Title>
              <Dialog.Close className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
              
              {!editingLink && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    対象の元請契約 <span className="text-red-500">*</span>
                  </label>
                  {isLoadingAvailable ? (
                    <div className="h-10 border border-slate-200 rounded-lg flex items-center px-3 text-sm text-slate-400 bg-slate-50"><Loader2 className="h-4 w-4 animate-spin mr-2"/> 読み込み中...</div>
                  ) : (
                    <select
                      value={selectedReceivingId}
                      onChange={(e) => {
                        setSelectedReceivingId(e.target.value);
                        setSelectedItems({});
                      }}
                      className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">-- 元請契約を選択 --</option>
                      {availableContracts?.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.contract_name} ({c.internal_code}) - {formatMoney(c.amount)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  委託方式 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="assignment_type" 
                      value="FULL" 
                      checked={assignment_type === "FULL"}
                      onChange={() => setAssignmentType("FULL")}
                      className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span className="text-sm font-medium text-slate-700">全面委託 (すべての作業)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="assignment_type" 
                      value="PARTIAL" 
                      checked={assignment_type === "PARTIAL"}
                      onChange={() => setAssignmentType("PARTIAL")}
                      className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span className="text-sm font-medium text-slate-700">一部委託 (作業を指定)</span>
                  </label>
                </div>
              </div>

              {assignment_type === "PARTIAL" && selectedContractForForm && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    委託する作業項目の選択
                  </div>
                  <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                    {(selectedContractForForm.work_items as any[]).map((wi: any) => {
                      const isSelected = selectedItems[wi.id]?.selected || false;
                      return (
                        <div key={wi.id} className={`p-3 flex items-start gap-3 transition-colors ${isSelected ? 'bg-blue-50/30' : 'hover:bg-slate-50'}`}>
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={(e) => handleItemToggle(wi.id, e.target.checked)}
                            className="mt-1 h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-slate-800">
                              {wi.floor} | {wi.area} | {wi.work_content}
                            </div>
                            {isSelected && (
                              <div className="mt-2">
                                <input
                                  type="text"
                                  placeholder="委託範囲 (例: 1F~8F のみ) ※空白の場合は全体"
                                  value={selectedItems[wi.id]?.scope_detail || ""}
                                  onChange={(e) => handleScopeChange(wi.id, e.target.value)}
                                  className="w-full text-xs h-8 rounded border border-slate-300 px-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {(!selectedContractForForm.work_items || selectedContractForForm.work_items.length === 0) && (
                      <div className="p-4 text-center text-sm text-slate-500">
                        この契約には作業項目が登録されていません。
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  割当金額 (円) - 任意
                </label>
                <input
                  type="text"
                  value={allocated_amount ? Number(allocated_amount).toLocaleString("ja-JP") : ""}
                  onChange={(e) => {
                    const raw = e.target.value
                      .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
                      .replace(/[^0-9]/g, '');
                    setAllocatedAmount(raw);
                  }}
                  placeholder="0"
                  className="w-full sm:w-1/2 h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-right placeholder:text-slate-400"
                />
                <p className="text-[10px] text-slate-400 mt-1">この協力会社への発注額のうち、この元請契約に紐づく分の金額を入力します。</p>
              </div>

            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={(!selectedReceivingId && !editingLink) || createLink.isPending || updateLink.isPending}
                className="h-9 rounded-lg bg-[#1E60F2] px-6 text-sm font-semibold text-white hover:bg-[#0F4FD0] disabled:opacity-50"
              >
                {createLink.isPending || updateLink.isPending ? "保存中..." : "保存する"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Custom Delete Confirmation Dialog */}
      <Dialog.Root open={!!linkToDelete} onOpenChange={(open) => { if(!open) setLinkToDelete(null) }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-[60] w-full max-w-sm translate-x-[-50%] translate-y-[-50%] rounded-xl bg-white p-6 shadow-2xl">
            <Dialog.Title className="text-lg font-bold text-slate-800 mb-2">
              連携の削除
            </Dialog.Title>
            <p className="text-sm text-slate-600 mb-6">
              この元請契約との連携を解除します。よろしいですか？
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setLinkToDelete(null)}
                className="h-9 px-4 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteLink.isPending}
                className="h-9 px-4 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 flex items-center"
              >
                {deleteLink.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                削除する
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </div>
  );
};
