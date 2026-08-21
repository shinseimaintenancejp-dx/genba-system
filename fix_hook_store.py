import re

# Fix usePageHeader.ts
hook_path = 'frontend/hooks/usePageHeader.ts'
with open(hook_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'export function usePageHeader(title: string | null, description?: string | React.ReactNode | null) {',
    'export function usePageHeader(title: string | null, description?: string | React.ReactNode | null, icon?: React.ElementType | null) {'
)

with open(hook_path, 'w', encoding='utf-8') as f:
    f.write(content)

# Fix useHeaderStore.ts
store_path = 'frontend/store/useHeaderStore.ts'
with open(store_path, 'r', encoding='utf-8') as f:
    content = f.read()
    
# Make sure setHeader accepts 3 args
content = re.sub(r'setHeader:\s*\(title:\s*string\s*\|\s*null,\s*description\?:\s*React\.ReactNode\s*\|\s*null\)\s*=>\s*void;',
                 r'setHeader: (title: string | null, description?: React.ReactNode | null, icon?: React.ElementType | null) => void;',
                 content)

with open(store_path, 'w', encoding='utf-8') as f:
    f.write(content)
