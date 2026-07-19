const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      // 1. replace `setDbState(db.getRawState())` and `setDbState({ ...db.getRawState() })`
      if (content.includes('setDbState(db.getRawState())')) {
        content = content.replace(/setDbState\(db\.getRawState\(\)\)/g, 'db.fetchAllData().then(setDbState)');
        modified = true;
      }
      if (content.includes('setDbState({ ...db.getRawState() })')) {
        content = content.replace(/setDbState\(\{ \.\.\.db\.getRawState\(\) \}\)/g, 'db.fetchAllData().then(setDbState)');
        modified = true;
      }

      // 2. handle `const dbState = db.getRawState()` which are not hooks (like inside functions or non-react components)
      // Actually, if a component does `const dbState = db.getRawState();` in render body, we need to convert it to useState.
      // E.g., `AttendanceManager.tsx` and `FacultyClassAttendance.tsx` and `StudentDashboard.tsx` do this.
      if (content.match(/const dbState = db\.getRawState\(\);/g)) {
        if (!content.includes('useState(db.getRawState())')) {
          content = content.replace(/const dbState = db\.getRawState\(\);/g, 
            'const [dbState, setDbState] = useState(db.getRawState());\n  useEffect(() => { db.fetchAllData().then(setDbState); }, []);');
          if (!content.includes('useState')) {
             content = content.replace(/import React(.*?)(?=\s*from 'react')/, "import React, { useState, useEffect }$1");
          }
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated', fullPath);
      }
    }
  }
}

processDir('c:\\Users\\tsrir\\OneDrive\\Desktop\\pp\\src');
