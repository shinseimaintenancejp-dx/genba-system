import os
import re

# 1. Update useHeaderStore.ts
store_path = 'frontend/store/useHeaderStore.ts'
with open(store_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'title: string | null;',
    'title: string | null;\n  icon: React.ElementType | null;'
).replace(
    'description: React.ReactNode | null) => set({ title, description }),',
    'description: React.ReactNode | null, icon: React.ElementType | null = null) => set({ title, description, icon }),'
).replace(
    'title: null,\n  description: null,',
    'title: null,\n  description: null,\n  icon: null,'
)
with open(store_path, 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Update usePageHeader.ts
hook_path = 'frontend/hooks/usePageHeader.ts'
with open(hook_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'export function usePageHeader(title: string | null, description: React.ReactNode | null = null) {',
    'export function usePageHeader(title: string | null, description: React.ReactNode | null = null, icon: React.ElementType | null = null) {'
).replace(
    'setHeader(title, description);',
    'setHeader(title, description, icon);'
).replace(
    'setHeader(null, null);',
    'setHeader(null, null, null);'
).replace(
    '[title, description, setHeader]',
    '[title, description, icon, setHeader]'
)
with open(hook_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated store and hook")
