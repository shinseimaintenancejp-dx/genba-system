import os
import re

directories = ['frontend/app/(dashboard)', 'frontend/app/partner']
h1_pattern = re.compile(r'<h1[^>]*>(.*?)</h1>', re.DOTALL)
p_pattern = re.compile(r'<p[^>]*text-slate-500[^>]*>(.*?)</p>', re.DOTALL)

for d in directories:
    for root, _, files in os.walk(d):
        for file in files:
            if file.endswith('.tsx'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                if '<h1' in content:
                    print(f"File: {path}")
                    # Extract roughly the title block
                    # find the line with <h1
                    lines = content.split('\n')
                    for i, line in enumerate(lines):
                        if '<h1' in line:
                            start = max(0, i-2)
                            end = min(len(lines), i+8)
                            print('\n'.join(lines[start:end]))
                            print('-'*40)
                            break
