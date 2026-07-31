"use client";

import React, { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Building2, GripVertical } from "lucide-react";
import type { PartnerCompany } from "@/types/partner";

interface SortablePartnerItemProps {
  partner: PartnerCompany;
  isSelected: boolean;
  onSelect: (id: string) => void;
  isDragEnabled: boolean;
}

function SortablePartnerItem({ partner, isSelected, onSelect, isDragEnabled }: SortablePartnerItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: partner.id,
    disabled: !isDragEnabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative flex items-center group rounded-lg border text-sm transition-all mb-1 ${
        isSelected
          ? "border-blue-200 bg-blue-50/50 hover:bg-blue-50"
          : "border-slate-100 bg-white hover:bg-slate-50"
      }`}
    >
      {isDragEnabled && (
        <div
          {...attributes}
          {...listeners}
          className="absolute left-1 top-1/2 -translate-y-1/2 p-1.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      <button
        onClick={() => onSelect(partner.id)}
        className={`flex flex-col text-left p-3.5 w-full ${isDragEnabled ? "pl-8" : ""}`}
      >
        <span className="font-semibold text-slate-800 line-clamp-1">
          {partner.short_name || partner.company_name}
        </span>
        {partner.contact_person && (
          <span className="text-xs text-slate-500 mt-1 line-clamp-1">
            担当: {partner.contact_person}
          </span>
        )}
      </button>
    </div>
  );
}

interface SortablePartnerListProps {
  items: PartnerCompany[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (newItems: PartnerCompany[]) => void;
  isDragEnabled?: boolean;
}

export function SortablePartnerList({
  items,
  selectedId,
  onSelect,
  onReorder,
  isDragEnabled = true,
}: SortablePartnerListProps) {
  const [internalItems, setInternalItems] = useState(items);

  // Sync with prop when items change (e.g. after save/refresh)
  useEffect(() => {
    setInternalItems(items);
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setInternalItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        onReorder(newItems);
        return newItems;
      });
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={internalItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col">
          {internalItems.map((cust) => (
            <SortablePartnerItem
              key={cust.id}
              partner={cust}
              isSelected={selectedId === cust.id}
              onSelect={onSelect}
              isDragEnabled={isDragEnabled}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
