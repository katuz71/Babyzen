const fs = require('fs');
const path = require('path');

// Папки, которые нам не нужны в отчете
const IGNORE_DIRS = ['node_modules', '.git', '.expo', 'assets', '.continue', '.vscode'];

function scanDir(dir, indent = '') {
  let output = '';
  let files;
  
  try {
    files = fs.readdirSync(dir);
  } catch (e) {
    return '';
  }

  // Сортируем: сначала папки, потом файлы
  files.sort((a, b) => {
    const isDirA = fs.statSync(path.join(dir, a)).isDirectory();
    const isDirB = fs.statSync(path.join(dir, b)).isDirectory();
    if (isDirA && !isDirB) return -1;
    if (!isDirA && isDirB) return 1;
    return a.localeCompare(b);
  });

  files.forEach((file, index) => {
    const fullPath = path.join(dir, file);
    const isLast = index === files.length - 1;
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) {
        output += `${indent}${isLast ? '└── ' : '├── '}${file}/\n`;
        output += scanDir(fullPath, indent + (isLast ? '    ' : '│   '));
      }
    } else {
      // Игнорируем сам скрипт, логи и системные файлы
      if (!file.endsWith('.log') && file !== 'scan.js' && file !== 'project-structure.txt') {
        output += `${indent}${isLast ? '└── ' : '├── '}${file}\n`;
      }
    }
  });

  return output;
}

console.log('🕵️ Сканирую архитектуру Baby Zen...');
const tree = scanDir(__dirname);
fs.writeFileSync('project-structure.txt', tree);
console.log('✅ Готово! Дерево проекта сохранено в файл "project-structure.txt".');