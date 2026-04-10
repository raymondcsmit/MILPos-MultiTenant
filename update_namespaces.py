import os

base_dir = r"f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI"

# 1. Change namespaces in POS.Data
data_dir = os.path.join(base_dir, "POS.Data")
for root, _, files in os.walk(data_dir):
    for file in files:
        if file.endswith(".cs"):
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            new_content = content.replace("namespace POS.Domain", "namespace POS.Data")
            
            if new_content != content:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)

# 2. Update usings globally
for root, _, files in os.walk(base_dir):
    for file in files:
        if file.endswith(".cs"):
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            new_content = content.replace("using POS.Domain;", "using POS.Domain;\nusing POS.Data;")
            new_content = new_content.replace("using POS.Domain.Context;", "using POS.Data.Context;")
            new_content = new_content.replace("using POS.Domain.ImportExport;", "using POS.Data.ImportExport;")
            new_content = new_content.replace("using POS.Domain.FBR;", "using POS.Data.FBR;")
            new_content = new_content.replace("using POS.Domain.Sync;", "using POS.Data.Sync;")
            
            if new_content != content:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)

print("Namespaces updated.")
