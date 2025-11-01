import json
import re

# Fix all 3 workflow files
files = ['Workspace_API.json', 'Analytics_API.json', 'Reports_API.json']

for filename in files:
    print(f'\n📝 Processing {filename}...')
    
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Fix action routing: $json["body"]["action"] -> $json["action"]
    content = re.sub(r'\$json\["body"\]\["action"\]', '$json["action"]', content)
    
    # Fix all SQL queries: $json.body. -> $json.
    content = re.sub(r'\$json\.body\.', '$json.', content)
    
    # Fix bracket notation: $json.body.field -> $json.field  
    content = re.sub(r'\{\{\s*\$json\.body\.', '{{ $json.', content)
    
    changes = content.count('$json.') - original.count('$json.')
    
    if content != original:
        print(f'   ✅ Made changes')
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
    else:
        print(f'   ⚠️ No changes needed')

print('\n✅ Done! All workflows now use $json.* directly (after Extract Body node)')
