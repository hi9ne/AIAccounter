import json

def simplify_cors_approach(file_path):
    """Remove IF check, add CORS to ALL responses"""
    print(f'\n📝 Processing {file_path}...')
    
    with open(file_path, 'r', encoding='utf-8') as f:
        workflow = json.load(f)
    
    # Remove the IF node and OPTIONS response
    nodes_to_remove = ['Check if OPTIONS', 'Response: OPTIONS']
    original_count = len(workflow['nodes'])
    
    workflow['nodes'] = [
        node for node in workflow['nodes'] 
        if node.get('name') not in nodes_to_remove
    ]
    
    removed = original_count - len(workflow['nodes'])
    
    # Find webhook and first real logic node
    webhook_node = None
    first_logic_node = None
    
    for node in workflow['nodes']:
        if node.get('type') == 'n8n-nodes-base.webhook':
            webhook_node = node
            # Change to "Last Node" mode - simpler!
            if 'parameters' not in node:
                node['parameters'] = {}
            node['parameters']['responseMode'] = 'lastNode'
            print(f'  ✅ Changed webhook to "Last Node" mode')
        elif not first_logic_node and node.get('type') == 'n8n-nodes-base.if':
            first_logic_node = node
    
    # Reconnect webhook directly to first logic node
    if webhook_node and first_logic_node:
        webhook_id = webhook_node.get('id') or webhook_node.get('name')
        first_id = first_logic_node.get('name')
        
        workflow['connections'][webhook_id] = {
            "main": [[{"node": first_id, "type": "main", "index": 0}]]
        }
        print(f'  ✅ Reconnected: Webhook → {first_id}')
    
    # Add CORS headers to ALL respondToWebhook nodes
    cors_count = 0
    for node in workflow['nodes']:
        if node.get('type') == 'n8n-nodes-base.respondToWebhook':
            if 'parameters' not in node:
                node['parameters'] = {}
            if 'options' not in node['parameters']:
                node['parameters']['options'] = {}
            
            node['parameters']['options']['responseHeaders'] = {
                'entries': [
                    {'name': 'Access-Control-Allow-Origin', 'value': '*'},
                    {'name': 'Access-Control-Allow-Methods', 'value': 'GET, POST, OPTIONS'},
                    {'name': 'Access-Control-Allow-Headers', 'value': 'Content-Type, Authorization'},
                    {'name': 'Access-Control-Max-Age', 'value': '86400'}
                ]
            }
            cors_count += 1
    
    print(f'  ✅ Removed {removed} nodes (IF + OPTIONS Response)')
    print(f'  ✅ Added CORS to {cors_count} response nodes')
    
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(workflow, f, indent=2, ensure_ascii=False)
    
    return True

files = [
    'Workspace_API.json',
    'Analytics_API.json',
    'Reports_API.json',
]

print('🔧 Simplifying CORS approach - removing OPTIONS check...')
print('='*60)

for filename in files:
    simplify_cors_approach(filename)

print('\n' + '='*60)
print('✅ Done! Changes:')
print('  1. Removed IF node for OPTIONS check (causing 500 errors)')
print('  2. Removed separate OPTIONS response node')
print('  3. Changed webhook mode to "Last Node"')
print('  4. All responses now have CORS headers')
print('\n⚠️ Limitation: OPTIONS preflight will return same as POST')
print('   But this should work for most CORS scenarios')
print('\n📥 Re-import workflows and test!')
