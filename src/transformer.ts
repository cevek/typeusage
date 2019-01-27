import { readFileSync, writeFileSync } from 'fs';
import { dirname, normalize } from 'path';
import * as ts from 'typescript';
import { extractor } from './extractTypes';
import { replaceEntities, replaceCode, Replace } from './pre-transformer';
import { Type } from './vtype';
import { tsProgram } from './tsProgram';
import { transformUsages } from './transformUsages';
import { inspect } from 'util';
process.exit = function() {
    // debugger;
} as any;

// const schemeFile = __dirname + '/example/schema.d.ts';
console.log('init');
debugger;
let projectInited = false;
let tsProg: { getProgram(): ts.Program; updateFile(file: string): void };
const typeNames = new Set<string>();
let outFile: string;
let projectDir: string;
function transform(p: ts.Program, pluginOptions: { outFile: string; schema: string }) {
    if (!pluginOptions.schema) throw new Error('TypeUsage: You should specify schema option');
    if (!pluginOptions.outFile) throw new Error('TypeUsage: You should specify outFile option');

    if (!projectInited) {
        const schemeSource = ts.createSourceFile(
            'schema.d.ts',
            readFileSync(pluginOptions.schema, 'utf8'),
            ts.ScriptTarget.ESNext
        );
        schemeSource.statements.forEach(st => {
            if (ts.isInterfaceDeclaration(st) || ts.isEnumDeclaration(st) || ts.isTypeAliasDeclaration(st)) {
                typeNames.add(st.name.text);
            }
        });

        const tsconfigPath =
            (p.getCompilerOptions().configFilePath as string | undefined) || process.cwd() + '/tsconfig.json';
        projectDir = dirname(tsconfigPath);
        outFile = normalize(projectDir + '/' + pluginOptions.outFile);

        tsProg = tsProgram(tsconfigPath, {
            preTransformer(sourceFile) {
                if (sourceFile.isDeclarationFile) return sourceFile;
                let replaces: Replace[] = [];
                ts.transform(sourceFile, [replaceEntities(projectDir, replaces, typeNames)]);
                if (replaces.length === 0) return sourceFile;
                const replaced = replaceCode(sourceFile.text, replaces);
                // console.log(replaced);
                return ts.createSourceFile(sourceFile.fileName, replaced, sourceFile.languageVersion);
            },
        });

        createFile([]);
        projectInited = true;
    }

    let timer = false;
    function updateFile(file: string) {
        console.log('updateFile: ' + file);

        tsProg.updateFile(file);
        if (!timer) {
            timer = true;
            process.nextTick(collectUsages);
        }
    }

    function createFile(roots: { type: Type; obj: {} }[]) {
        let s = '';
        for (const root of roots) {
            s +=
                `module.exports['${root.type.id.replace(/^.*"(.*?)".*$/, '$1')}'] = ` +
                JSON.stringify(root.obj) +
                ';\n';
            s;
        }
        writeFileSync(outFile, s);
    }

    function collectUsages() {
        timer = false;
        console.log('collectUsages');
        const extract = extractor();
        const program = tsProg.getProgram();
        program.getSourceFiles().forEach(sourceFile => {
            if (sourceFile.isDeclarationFile) return;
            extract.usageCollector(sourceFile, program.getTypeChecker());
        });
        createFile(extract.roots());
        extract.getNonUsedTypes();
        // console.log(inspect(extract.registry.typeRegistry, {depth: 10}));
    }

    return (ctx: ts.TransformationContext) => {
        return (sourceFile: ts.SourceFile) => {
            if (sourceFile.isDeclarationFile) return sourceFile;
            updateFile(sourceFile.fileName);
            return transformUsages(ctx, outFile, projectDir)(sourceFile);
        };
    };
}

export default transform;
