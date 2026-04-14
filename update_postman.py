import json
import os

file_path = r"f:\MIllyass\pos-with-inventory-management\SourceCode\Documents\Testing\POS-Test.json"

with open(file_path, "r") as f:
    data = json.load(f)

# Create Register Request
register_req = {
    "name": "0. Register Tenant (TechCorp)",
    "request": {
        "method": "POST",
        "header": [
            {
                "key": "Content-Type",
                "value": "application/json",
                "type": "text"
            }
        ],
        "url": {
            "raw": "{{base_url}}/Tenants/register",
            "host": ["{{base_url}}"],
            "path": ["Tenants", "register"]
        },
        "body": {
            "mode": "raw",
            "raw": json.dumps({
                "name": "TechCorp POS",
                "subdomain": "techcorp",
                "adminEmail": "admin@techcorp.com",
                "adminPassword": "TechCorp@2024",
                "phone": "+1-555-0101",
                "address": "123 TechCorp Way"
            }, indent=4)
        }
    },
    "response": []
}

# Insert at the beginning of the items list
data["item"].insert(0, register_req)

with open(file_path, "w") as f:
    json.dump(data, f, indent=4)

print("Updated POS-Test.json with Registration step.")
