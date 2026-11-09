import { execSync } from 'node:child_process';

const msg = process.argv.slice(2).join(' ').trim() || '記事を更新';
const run = (cmd) => execSync(cmd, { stdio: 'inherit', cwd: '..' });

run('git add -A');

try {
run(`git commit -m "${msg.replace(/"/g, '')}"`);
} catch {
console.log('変更はありません。');
process.exit(0);
}

run('git push');
console.log('');
console.log('公開しました。数分で https://blog.techcurrybread.workers.dev に反映されます。');
