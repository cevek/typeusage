import { dirname } from 'path';
import * as ts from 'typescript';
import { config } from './config';
import { getId } from './extractTypes';
import { tsProgram } from './tsProgram';

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

export function replaceEntities(projectDir: string, replaces: Replace[], typeNames: Set<string>) {
    return (ctx: ts.TransformationContext) => {
        return (sourceFile: ts.SourceFile) => {
            function visitor(node: ts.Node): ts.Node {
                if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
                    if (node.typeName.text === config.type.Usage) return node;
                    if (typeNames.has(node.typeName.text) && node.parent && !ts.isCallExpression(node.parent)) {
                        replaces.push({
                            start: node.typeName.pos,
                            end: node.typeName.end,
                            text:
                                config.type.Usage + `<${node.typeName.text}, "${getId(sourceFile, node, projectDir)}">`,
                        });
                    }
                    if (node.typeName.text === config.type.Auto) {
                        replaces.push({
                            start: node.typeName.pos,
                            end: node.typeName.end,
                            text: `"${getId(sourceFile, node, projectDir)}"`,
                        });
                    }
                }
                return ts.visitEachChild(node, visitor, ctx);
            }
            return ts.visitEachChild(sourceFile, visitor, ctx);
        };
    };
}
