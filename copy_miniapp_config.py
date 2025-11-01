import json

def copy_miniapp_webhook_config(file_path):
    """Copy exact webhook config from MiniApp (which works!)"""
    print(f'\n📝 Processing {file_path}...')
    
    with open(file_path, 'r', encoding='utf-8') as f:
        workflow = json.load(f)
    
    # Find webhook node
    for node in workflow['nodes']:
        if node.get('type') == 'n8n-nodes-base.webhook':
            # Copy EXACT config from MiniApp_API
            node['typeVersion'] = 1.1  # Update to 1.1!
            
            if 'parameters' not in node:
                node['parameters'] = {}
            
            node['parameters']['httpMethod'] = 'POST'
            node['parameters']['responseMode'] = 'responseNode'
            
            # EXACT options from MiniApp
            node['parameters']['options'] = {
                'allowedOrigins': '*',
                'allowedMethods': 'GET,POST,OPTIONS'
            }
            
            print(f'  ✅ Updated to typeVersion 1.1')
            print(f'  ✅ Set httpMethod: POST')
            print(f'  ✅ Set responseMode: responseNode')
            print(f'  ✅ Set allowedOrigins: *')
            print(f'  ✅ Set allowedMethods: GET,POST,OPTIONS')
            
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

print('🔧 Copying EXACT webhook config from MiniApp_API...')
print('='*60)

for filename in files:
    copy_miniapp_webhook_config(filename)

print('\n' + '='*60)
print('✅ Done! Webhook config now IDENTICAL to MiniApp_API')
print('   This is the exact configuration that works!')
print('\n📥 Re-import workflows and test!')
