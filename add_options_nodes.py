import json
import os

def add_options_handler_to_workflow(file_path):
    """Add OPTIONS request handler as first IF node in workflow"""
    print(f'\n📝 Processing {os.path.basename(file_path)}...')
    
    with open(file_path, 'r', encoding='utf-8') as f:
        workflow = json.load(f)
    
    # Find webhook node
    webhook_node = None
    webhook_id = None
    for node in workflow['nodes']:
        if node.get('type') == 'n8n-nodes-base.webhook':
            webhook_node = node
            webhook_id = node.get('id') or node.get('name')
            break
    
    if not webhook_node:
        print('  ⚠️ No webhook node found')
        return False
    
    # Check if OPTIONS handler already exists
    has_options = any(
        node.get('name') == 'Check if OPTIONS' 
        for node in workflow['nodes']
    )
    
    if has_options:
        print('  ℹ️ OPTIONS handler already exists, skipping')
        return False
    
    webhook_pos = webhook_node['position']
    
    # Create IF node to check for OPTIONS method
    if_node_id = f"check_options_{os.path.basename(file_path).split('.')[0]}"
    if_node = {
        "parameters": {
            "conditions": {
                "string": [
                    {
                        "value1": "={{$json.headers['request-method'] || $json.method || 'POST'}}",
                        "operation": "equals",
                        "value2": "OPTIONS"
                    }
                ]
            }
        },
        "id": if_node_id,
        "name": "Check if OPTIONS",
        "type": "n8n-nodes-base.if",
        "typeVersion": 1,
        "position": [
            webhook_pos[0] + 250,
            webhook_pos[1]
        ]
    }
    
    # Create Response node for OPTIONS (204 No Content with CORS)
    options_response_id = f"options_response_{os.path.basename(file_path).split('.')[0]}"
    options_response = {
        "parameters": {
            "respondWith": "text",
            "responseBody": "",
            "options": {
                "responseCode": 204,
                "responseHeaders": {
                    "entries": [
                        {
                            "name": "Access-Control-Allow-Origin",
                            "value": "*"
                        },
                        {
                            "name": "Access-Control-Allow-Methods",
                            "value": "GET, POST, OPTIONS"
                        },
                        {
                            "name": "Access-Control-Allow-Headers",
                            "value": "Content-Type, Authorization"
                        },
                        {
                            "name": "Access-Control-Max-Age",
                            "value": "86400"
                        }
                    ]
                }
            }
        },
        "id": options_response_id,
        "name": "Response: OPTIONS",
        "type": "n8n-nodes-base.respondToWebhook",
        "typeVersion": 1,
        "position": [
            webhook_pos[0] + 500,
            webhook_pos[1] - 150
        ]
    }
    
    # Get existing connections from webhook
    old_connections = workflow.get('connections', {}).get(webhook_id, {}).get('main', [[]])[0]
    
    # Add new nodes
    workflow['nodes'].insert(1, if_node)  # Insert right after webhook
    workflow['nodes'].insert(2, options_response)
    
    # Update connections
    if 'connections' not in workflow:
        workflow['connections'] = {}
    
    # Webhook -> IF node
    workflow['connections'][webhook_id] = {
        "main": [[{"node": "Check if OPTIONS", "type": "main", "index": 0}]]
    }
    
    # IF node -> OPTIONS response (true) or old logic (false)
    workflow['connections'][if_node_id] = {
        "main": [
            [{"node": "Response: OPTIONS", "type": "main", "index": 0}],  # true
            old_connections  # false - connect to old logic
        ]
    }
    
    # Save
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(workflow, f, indent=2, ensure_ascii=False)
    
    print('  ✅ Added OPTIONS handler (IF node + Response)')
    print(f'     - IF checks: headers.request-method === "OPTIONS"')
    print(f'     - True: Returns 204 with CORS headers')
    print(f'     - False: Continues to existing workflow logic')
    return True

# Files to update
files = [
    'Workspace_API.json',
    'Analytics_API.json',
    'Reports_API.json',
]

script_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = script_dir  # Files are in same directory

print('🔧 Adding OPTIONS handlers to workflows...')
print('='*60)

updated = 0
for filename in files:
    file_path = os.path.join(parent_dir, filename)
    if os.path.exists(file_path):
        if add_options_handler_to_workflow(file_path):
            updated += 1
    else:
        print(f'\n⚠️ File not found: {filename}')

print('\n' + '='*60)
print(f'✅ Updated {updated} workflow(s)')
print('\n📋 Next steps:')
print('1. Re-import these workflows into n8n:')
for f in files:
    print(f'   - {f}')
print('2. Activate them')
print('3. Test with: cd tests && python test_cors_live.py')
