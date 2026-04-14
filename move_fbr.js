const fs = require('fs');
const path = require('path');

function moveDir(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const files = fs.readdirSync(src);
    for (const file of files) {
        const srcPath = path.join(src, file);
        const destPath = path.join(dest, file);
        if (fs.statSync(srcPath).isDirectory()) {
            moveDir(srcPath, destPath);
        } else {
            fs.renameSync(srcPath, destPath);
        }
    }
}

moveDir("f:\\MIllyass\\pos-with-inventory-management\\SourceCode\\SQLAPI\\POS.Domain\\FBR", "f:\\MIllyass\\pos-with-inventory-management\\SourceCode\\SQLAPI\\POS.Data\\FBR");
