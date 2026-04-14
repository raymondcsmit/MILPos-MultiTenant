const fs = require('fs');
const path = require('path');

const baseDir = "f:\\MIllyass\\pos-with-inventory-management\\SourceCode\\SQLAPI";

function walkSync(dir, callback) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) {
            walkSync(filepath, callback);
        } else {
            callback(filepath);
        }
    }
}

// 1. Change namespaces in POS.Data
const dataDir = path.join(baseDir, "POS.Data");
walkSync(dataDir, (filepath) => {
    if (filepath.endsWith(".cs")) {
        const content = fs.readFileSync(filepath, 'utf8');
        const newContent = content.replace(/namespace POS\.Domain/g, "namespace POS.Data");
        if (newContent !== content) {
            fs.writeFileSync(filepath, newContent, 'utf8');
        }
    }
});

// 2. Update usings globally
walkSync(baseDir, (filepath) => {
    if (filepath.endsWith(".cs")) {
        const content = fs.readFileSync(filepath, 'utf8');
        let newContent = content;
        
        // Don't add duplicate using POS.Data; if it's already there
        if (!newContent.includes("using POS.Data;")) {
            newContent = newContent.replace(/using POS\.Domain;/g, "using POS.Domain;\r\nusing POS.Data;");
        }
        
        newContent = newContent.replace(/using POS\.Domain\.Context;/g, "using POS.Data.Context;");
        newContent = newContent.replace(/using POS\.Domain\.ImportExport;/g, "using POS.Data.ImportExport;");
        newContent = newContent.replace(/using POS\.Domain\.FBR;/g, "using POS.Data.FBR;");
        newContent = newContent.replace(/using POS\.Domain\.Sync;/g, "using POS.Data.Sync;");
        
        // Also update DI references in Startup.cs or wherever they might be fully qualified
        newContent = newContent.replace(/POS\.Domain\.Context\.POSDbContext/g, "POS.Data.Context.POSDbContext");

        if (newContent !== content) {
            fs.writeFileSync(filepath, newContent, 'utf8');
        }
    }
});

console.log("Namespaces updated.");
