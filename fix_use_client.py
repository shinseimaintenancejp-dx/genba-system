import os

files = [
    'frontend/app/(dashboard)/invoices/page.tsx',
    'frontend/app/(dashboard)/quotations/page.tsx',
    'frontend/app/(dashboard)/approvals/page.tsx'
]

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    if "usePageHeader" in lines[0] and "'use client';" in lines[1]:
        # Swap
        lines[0], lines[1] = lines[1], lines[0]
        with open(file, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print(f"Fixed {file}")
