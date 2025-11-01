import json
import re

# Files to fix
files = [
    'Workspace_API.json',
    'Analytics_API.json',
    'Reports_API.json'
]

for filename in files:
    print(f'\n📝 Processing {filename}...')
    
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    changes = 0
    
    # REVERT: $json. back to $json.body. (but NOT in leftValue comparisons)
    # We need to be more careful - only in SQL queries and parameter values
    
    # Pattern 1: In SQL queries - revert direct field access back to body
    # {{$json.workspaceId}} -> {{$json.body.workspaceId}}
    # {{$json.userId}} -> {{$json.body.userId}}
    # {{$json.name}} -> {{$json.body.name}}
    # BUT: Don't change $json.body.action (already correct)
    
    original = content
    
    # Revert specific fields commonly used
    content = re.sub(r'\{\{\s*\$json\.workspaceId', '{{ $json.body.workspaceId', content)
    content = re.sub(r'\{\{\s*\$json\.userId', '{{ $json.body.userId', content)
    content = re.sub(r'\{\{\s*\$json\.name\b', '{{ $json.body.name', content)
    content = re.sub(r'\{\{\s*\$json\.description', '{{ $json.body.description', content)
    content = re.sub(r'\{\{\s*\$json\.currency', '{{ $json.body.currency', content)
    content = re.sub(r'\{\{\s*\$json\.start_date', '{{ $json.body.start_date', content)
    content = re.sub(r'\{\{\s*\$json\.end_date', '{{ $json.body.end_date', content)
    content = re.sub(r'\{\{\s*\$json\.transactionId', '{{ $json.body.transactionId', content)
    content = re.sub(r'\{\{\s*\$json\.amount', '{{ $json.body.amount', content)
    content = re.sub(r'\{\{\s*\$json\.category', '{{ $json.body.category', content)
    content = re.sub(r'\{\{\s*\$json\.type\b', '{{ $json.body.type', content)
    content = re.sub(r'\{\{\s*\$json\.date\b', '{{ $json.body.date', content)
    content = re.sub(r'\{\{\s*\$json\.note', '{{ $json.body.note', content)
    content = re.sub(r'\{\{\s*\$json\.period', '{{ $json.body.period', content)
    content = re.sub(r'\{\{\s*\$json\.reportType', '{{ $json.body.reportType', content)
    
    # Also fix the bracket notation
    content = re.sub(r'\$json\["workspaceId"\]', '$json.body.workspaceId', content)
    content = re.sub(r'\$json\["userId"\]', '$json.body.userId', content)
    content = re.sub(r'\$json\["name"\]', '$json.body.name', content)
    content = re.sub(r'\$json\["description"\]', '$json.body.description', content)
    content = re.sub(r'\$json\["currency"\]', '$json.body.currency', content)
    content = re.sub(r'\$json\["start_date"\]', '$json.body.start_date', content)
    content = re.sub(r'\$json\["end_date"\]', '$json.body.end_date', content)
    
    if content != original:
        changes = len(re.findall(r'body\.', content)) - len(re.findall(r'body\.', original))
        print(f'   ✅ Made ~{changes} changes')
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
    else:
        print(f'   ⚠️ No changes needed')

print('\n✅ Done! All workflows now use $json.body.* for webhook data')
