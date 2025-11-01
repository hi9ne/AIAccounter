import requests

def test_cors(url, name):
    """Test CORS preflight (OPTIONS) and actual request"""
    print(f'\n🔍 Testing {name}')
    print(f'URL: {url}')
    
    # Test OPTIONS (preflight)
    print('\n1️⃣ Testing OPTIONS request (preflight)...')
    try:
        response = requests.options(
            url,
            headers={
                'Origin': 'https://hi9ne.github.io',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type'
            },
            timeout=10
        )
        
        print(f'   Status: {response.status_code}')
        print(f'   Headers:')
        
        cors_headers = {
            'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin', '❌ NOT SET'),
            'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods', '❌ NOT SET'),
            'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers', '❌ NOT SET'),
        }
        
        for header, value in cors_headers.items():
            status = '✅' if value != '❌ NOT SET' else '❌'
            print(f'   {status} {header}: {value}')
        
        return all(v != '❌ NOT SET' for v in cors_headers.values())
        
    except Exception as e:
        print(f'   ❌ Error: {str(e)}')
        return False

# Test all endpoints
endpoints = [
    ('https://hi9neee.app.n8n.cloud/webhook/workspace-api', 'Workspace API'),
    ('https://hi9neee.app.n8n.cloud/webhook/analytics-api', 'Analytics API'),
    ('https://hi9neee.app.n8n.cloud/webhook/reports-api', 'Reports API'),
    ('https://hi9neee.app.n8n.cloud/webhook/miniapp', 'MiniApp API'),
]

print('🚀 Testing CORS configuration on n8n webhooks...')
print('='*60)

results = []
for url, name in endpoints:
    result = test_cors(url, name)
    results.append((name, result))

print('\n' + '='*60)
print('📊 SUMMARY:')
print('='*60)

all_ok = True
for name, result in results:
    status = '✅ OK' if result else '❌ FAILED'
    print(f'{status} - {name}')
    if not result:
        all_ok = False

print('='*60)

if all_ok:
    print('✅ All endpoints have CORS configured correctly!')
    print('   If you still see errors, try:')
    print('   1. Clear browser cache (Ctrl+Shift+Delete)')
    print('   2. Hard refresh (Ctrl+F5)')
    print('   3. Check if workflows are ACTIVE in n8n')
else:
    print('❌ Some endpoints are missing CORS headers!')
    print('   Solutions:')
    print('   1. Make sure you imported the correct JSON files')
    print('   2. Check that workflows are ACTIVATED in n8n')
    print('   3. Verify webhook URLs match exactly')
    print('   4. Try re-importing the workflows')
