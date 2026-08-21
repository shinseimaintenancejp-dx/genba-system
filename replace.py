import os
import re

files_to_update = [
    'frontend/app/(dashboard)/contracts/ordering/page.tsx',
    'frontend/app/(dashboard)/contracts/receiving/page.tsx',
    'frontend/app/(dashboard)/admin/users/page.tsx',
    'frontend/app/(dashboard)/admin/positions/page.tsx',
    'frontend/app/(dashboard)/admin/staff/page.tsx',
    'frontend/app/(dashboard)/partners/page.tsx',
    'frontend/app/(dashboard)/staff/page.tsx',
    'frontend/app/(dashboard)/quotations/page.tsx',
    'frontend/app/(dashboard)/genba/page.tsx',
    'frontend/app/(dashboard)/genba/periodic/page.tsx',
    'frontend/app/(dashboard)/genba/new/page.tsx',
    'frontend/app/(dashboard)/genba/[id]/layout.tsx',
    'frontend/app/(dashboard)/approvals/page.tsx',
    'frontend/app/partner/genba/page.tsx',
    'frontend/app/partner/genba/[id]/page.tsx'
]

# We will just write a script to insert `import { usePageHeader } from "@/hooks/usePageHeader";` at the top 
# (after other imports) and insert `usePageHeader("...", "...");` inside the main component.
# Because regex replacement on JSX is error-prone, I will do it via sed or just write a smarter python script.

def update_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'usePageHeader' in content:
        return
        
    # Find title and desc
    h1_match = re.search(r'<h1[^>]*>\s*([^<]+?)\s*</h1>', content)
    if not h1_match:
        return
        
    title = h1_match.group(1).strip()
    # Try to find p after h1
    p_match = re.search(r'<h1[^>]*>.*?</h1>\s*<p[^>]*text-[a-z0-9\-]+[^>]*>\s*(.*?)\s*</p>', content, re.DOTALL)
    if p_match:
        desc = p_match.group(1).strip()
        # Clean up desc if it has {data?.total ?? 0}
        desc = desc.replace('\n', ' ').replace('  ', ' ')
    else:
        desc = ""
        
    print(f"{path}: '{title}' / '{desc}'")

for f in files_to_update:
    if os.path.exists(f):
        update_file(f)

