import json
import os

# CORS headers to add
cors_headers = {
    "responseHeaders": {
        "entries": [
            {
                "name": "Access-Control-Allow-Origin",
                "value": "*"
            },
            {
                "name": "Access-Control-Allow-Methods",
                "value": "POST, GET, OPTIONS"
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

# List of workflow files
workflow_files = [
    'Workspace_API.json',
    'Analytics_API.json',
    'Reports_API.json',
    'MiniApp_API.json'
]

def add_cors_to_workflow(file_path):
    print(f'Processing {file_path}...')
    
    # Read workflow
    with open(file_path, 'r', encoding='utf-8') as f:
        workflow = json.load(f)
    
    # Find all respondToWebhook nodes
    updated_count = 0
    for node in workflow.get('nodes', []):
        if node.get('type') == 'n8n-nodes-base.respondToWebhook':
            # Add CORS headers to options
            if 'parameters' not in node:
                node['parameters'] = {}
            if 'options' not in node['parameters']:
                node['parameters']['options'] = {}
            
            # Add responseHeaders
            node['parameters']['options']['responseHeaders'] = cors_headers['responseHeaders']
            updated_count += 1
            print(f"  ✅ Updated node: {node.get('name', 'unnamed')}")
    
    # Save updated workflow
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(workflow, f, indent=2, ensure_ascii=False)
    
    print(f'  ✅ {updated_count} nodes updated in {file_path}\n')

# Process all workflows
script_dir = os.path.dirname(os.path.abspath(__file__))
for workflow_file in workflow_files:
    file_path = os.path.join(script_dir, workflow_file)
    if os.path.exists(file_path):
        add_cors_to_workflow(file_path)
    else:
        print(f'  ⚠️ File not found: {workflow_file}\n')

print('🎉 Done! All workflows updated with CORS headers.')
print('\n📋 Next steps:')
print('1. Import updated JSON files into n8n')
print('2. Activate workflows')
print('3. Test Mini App - CORS errors should be gone!')
