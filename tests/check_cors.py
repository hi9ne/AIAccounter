import json

def check_workflow_cors(file_name):
    """Check CORS configuration in workflow"""
    print(f'\n📋 Checking {file_name}...')
    
    with open(file_name, 'r', encoding='utf-8') as f:
        workflow = json.load(f)
    
    # Check webhook triggers
    webhooks = [n for n in workflow['nodes'] if n.get('type') == 'n8n-nodes-base.webhook']
    print(f'  Webhook triggers: {len(webhooks)}')
    
    for node in webhooks:
        name = node.get('name', 'Unknown')
        allowed = node.get('parameters', {}).get('options', {}).get('allowedMethods', 'NOT SET')
        status = '✅' if 'OPTIONS' in str(allowed) else '❌'
        print(f'    {status} {name}: {allowed}')
    
    # Check response nodes
    responses = [n for n in workflow['nodes'] if n.get('type') == 'n8n-nodes-base.respondToWebhook']
    print(f'  Response nodes: {len(responses)}')
    
    cors_count = 0
    for node in responses:
        name = node.get('name', 'Unknown')
        headers = node.get('parameters', {}).get('options', {}).get('responseHeaders', {})
        has_cors = any(
            entry.get('name') == 'Access-Control-Allow-Origin' 
            for entry in headers.get('entries', [])
        )
        if has_cors:
            cors_count += 1
        status = '✅' if has_cors else '❌'
        print(f'    {status} {name}')
    
    print(f'  Summary: {cors_count}/{len(responses)} responses have CORS headers')
    
    return len(webhooks) > 0 and cors_count == len(responses)

files = [
    'Workspace_API.json',
    'Analytics_API.json', 
    'Reports_API.json',
    'MiniApp_API.json'
]

print('🔍 Checking CORS configuration in all workflows...')

all_ok = True
for file_name in files:
    ok = check_workflow_cors(file_name)
    if not ok:
        all_ok = False

print('\n' + '='*50)
if all_ok:
    print('✅ All workflows have correct CORS configuration!')
else:
    print('❌ Some workflows need fixes!')
