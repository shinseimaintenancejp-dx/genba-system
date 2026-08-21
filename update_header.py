import re

def update_header(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract useHeaderStore call and add icon if missing
    content = re.sub(r'const \{ title, description \} = useHeaderStore\(\);',
                     r'const { title, description, icon: Icon } = useHeaderStore();', content)
                     
    # Update UI to wrap title and description with icon div
    # Match the whole flex column div and its contents
    pattern = r'<div className="flex flex-col justify-center">\s*\{title && <h1 className="text-xl font-bold text-slate-900 leading-tight">\{title\}</h1>\}\s*\{description && <div className="text-sm text-slate-500 mt-1">\{description\}</div>\}\s*</div>'
    
    replacement = """<div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="flex flex-col justify-center">
          {title && <h1 className="text-xl font-bold text-slate-900 leading-tight">{title}</h1>}
          {description && <div className="text-sm text-slate-500 mt-1">{description}</div>}
        </div>
      </div>"""
      
    content = re.sub(pattern, replacement, content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

update_header('frontend/components/layout/Header.tsx')
update_header('frontend/app/partner/layout.tsx')

print("Updated Headers")
