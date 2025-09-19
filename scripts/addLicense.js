/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const HEADER = fs.readFileSync(path.join(ROOT, 'license-header.txt'), 'utf8').trim() + '\n\n';

// какие расширения трогаем
const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.scss']);

// что пропускаем
const ignoreDirs = new Set([
    'node_modules',
    '.next',
    'out',
    'dist',
    'build',
    '.git',
    '.turbo',
    '.vercel',
    'coverage',
    'public' // обычно картинки/статик
]);

function shouldIgnoreDir(name) {
    return ignoreDirs.has(name);
}

function hasHeader(content) {
    // очень простой чек: первые 300 символов содержат первую строку хедера
    return content.slice(0, 300).includes('Copyright (c) LLC "Centr Distribyucii"');
}

function processFile(full) {
    const ext = path.extname(full);
    if (!exts.has(ext)) return;

    const content = fs.readFileSync(full, 'utf8');

    if (hasHeader(content)) {
        return; // уже есть — не дублируем
    }

    // особый случай: файлы со strict mode / @jsx / shebang — вставим хедер после первой строки
    const firstLineEnd = content.indexOf('\n');
    const firstLine = content.slice(0, firstLineEnd).trim();

    const needsAfterFirstLine =
        firstLine.startsWith("'use strict'") ||
        firstLine.startsWith('"use strict"') ||
        firstLine.startsWith('#!') ||
        firstLine.startsWith('/** @jsx');

    let nextContent;
    if (needsAfterFirstLine && firstLineEnd > -1) {
        nextContent = content.slice(0, firstLineEnd + 1) + HEADER + content.slice(firstLineEnd + 1);
    } else {
        nextContent = HEADER + content;
    }

    fs.writeFileSync(full, nextContent, 'utf8');
    console.log('+ header:', path.relative(ROOT, full));
}

function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        const stat = fs.lstatSync(full);
        if (stat.isDirectory()) {
            if (!shouldIgnoreDir(name)) walk(full);
        } else if (stat.isFile()) {
            processFile(full);
        }
    }
}

walk(ROOT);
console.log('Done.');
