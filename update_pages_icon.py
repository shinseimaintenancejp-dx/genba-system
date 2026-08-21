import re
import os

pages = {
    'frontend/app/(dashboard)/genba/page.tsx': 'Building2',
    'frontend/app/(dashboard)/genba/new/page.tsx': 'Building2',
    'frontend/app/(dashboard)/genba/[id]/layout.tsx': 'Building2',
    'frontend/app/(dashboard)/genba/periodic/page.tsx': 'Building2',
    'frontend/app/partner/genba/page.tsx': 'Building2',
    'frontend/app/partner/genba/[id]/page.tsx': 'Building2',
    'frontend/app/(dashboard)/contracts/page.tsx': 'FileText',
    'frontend/app/(dashboard)/contracts/ordering/page.tsx': 'FileText',
    'frontend/app/(dashboard)/contracts/receiving/page.tsx': 'FileText',
    'frontend/app/(dashboard)/quotations/page.tsx': 'FileText',
    'frontend/app/(dashboard)/invoices/page.tsx': 'Receipt',
    'frontend/app/(dashboard)/invoices/[id]/page.tsx': 'Receipt',
    'frontend/app/(dashboard)/customers/page.tsx': 'Users',
    'frontend/app/(dashboard)/approvals/page.tsx': 'CheckSquare',
    'frontend/app/(dashboard)/partners/page.tsx': 'Briefcase',
    'frontend/app/(dashboard)/reports/profit/page.tsx': 'TrendingUp',
    'frontend/app/(dashboard)/admin/users/page.tsx': 'Users',
    'frontend/app/(dashboard)/admin/positions/page.tsx': 'ShieldCheck',
    'frontend/app/(dashboard)/admin/staff/page.tsx': 'ShieldCheck',
    'frontend/app/(dashboard)/staff/page.tsx': 'Users'
}

for file_path, icon in pages.items():
    if not os.path.exists(file_path):
        continue
        
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Add lucide import
    lucide_import_match = re.search(r'import\s+\{[^}]*\}\s+from\s+["\']lucide-react["\'];?', content)
    if lucide_import_match:
        if icon not in lucide_import_match.group(0):
            new_import = lucide_import_match.group(0).replace('}', f', {icon} }}')
            content = content.replace(lucide_import_match.group(0), new_import)
    else:
        content = content.replace('import { usePageHeader } from "@/hooks/usePageHeader";',
                                  f'import {{ usePageHeader }} from "@/hooks/usePageHeader";\nimport {{ {icon} }} from "lucide-react";')
                                  
    # Add icon parameter
    # For single line usePageHeader
    content = re.sub(r'(usePageHeader\([^,]+?,\s*[^,]+?)\);', rf'\1, {icon});', content)
    
    # For invoices/[id] it is usePageHeader(`...`);
    content = re.sub(r'(usePageHeader\(`[^`]+?`)\);', rf'\1, null, {icon});', content)

    # For partner/genba/[id] it is usePageHeader(genba?.property_name ?? null, genba?.address ?? null);
    content = re.sub(r'(usePageHeader\(genba\?.+?,\s*genba\?.+?)\);', rf'\1, {icon});', content)
    
    # For genba/[id]/layout.tsx it spans multiple lines
    if file_path == 'frontend/app/(dashboard)/genba/[id]/layout.tsx':
        content = content.replace('    ) : null\n  );', f'    ) : null,\n    {icon}\n  );')
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Updated pages")
