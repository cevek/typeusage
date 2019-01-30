import * as ts from 'typescript';

export interface Replace {
    start: number;
    end: number;
    text: string;
}
export function replaceCode(code: string, replaces: Replace[]) {
    replaces.sort((a, b) => (a.start < b.start ? -1 : 1));
    let shift = 0;
    let prevEnd = -1;
    for (let i = 0; i < replaces.length; i++) {
        const replace = replaces[i];
        const pos = replace.start + shift;
        const end = replace.end + shift;
        if (prevEnd > pos) {
            continue;
        }
        const replacedCode = replace.text;
        code = code.substr(0, pos) + replacedCode + code.substr(end);
        const diff = replacedCode.length - (end - pos);
        shift += diff;
        prevEnd = end + diff;
    }
    return code;
}

export function transformToNewFile(
    sourceFile: ts.SourceFile,
    visitor: (replace: (node: ts.Node, str: string) => void) => void
): ts.SourceFile {
    const replaces: Replace[] = [];
    visitor((node, text) => replaces.push({ start: node.pos, end: node.end, text: text }));
    if (replaces.length === 0) return sourceFile;
    const newContent = replaceCode(sourceFile.text, replaces);
    return ts.createSourceFile(sourceFile.fileName, newContent, sourceFile.languageVersion);
}
