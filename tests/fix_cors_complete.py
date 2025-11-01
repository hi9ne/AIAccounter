import json
import os

def fix_webhook_cors(file_path):
    """Add OPTIONS method support and CORS headers to webhook"""
    print(f'Processing {file_path}...')
    
    with open(file_path, 'r', encoding='utf-8') as f:
        workflow = json.load(f)
    
    changes = 0
    
    # Find webhook trigger node
    for node in workflow.get('nodes', []):
        if node.get('type') == 'n8n-nodes-base.webhook':
            # Enable OPTIONS method
            if 'parameters' not in node:
                node['parameters'] = {}
            
            if 'httpMethod' not in node['parameters']:
                node['parameters']['httpMethod'] = 'POST'
            
            # Add OPTIONS to allowed methods
            if 'options' not in node['parameters']:
                node['parameters']['options'] = {}
            
            node['parameters']['options']['allowedMethods'] = 'GET,POST,OPTIONS'
            
            print(f'  ✅ Updated webhook trigger: {node.get("name", "Unknown")}')
            changes += 1
    
    # Find all respondToWebhook nodes and add CORS
    for node in workflow.get('nodes', []):
        if node.get('type') == 'n8n-nodes-base.respondToWebhook':
            if 'parameters' not in node:
                node['parameters'] = {}
            
            # Add CORS headers
            if 'options' not in node['parameters']:
                node['parameters']['options'] = {}
            
            node['parameters']['options']['responseHeaders'] = {
                'entries': [
                    {
                        'name': 'Access-Control-Allow-Origin',
                        'value': '*'
                    },
                    {
                        'name': 'Access-Control-Allow-Methods',
                        'value': 'GET, POST, OPTIONS'
                    },
                    {
                        'name': 'Access-Control-Allow-Headers',
                        'value': 'Content-Type, Authorization'
                    },
                    {
                        'name': 'Access-Control-Max-Age',
                        'value': '86400'
                    }
                ]
            }
            
            print(f'  ✅ Updated response node: {node.get("name", "Unknown")}')
            changes += 1
    
    # Save file
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(workflow, f, indent=2, ensure_ascii=False)
    
    print(f'  📊 Total changes: {changes}\n')
    return changes

# Files to process
files = [
    'Workspace_API.json',
    'Analytics_API.json',
    'Reports_API.json',
    'MiniApp_API.json'
]

script_dir = os.path.dirname(os.path.abspath(__file__))
total = 0

print('🔧 Fixing CORS configuration in n8n workflows...\n')

for file_name in files:
    file_path = os.path.join(script_dir, file_name)
    if os.path.exists(file_path):
        count = fix_webhook_cors(file_path)
        total += count
    else:
        print(f'⚠️ File not found: {file_name}\n')

print(f'🎉 Done! {total} total nodes updated')
print('\n📋 Changes made:')
print('  1. Webhook triggers: Added OPTIONS method support')
print('  2. Response nodes: Added CORS headers')
print('\n⚠️ IMPORTANT: You must re-import these workflows into n8n!')
print('   The old workflows in n8n still have the old configuration.')
