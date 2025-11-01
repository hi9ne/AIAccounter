import json
import re

def fix_json_paths(file_path):
    """Fix $json.body.* to $json.* in all SQL queries"""
    print(f'\n📝 Processing {file_path}...')
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Fix patterns:
    # 1. $json.body.field -> $json.field
    # 2. $json["body"]["field"] -> $json["field"]
    # 3. $json['body']['field'] -> $json['field']
    # 4. Remove leading = in '={{  -> '{{
    
    content = re.sub(r'\$json\.body\.', '$json.', content)
    content = re.sub(r'\$json\["body"\]\["', '$json["', content)
    content = re.sub(r"\$json\['body'\]\['", "$json['", content)
    content = re.sub(r"'=\{\{", "'{{", content)
    
    # Also fix user_id -> userId, workspace_id -> workspaceId (camelCase)
    content = re.sub(r'\$json\["user_id"\]', '$json["userId"]', content)
    content = re.sub(r'\$json\.user_id', '$json.userId', content)
    content = re.sub(r'\$json\["workspace_id"\]', '$json["workspaceId"]', content)
    content = re.sub(r'\$json\.workspace_id', '$json.workspaceId', content)
    
    changes = len([i for i in range(len(content)) if original[i:i+10] != content[i:i+10]]) // 10
    
    if content != original:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'  ✅ Fixed JSON paths in SQL queries')
        print(f'  📊 Approximate changes: ~{changes}')
    else:
        print('  ℹ️ No changes needed')
    
    return content != original

files = [
    'Workspace_API.json',
    'Analytics_API.json',
    'Reports_API.json'
]

print('🔧 Fixing JSON paths in SQL queries...')
print('='*60)

total = 0
for filename in files:
    if fix_json_paths(filename):
        total += 1

print('\n' + '='*60)
print(f'✅ Done! {total} workflow(s) updated')
print('\nFixed:')
print('  - $json.body.field → $json.field')
print('  - $json["body"]["field"] → $json["field"]')
print('  - user_id → userId')
print('  - workspace_id → workspaceId')
print('  - Removed extra = in ={{')
print('\n📥 Re-import workflows into n8n!')
