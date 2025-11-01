import json
import re

files = ['Workspace_API.json', 'Analytics_API.json', 'Reports_API.json']

for filename in files:
    print(f'\n📝 Processing {filename}...')
    
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    changes = 0
    
    # Fix all remaining $json["body"]["field"] patterns
    # Match pattern: $json["body"]["anything"]
    content = re.sub(r'\$json\["body"\]\["([^"]+)"\]', r'$json["\1"]', content)
    
    # Also fix the dot notation version that might still exist
    content = re.sub(r'\$json\.body\.(\w+)', r'$json.\1', content)
    
    # Count changes
    if content != original:
        changes = content.count('$json') - original.count('$json')
        print(f'   ✅ Fixed remaining .body references')
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
    else:
        print(f'   ✅ No .body references found')

print('\n✅ Done! All $json["body"] patterns removed')
