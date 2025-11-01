import json
import re

# Your PostgreSQL credential ID
credential_id = "3CGZzcUsaAWp8nrl"

files = ['Workspace_API.json', 'Analytics_API.json', 'Reports_API.json']

for filename in files:
    print(f'\n📝 Processing {filename}...')
    
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Count before
    before = content.count('"id": "1"')
    
    # Replace postgres credentials
    # Pattern: "postgres": { "id": "anything", "name": "anything" }
    content = re.sub(
        r'"postgres"\s*:\s*\{\s*"id"\s*:\s*"[^"]*"\s*,\s*"name"\s*:\s*"[^"]*"\s*\}',
        f'"postgres": {{"id": "{credential_id}", "name": "Postgres account"}}',
        content
    )
    
    # Count after
    after = content.count(f'"id": "{credential_id}"')
    
    if after > 0:
        print(f'   ✅ Заменено {after} credential ID на {credential_id}')
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
    else:
        print(f'   ⚠️ Credentials не найдены')

print(f'\n✅ Готово! Все PostgreSQL nodes теперь используют credential: {credential_id}')
