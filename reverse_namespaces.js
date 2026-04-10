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

// Update usings globally to revert the damage
walkSync(baseDir, (filepath) => {
    if (filepath.endsWith(".cs")) {
        const content = fs.readFileSync(filepath, 'utf8');
        let newContent = content;
        
        newContent = newContent.replace(/using POS\.Domain;\r\nusing POS\.Data;/g, "using POS.Domain;");
        newContent = newContent.replace(/using POS\.Domain;\nusing POS\.Data;/g, "using POS.Domain;");
        
        newContent = newContent.replace(/using POS\.Data\.Context;/g, "using POS.Domain.Context;");
        newContent = newContent.replace(/using POS\.Data\.ImportExport;/g, "using POS.Domain.ImportExport;");
        newContent = newContent.replace(/using POS\.Data\.FBR;/g, "using POS.Domain.FBR;");
        newContent = newContent.replace(/using POS\.Data\.Sync;/g, "using POS.Domain.Sync;");
        
        newContent = newContent.replace(/POS\.Data\.Context\.POSDbContext/g, "POS.Domain.Context.POSDbContext");

        if (newContent !== content) {
            fs.writeFileSync(filepath, newContent, 'utf8');
        }
    }
});

console.log("Namespaces reverted.");
