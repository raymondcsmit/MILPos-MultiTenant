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

walkSync(baseDir, (filepath) => {
    if (filepath.endsWith(".csproj")) {
        const content = fs.readFileSync(filepath, 'utf8');
        let newContent = content;
        
        // Remove ProjectReference to POS.Domain
        newContent = newContent.replace(/<ProjectReference Include="..\\POS.Domain\\POS.Domain.csproj" \/>\r?\n?/g, "");
        
        if (newContent !== content) {
            fs.writeFileSync(filepath, newContent, 'utf8');
            console.log(`Updated ${path.basename(filepath)}`);
        }
    }
});
