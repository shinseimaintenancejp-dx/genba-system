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
import { Building, GripVertical } from "lucide-react";
import type { Customer } from "@/types/customer";

interface SortableCustomerItemProps {
  customer: Customer;
  isSelected: boolean;
  onSelect: (id: string) => void;
  isDragEnabled: boolean;
}

function SortableCustomerItem({ customer, isSelected, onSelect, isDragEnabled }: SortableCustomerItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: customer.id,
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
        onClick={() => onSelect(customer.id)}
        className={`flex flex-col text-left p-3.5 w-full ${isDragEnabled ? "pl-8" : ""}`}
      >
        <span className="font-semibold text-slate-800 line-clamp-1">
          {customer.full_name}
        </span>
        {customer.branch_name && (
          <span className="text-xs text-slate-500 mt-1 line-clamp-1">
            {customer.branch_name}
          </span>
        )}
        <span className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
          <Building className="h-3 w-3 shrink-0" />
          {customer.short_name}
        </span>
      </button>
    </div>
  );
}

interface SortableCustomerListProps {
  items: Customer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (newItems: Customer[]) => void;
  isDragEnabled?: boolean;
}

export function SortableCustomerList({
  items,
  selectedId,
  onSelect,
  onReorder,
  isDragEnabled = true,
}: SortableCustomerListProps) {
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
            <SortableCustomerItem
              key={cust.id}
              customer={cust}
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
