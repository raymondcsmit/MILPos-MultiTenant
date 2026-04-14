
import csv
import os

actions_file = 'SeedData/Actions.csv'
role_claims_file = 'SeedData/RoleClaims.csv'
root_path = r'f:\MIllyass\pos-with-inventory-management\SourceCode'

actions_path = os.path.join(root_path, actions_file)
role_claims_path = os.path.join(root_path, role_claims_file)

# 1. Map Code -> ActionId from Actions.csv
code_to_action_id = {}
with open(actions_path, mode='r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        # Actions.csv: Id,Name,Order,PageId,Code,...
        if row['Code'] and row['Id']:
            code_to_action_id[row['Code'].strip()] = row['Id'].strip()

print(f"Loaded {len(code_to_action_id)} actions.")

# 2. Fix RoleClaims.csv
updated_rows = []
fixed_count = 0
with open(role_claims_path, mode='r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames
    
    for row in reader:
        claim_type = row['ClaimType'].strip()
        current_action_id = row['ActionId'].strip()
        
        if claim_type in code_to_action_id:
            correct_action_id = code_to_action_id[claim_type]
            if current_action_id != correct_action_id:
                row['ActionId'] = correct_action_id
                fixed_count += 1
        
        updated_rows.append(row)

print(f"Fixed {fixed_count} rows in RoleClaims.csv")

# 3. Write back
with open(role_claims_path, mode='w', encoding='utf-8-sig', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(updated_rows)
