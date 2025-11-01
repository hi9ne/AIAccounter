import json
import os

def add_options_handler(file_path):
    """Add OPTIONS request handler to workflow"""
    print(f'\n📝 Processing {os.path.basename(file_path)}...')
    
    with open(file_path, 'r', encoding='utf-8') as f:
        workflow = json.load(f)
    
    # Find webhook node
    webhook_node = None
    for node in workflow['nodes']:
        if node.get('type') == 'n8n-nodes-base.webhook':
            webhook_node = node
            break
    
    if not webhook_node:
        print('  ⚠️ No webhook node found')
        return False
    
    # Check if IF node for OPTIONS already exists
    has_options_check = any(
        node.get('name') == 'Check OPTIONS' 
        for node in workflow['nodes']
    )
    
    if has_options_check:
        print('  ℹ️ OPTIONS handler already exists')
        return False
    
    # Add IF node to check request method
    if_node = {
        "parameters": {
            "conditions": {
                "string": [
                    {
                        "value1": "={{$json.headers['request-method'] || $json.method}}",
                        "operation": "equals",
                        "value2": "OPTIONS"
                    }
                ]
            }
        },
        "id": "options_check_node",
        "name": "Check OPTIONS",
        "type": "n8n-nodes-base.if",
        "typeVersion": 1,
        "position": [
            webhook_node['position'][0] + 200,
            webhook_node['position'][1]
        ]
    }
    
    # Add OPTIONS response node
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
        "id": "options_response_node",
        "name": "Response OPTIONS",
        "type": "n8n-nodes-base.respondToWebhook",
        "typeVersion": 1,
        "position": [
            webhook_node['position'][0] + 400,
            webhook_node['position'][1] - 150
        ]
    }
    
    # Add nodes to workflow
    workflow['nodes'].append(if_node)
    workflow['nodes'].append(options_response)
    
    # Update connections
    if 'connections' not in workflow:
        workflow['connections'] = {}
    
    webhook_id = webhook_node['id']
    
    # Connect webhook -> IF node
    workflow['connections'][webhook_id] = {
        "main": [[{"node": "Check OPTIONS", "type": "main", "index": 0}]]
    }
    
    # Connect IF true -> OPTIONS response
    workflow['connections']['Check OPTIONS'] = {
        "main": [
            [{"node": "Response OPTIONS", "type": "main", "index": 0}],
            []  # false path - will connect to existing logic
        ]
    }
    
    # Save
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(workflow, f, indent=2, ensure_ascii=False)
    
    print('  ✅ Added OPTIONS handler')
    return True

# Process files
files = [
    'Workspace_API.json',
    'Analytics_API.json',
    'Reports_API.json',
]

script_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(script_dir)

print('🔧 Adding OPTIONS handlers to workflows...')

for filename in files:
    file_path = os.path.join(parent_dir, filename)
    if os.path.exists(file_path):
        add_options_handler(file_path)
    else:
        print(f'\n⚠️ File not found: {filename}')

print('\n✅ Done! Re-import these workflows into n8n:')
for f in files:
    print(f'   - {f}')
