import * as ts from 'typescript';
import { transformToNewFile, Replace, replaceCode } from './transformToNewFile';
import { config } from './config';
import { getId } from './extractTypes';

export function replaceEntities(projectDir: string, sourceFile: ts.SourceFile, typeNames: Set<string>) {
    return transformToNewFile(sourceFile, replaceNodeWithText => {
        function visitor(node: ts.Node) {
            if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
                if (node.typeName.text === config.type.Usage) return node;
                // console.log('replace type', node.typeName.text, typeNames, !!node.parent);
                if (typeNames.has(node.typeName.text)) {
                    replaceNodeWithText(
                        node.typeName,
                        config.type.Usage + `<${node.typeName.text}, "${getId(sourceFile, node, projectDir)}">`
                    );
                }
                if (node.typeName.text === config.type.Auto) {
                    replaceNodeWithText(node.typeName, `"${getId(sourceFile, node, projectDir)}"`);
                }
            }
            ts.forEachChild(node, visitor);
        }
        ts.forEachChild(sourceFile, visitor);
    });
}
