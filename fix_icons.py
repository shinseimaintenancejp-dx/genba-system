import os
import re

directories = ['frontend/app/(dashboard)']

for root, _, files in os.walk(directories[0]):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Fix ,, ShieldCheck
            content = re.sub(r',\s*,\s*([A-Za-z0-9_]+)\s*\}', r',\n  \1\n}', content)
            
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)

print("Fixed syntax errors")
