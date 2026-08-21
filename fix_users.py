import re

path = 'frontend/app/(dashboard)/admin/users/page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('  usePageHeader("ユーザー管理", `${data?.total ?? 0}名のユーザー`);\n  const { data, isLoading, error } = useUsers();',
                          '  const { data, isLoading, error } = useUsers();\n  usePageHeader("ユーザー管理", `${data?.total ?? 0}名のユーザー`);')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
