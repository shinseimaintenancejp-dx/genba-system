import re
import os

files_to_update = [
    ('frontend/app/(dashboard)/partners/page.tsx', 
     '協力会社管理', '清掃業務等を委託する協力会社（パートナー）の情報を管理します。', 
     r'<div[^>]*>\s*<h1 className="text-2xl font-bold tracking-tight text-slate-900">\s*協力会社管理\s*</h1>\s*<p className="text-sm text-slate-500">\s*清掃業務等を委託する協力会社（パートナー）の情報を管理します。\s*</p>\s*</div>'),
     
    ('frontend/app/(dashboard)/staff/page.tsx', 
     '社内担当者管理', '社内の管理スタッフ・責任者の連絡先を登録・編集します。', 
     r'<div[^>]*>\s*<h1 className="text-2xl font-bold tracking-tight text-slate-900">\s*社内担当者管理\s*</h1>\s*<p className="text-sm text-slate-500">\s*社内の管理スタッフ・責任者の連絡先を登録・編集します。\s*</p>\s*</div>'),
     
    ('frontend/app/(dashboard)/quotations/page.tsx', 
     '見積管理', '顧客向けの見積書を作成・管理します。', 
     r'<div[^>]*>\s*<h1 className="text-2xl font-bold tracking-tight">\s*見積管理\s*</h1>\s*<p className="text-sm text-muted-foreground">\s*顧客向けの見積書を作成・管理します。\s*</p>\s*</div>'),
     
    ('frontend/app/(dashboard)/genba/page.tsx', 
     '現場一覧表', '登録されている現場の一覧を表示・編集します。', 
     r'<div[^>]*>\s*<h1 className="text-2xl font-bold tracking-tight text-slate-900">\s*現場一覧表\s*</h1>\s*<p className="text-sm text-slate-500">\s*登録されている現場の一覧を表示・編集します。\s*</p>\s*</div>'),
     
    ('frontend/app/(dashboard)/genba/periodic/page.tsx', 
     '定期現場一覧表', '定期契約がある現場・作業の一覧を表示・管理します。', 
     r'<div[^>]*>\s*<h1 className="text-2xl font-bold tracking-tight text-slate-900">\s*定期現場一覧表\s*</h1>\s*<p className="text-sm text-slate-500">\s*定期契約がある現場・作業の一覧を表示・管理します。\s*</p>\s*</div>'),
     
    ('frontend/app/(dashboard)/genba/new/page.tsx', 
     '現場登録', '新規に管理する現場の情報を登録します。', 
     r'<div[^>]*>\s*<h1 className="text-2xl font-bold tracking-tight text-slate-900">\s*現場登録\s*</h1>\s*<p className="text-sm text-slate-500">\s*新規に管理する現場の情報を登録します。\s*</p>\s*</div>')
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
