import json
import os

def fix_options_check(file_path):
    """Fix OPTIONS check to use correct n8n variable"""
    print(f'\n📝 Fixing {os.path.basename(file_path)}...')
    
    with open(file_path, 'r', encoding='utf-8') as f:
        workflow = json.load(f)
    
    fixed = False
    for node in workflow['nodes']:
        if node.get('name') == 'Check if OPTIONS':
            # Fix the condition to check httpMethod correctly
            old_value = node['parameters']['conditions']['string'][0]['value1']
            
            # In n8n, HTTP method is available via $httpMethod or $request.method
            node['parameters']['conditions']['string'][0]['value1'] = "={{$httpMethod}}"
            
            print(f'  ✅ Fixed IF condition')
            print(f'     Old: {old_value}')
            print(f'     New: ={{{{$httpMethod}}}}')
            fixed = True
            break
    
    if fixed:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(workflow, f, indent=2, ensure_ascii=False)
        return True
    else:
        print('  ⚠️ No "Check if OPTIONS" node found')
        return False

# Files to fix
files = [
    'Workspace_API.json',
    'Analytics_API.json',
    'Reports_API.json',
]

print('🔧 Fixing OPTIONS check conditions...')
print('='*60)

for filename in files:
    if os.path.exists(filename):
        fix_options_check(filename)

print('\n' + '='*60)
print('✅ Done! Re-import workflows and test again')
print('\nThe IF node now checks: $httpMethod === "OPTIONS"')
print('This is the correct way to get HTTP method in n8n webhooks')
