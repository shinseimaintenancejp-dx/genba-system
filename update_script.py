import re
import os

files_to_update = [
    ('frontend/app/(dashboard)/contracts/ordering/page.tsx', 
     '協力会社契約', '協力会社（パートナー）への下請契約を管理します。', 
     r'<div[^>]*>\s*<h1 className="text-2xl font-bold tracking-tight text-slate-900">協力会社契約</h1>\s*<p className="text-sm text-slate-500">協力会社（パートナー）への下請契約を管理します。</p>\s*</div>'),
     
    ('frontend/app/(dashboard)/contracts/receiving/page.tsx', 
     '取引先契約', '取引先（顧客）との元請契約を管理します。', 
     r'<div[^>]*>\s*<h1 className="text-2xl font-bold tracking-tight text-slate-900">取引先契約</h1>\s*<p className="text-sm text-slate-500">取引先（顧客）との元請契約を管理します。</p>\s*</div>'),
     
    ('frontend/app/(dashboard)/admin/users/page.tsx', 
     'ユーザー管理', '`${data?.total ?? 0}名のユーザー`', 
     r'<div[^>]*>\s*<h1 className="text-2xl font-bold text-slate-900">ユーザー管理</h1>\s*<p className="text-sm text-slate-500 mt-1">\s*\{data\?\.total \?\? 0\}名のユーザー\s*</p>\s*</div>'),
     
    ('frontend/app/(dashboard)/admin/positions/page.tsx', 
     '役職管理', 'システムで使用する役職（マスターデータ）の登録・編集を行います。', 
     r'<div[^>]*>\s*<h1 className="text-2xl font-bold text-slate-900 tracking-tight">役職管理</h1>\s*<p className="text-sm text-slate-500 mt-1">\s*システムで使用する役職（マスターデータ）の登録・編集を行います。\s*</p>\s*</div>'),
     
    ('frontend/app/(dashboard)/admin/staff/page.tsx', 
     '従業員管理', '自社スタッフ（担当者）の登録・編集を行います。', 
     r'<div[^>]*>\s*<h1 className="text-2xl font-bold text-slate-900 tracking-tight">従業員管理</h1>\s*<p className="text-sm text-slate-500 mt-1">\s*自社スタッフ（担当者）の登録・編集を行います。\s*</p>\s*</div>')
]

for file, title, desc, pattern in files_to_update:
    if not os.path.exists(file):
        continue
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'usePageHeader' not in content:
        # Add import
        content = re.sub(r'(import .*?;?\n)(?!import)', r'\1import { usePageHeader } from "@/hooks/usePageHeader";\n', content, count=1)
        
        # Add hook usage inside component
        # Find the main component signature
        comp_pattern = r'(export default function [A-Za-z0-9_]+\([^)]*\) \{\n|const [A-Za-z0-9_]+ = \([^)]*\)(?:: React\.FC)? => \{\n)'
        desc_arg = f'"{desc}"' if not desc.startswith('`') else desc
        hook_call = f'  usePageHeader("{title}", {desc_arg});\n'
        content = re.sub(comp_pattern, r'\g<1>' + hook_call, content, count=1)
        
        # Remove the UI block
        content = re.sub(pattern, '', content, count=1)
        
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {file}")
