import re
import os

files_to_update = [
    ('frontend/app/(dashboard)/approvals/page.tsx', 
     '承認待ち一覧', '担当者から申請された見積書・請求書の承認・却下を行います。', 
     r'<div[^>]*>\s*<h1 className="text-2xl font-bold tracking-tight">\s*承認待ち一覧\s*</h1>\s*<p className="text-sm text-muted-foreground">\s*担当者から申請された見積書・請求書の承認・却下を行います。\s*</p>\s*</div>'),
     
    ('frontend/app/(dashboard)/customers/page.tsx', 
     '取引先管理', '清掃業務等を依頼する顧客・取引先の情報を管理します。', 
     r'<div[^>]*>\s*<h1 className="text-2xl font-bold tracking-tight text-slate-900">\s*取引先管理\s*</h1>\s*<p className="text-sm text-slate-500">\s*清掃業務等を依頼する顧客・取引先の情報を管理します。\s*</p>\s*</div>'),
     
    ('frontend/app/(dashboard)/invoices/page.tsx', 
     '請求管理', '顧客への請求書発行および入金状況を管理します。', 
     r'<div[^>]*>\s*<h1 className="text-2xl font-bold tracking-tight">\s*請求管理\s*</h1>\s*<p className="text-sm text-muted-foreground">\s*顧客への請求書発行および入金状況を管理します。\s*</p>\s*</div>'),
     
    ('frontend/app/(dashboard)/contracts/page.tsx', 
     '契約管理', '取引先との元請契約や協力会社への下請契約を管理します。', 
     r'<div[^>]*>\s*<h1 className="text-2xl font-bold tracking-tight text-slate-900">\s*契約管理\s*</h1>\s*<p className="text-sm text-slate-500">\s*取引先との元請契約や協力会社への下請契約を管理します。\s*</p>\s*</div>'),
     
    ('frontend/app/partner/genba/page.tsx', 
     '担当現場一覧', '担当している現場の一覧を表示します。', 
     r'<div[^>]*>\s*<h1 className="text-2xl font-bold tracking-tight text-slate-900">\s*担当現場一覧\s*</h1>\s*<p className="text-sm text-slate-500">\s*担当している現場の一覧を表示します。\s*</p>\s*</div>')
]

for file, title, desc, pattern in files_to_update:
    if not os.path.exists(file):
        continue
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'usePageHeader' not in content:
        # Add import
        content = re.sub(r'(import .*?;?\n)(?!import)', r'\1import { usePageHeader } from "@/hooks/usePageHeader";\n', content, count=1)
        
        comp_pattern = r'(export default function [A-Za-z0-9_]+\([^)]*\) \{\n|const [A-Za-z0-9_]+ = \([^)]*\)(?:: React\.FC)? => \{\n)'
        desc_arg = f'"{desc}"' if not desc.startswith('`') else desc
        hook_call = f'  usePageHeader("{title}", {desc_arg});\n'
        content = re.sub(comp_pattern, r'\g<1>' + hook_call, content, count=1)
        
        # Remove the UI block
        content = re.sub(pattern, '', content, count=1)
        
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {file}")
