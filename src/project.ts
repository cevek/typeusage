import * as ts from 'typescript';
import { replaceEntities } from './replaceEntites';
import { readFileSync, writeFileSync } from 'fs';
import { Type } from './vtype';
import { extractor } from './extractTypes';

export function watch(projectDir: string, schemaFile: string, exceptTypes: string[], outFile: string) {
    const tsconfigPath = projectDir + '/tsconfig.json';
    const transformedFiles = new WeakSet<ts.SourceFile>();
    const typeNames = getRootTypesFromSchemaFile(schemaFile, exceptTypes);
    let prevOutFileContent = '';

    const watchHost = ts.createWatchCompilerHost(tsconfigPath, { noEmit: true, skipLibCheck: true }, ts.sys);
    watchHost.onWatchStatusChange = () => {};
    patchCreateProgram(watchHost);
    watchHost.afterProgramCreate = builderProgram => {
        // create file types.js if needed
        const extract = extractor();
        const typeChecker = builderProgram.getProgram().getTypeChecker();
        builderProgram.getSourceFiles().forEach(sourceFile => {
            if (sourceFile.isDeclarationFile) return;
            extract.usageCollector(sourceFile, typeChecker);
        });
        createFile(extract.roots());
        extract.getNonUsedTypes();
    };
    ts.createWatchProgram(watchHost);
    return;

    function createFile(roots: { type: Type; obj: {} }[]) {
        let s = '';
        for (const root of roots) {
            s +=
                `module.exports['${root.type.id.replace(/^.*"(.*?)".*$/, '$1')}'] = ` +
                JSON.stringify(root.obj) +
                ';\n';
            s;
        }
        if (prevOutFileContent !== s) {
            prevOutFileContent = s;
            writeFileSync(outFile, s);
        }
    }

    function getRootTypesFromSchemaFile(file: string, exceptTypes: string[]) {
        const typeNames = new Set();
        const schemeSource = ts.createSourceFile('schema.d.ts', readFileSync(file, 'utf8'), ts.ScriptTarget.ESNext);
        schemeSource.statements.forEach(st => {
            if (ts.isInterfaceDeclaration(st) || ts.isEnumDeclaration(st) || ts.isTypeAliasDeclaration(st)) {
                if (!exceptTypes.includes(st.name.text)) {
                    typeNames.add(st.name.text);
                }
            }
        });
        return typeNames;
    }

    function preTransformer(sourceFile: ts.SourceFile | undefined) {
        if (!sourceFile) return;
        if (transformedFiles.has(sourceFile)) return sourceFile;
        if (sourceFile.isDeclarationFile) return sourceFile;
        transformedFiles.add(sourceFile);

        console.log('transform ' + sourceFile.fileName);
        const newFile = replaceEntities(projectDir, sourceFile, typeNames);
        // console.log(newFile.text)
        return newFile;
    }

    function patchCreateProgram(watchHost: ts.WatchCompilerHostOfConfigFile<ts.BuilderProgram>) {
        const origCreateProgram = watchHost.createProgram;
        watchHost.createProgram = (
            rootNames,
            options,
            host,
            oldProgram,
            configFileParsingDiagnostics,
            projectReferences
        ) =>
            origCreateProgram(
                rootNames,
                options,
                patchHost(host!),
                oldProgram,
                configFileParsingDiagnostics,
                projectReferences
            );
    }

    function patchHost(host: ts.CompilerHost) {
        const origGetSource = host.getSourceFile;
        const origGetSourceByPath = host.getSourceFileByPath!;

        type PatchedFun = { (): void; patched: boolean };
        if ((origGetSource as PatchedFun).patched) return;
        (origGetSource as PatchedFun).patched = true;

        host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) =>
            preTransformer(origGetSource(fileName, languageVersion, onError, shouldCreateNewSourceFile));

        host.getSourceFileByPath = (fileName, path, languageVersion, onError, shouldCreateNewSourceFile) =>
            preTransformer(origGetSourceByPath(fileName, path, languageVersion, onError, shouldCreateNewSourceFile));

        return host;
    }
}
