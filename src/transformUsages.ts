import * as ts from 'typescript';
import { relative, dirname } from 'path';
import { getId } from './extractTypes';
import { config } from './config';

export function transformUsages(ctx: ts.TransformationContext, outFile: string, projectDir: string) {
    return (sourceFile: ts.SourceFile) => {
        function visitor(node: ts.Node): ts.Node {
            if (ts.isCallExpression(node)) {
                if (node.typeArguments) {
                    const type = node.typeArguments[0];
                    if (
                        ts.isTypeReferenceNode(type) &&
                        ts.isIdentifier(type.typeName) &&
                        type.typeName.text === config.type.Auto
                    ) {
                        // console.log(sourceFile.fileName, projectDir);
                        const arg = ts.createElementAccess(
                            ts.createCall(
                                ts.createIdentifier('require'),
                                [],
                                [ts.createLiteral(relative(dirname(sourceFile.fileName), outFile))]
                            ),
                            ts.createLiteral(getId(sourceFile, type, projectDir))
                        );
                        return ts.updateCall(node, node.expression, [], [...node.arguments, arg]);
                    }
                }
            }
            return ts.visitEachChild(node, visitor, ctx);
        }
        return ts.visitEachChild(sourceFile, visitor, ctx);
    };
}
