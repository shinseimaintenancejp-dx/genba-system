import os
import re

directories = ['frontend/app/(dashboard)', 'frontend/app/partner']
hook_import = 'import { usePageHeader } from "@/hooks/usePageHeader";\n'

for d in directories:
    for root, _, files in os.walk(d):
        for file in files:
            if file.endswith('.tsx'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                if hook_import in content:
                    # Remove it from everywhere
                    content = content.replace(hook_import, '')
                    
                    # Insert it after the first import or "use client"
                    if '"use client";' in content:
                        content = content.replace('"use client";\n', '"use client";\n' + hook_import, 1)
                    else:
                        content = hook_import + content
                        
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f"Fixed {path}")
