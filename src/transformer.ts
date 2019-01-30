import * as ts from 'typescript';
import { watch } from './project';
import { transformUsages } from './transformUsages';

const projects = new Set<string>();
function transform(p: ts.Program, pluginOptions: { outFile: string; schema: string, excludeTypes: string[] }) {
    if (!pluginOptions.schema) throw new Error('TypeUsage: You should specify schema option');
    if (!pluginOptions.outFile) throw new Error('TypeUsage: You should specify outFile option');
    if (!pluginOptions.excludeTypes) throw new Error('TypeUsage: You should specify excludeTypes option');
    const projectDir = process.cwd();
    if (!projects.has(projectDir)) {
        projects.add(projectDir);
        watch(projectDir, pluginOptions.schema, pluginOptions.excludeTypes, pluginOptions.outFile);
    }
    return (ctx: ts.TransformationContext) => {
        return (sourceFile: ts.SourceFile) => {
            if (sourceFile.isDeclarationFile) return sourceFile;
            return transformUsages(ctx, pluginOptions.outFile, projectDir)(sourceFile);
        };
    };
}
export default transform;
