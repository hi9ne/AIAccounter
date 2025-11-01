import json
import os

def update_if_nodes(file_path):
    """Update IF nodes to typeVersion 2"""
    print(f'\n📝 Processing {os.path.basename(file_path)}...')
    
    with open(file_path, 'r', encoding='utf-8') as f:
        workflow = json.load(f)
    
    updated = 0
    for node in workflow['nodes']:
        if node.get('type') == 'n8n-nodes-base.if' and node.get('typeVersion') == 1:
            node['typeVersion'] = 2
            updated += 1
            print(f'  ✅ Updated: {node.get("name", "Unknown")}')
    
    if updated > 0:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(workflow, f, indent=2, ensure_ascii=False)
        print(f'  📊 Total: {updated} IF nodes updated to v2')
    else:
        print('  ℹ️ No IF v1 nodes found')
    
    return updated

files = [
    'Workspace_API.json',
    'Analytics_API.json',
    'Reports_API.json',
    'MiniApp_API.json'
]

print('🔧 Updating IF nodes to typeVersion 2...')
print('='*60)

total = 0
for filename in files:
    if os.path.exists(filename):
        total += update_if_nodes(filename)

print('\n' + '='*60)
print(f'✅ Done! {total} IF nodes updated across all workflows')
print('\n📥 Re-import workflows into n8n and activate!')
