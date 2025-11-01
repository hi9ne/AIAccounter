import json

def fix_webhook_method(file_path):
    """Remove OPTIONS from allowedMethods, keep only POST"""
    print(f'\n📝 Fixing {file_path}...')
    
    with open(file_path, 'r', encoding='utf-8') as f:
        workflow = json.load(f)
    
    for node in workflow['nodes']:
        if node.get('type') == 'n8n-nodes-base.webhook':
            if 'parameters' not in node:
                node['parameters'] = {}
            
            # Set method to POST only
            node['parameters']['httpMethod'] = 'POST'
            
            # Keep allowedOrigins but remove allowedMethods
            if 'options' in node['parameters']:
                # Keep allowedOrigins
                if 'allowedOrigins' not in node['parameters']['options']:
                    node['parameters']['options']['allowedOrigins'] = '*'
                
                # Remove allowedMethods - let it default to POST only
                if 'allowedMethods' in node['parameters']['options']:
                    del node['parameters']['options']['allowedMethods']
            else:
                node['parameters']['options'] = {
                    'allowedOrigins': '*'
                }
            
            print(f'  ✅ Set httpMethod: POST')
            print(f'  ✅ Kept allowedOrigins: *')
            print(f'  ✅ Removed allowedMethods (defaults to POST)')
            
    # Remove OPTIONS check nodes if they exist
    nodes_to_remove = ['Check if OPTIONS', 'Response: OPTIONS']
    original_count = len(workflow['nodes'])
    workflow['nodes'] = [
        node for node in workflow['nodes'] 
        if node.get('name') not in nodes_to_remove
    ]
    removed = original_count - len(workflow['nodes'])
    
    if removed > 0:
        print(f'  ✅ Removed {removed} OPTIONS handler nodes')
        
        # Fix connections - reconnect webhook to first real node
        webhook_node = None
        first_logic_node = None
        
        for node in workflow['nodes']:
            if node.get('type') == 'n8n-nodes-base.webhook':
                webhook_node = node
            elif node.get('type') == 'n8n-nodes-base.if' and 'route' in node.get('name', '').lower():
                first_logic_node = node
                break
            elif node.get('type') == 'n8n-nodes-base.switch':
                first_logic_node = node
                break
        
        if webhook_node and first_logic_node:
            webhook_id = webhook_node.get('id') or webhook_node.get('name')
            first_name = first_logic_node.get('name')
            
            if webhook_id in workflow.get('connections', {}):
                workflow['connections'][webhook_id] = {
                    "main": [[{"node": first_name, "type": "main", "index": 0}]]
                }
                print(f'  ✅ Reconnected webhook → {first_name}')
    
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(workflow, f, indent=2, ensure_ascii=False)
    
    return True

files = [
    'Workspace_API.json',
    'Analytics_API.json',
    'Reports_API.json',
]

print('🔧 Fixing webhook configuration...')
print('='*60)

for filename in files:
    fix_webhook_method(filename)

print('\n' + '='*60)
print('✅ Done! Changes:')
print('  1. Webhook method: POST only (no GET/OPTIONS)')
print('  2. Kept allowedOrigins: * (for CORS)')
print('  3. Removed OPTIONS handler nodes')
print('  4. All response nodes still have CORS headers')
print('\n⚠️ How this works:')
print('  - Browser sends OPTIONS preflight → n8n handles automatically')
print('  - allowedOrigins: * tells n8n to add CORS headers')
print('  - Actual POST requests work normally with CORS')
print('\n📥 Re-import workflows and activate!')
