import json

def add_allowed_origins(file_path):
    """Add allowedOrigins to webhook options"""
    print(f'\n📝 Processing {file_path}...')
    
    with open(file_path, 'r', encoding='utf-8') as f:
        workflow = json.load(f)
    
    # Find and update webhook node
    for node in workflow['nodes']:
        if node.get('type') == 'n8n-nodes-base.webhook':
            if 'parameters' not in node:
                node['parameters'] = {}
            if 'options' not in node['parameters']:
                node['parameters']['options'] = {}
            
            # Add allowedOrigins - THIS IS THE KEY!
            node['parameters']['options']['allowedOrigins'] = '*'
            
            # Make sure allowedMethods includes OPTIONS
            if 'allowedMethods' not in node['parameters']['options']:
                node['parameters']['options']['allowedMethods'] = 'GET,POST,OPTIONS'
            
            print(f'  ✅ Added allowedOrigins: *')
            print(f'  ✅ Set allowedMethods: {node["parameters"]["options"]["allowedMethods"]}')
            
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(workflow, f, indent=2, ensure_ascii=False)
            
            return True
    
    print('  ⚠️ No webhook node found')
    return False

files = [
    'Workspace_API.json',
    'Analytics_API.json',
    'Reports_API.json',
]

print('🔧 Adding allowedOrigins to webhooks (like MiniApp_API)...')
print('='*60)

for filename in files:
    add_allowed_origins(filename)

print('\n' + '='*60)
print('✅ Done! Added "allowedOrigins": "*" to all webhooks')
print('This is what makes MiniApp_API work with CORS!')
print('\n📥 Re-import workflows and test again')
