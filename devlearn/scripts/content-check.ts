// 説明の中身の検査（docs/explanation-standard.md 第 3 章の 15 項目）。
// 1 件でも落ちたら失敗で終わり、CI は公開まで進まない。
import { lessons } from '../src/lib/content/lessons.ts';
import { report } from './lib/content-report.ts';

const r = report(lessons);
for (const line of r.lines) (r.ok ? console.log : console.error)(line);
if (!r.ok) process.exit(1);
