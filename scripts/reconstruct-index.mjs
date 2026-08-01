import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const sourceDirectory = resolve('source');
const outputFile = resolve('index.html');

const parts = (await readdir(sourceDirectory))
  .filter((name) => name.startsWith('index.part.'))
  .sort();

if (!parts.length) {
  throw new Error('لم يتم العثور على أجزاء index.html داخل مجلد source.');
}

const contents = await Promise.all(
  parts.map((name) => readFile(resolve(sourceDirectory, name), 'utf8')),
);

const html = contents.join('');

if (!html.includes('<!DOCTYPE html>') || !html.includes('نبض التنفيذ')) {
  throw new Error('فشل التحقق من ملف الواجهة بعد إعادة تركيبه.');
}

await writeFile(outputFile, html, 'utf8');
console.log(`تم إنشاء index.html من ${parts.length} أجزاء.`);
