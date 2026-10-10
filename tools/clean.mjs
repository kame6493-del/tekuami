// dist を空にする(古い書き出しが残ると AAB に全部入ってしまうため)。1つずつ消して、残った数を数える
import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve('dist');
let n = 0;
function walk(d) {
  if (!fs.existsSync(d)) return;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      walk(p);
      fs.rmdirSync(p);
    } else {
      fs.unlinkSync(p);
      n++;
    }
  }
}
walk(dir);
console.log(`dist を空にしました(${n} 個)`);
