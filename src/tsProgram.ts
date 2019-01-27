import { dirname } from 'path';
import {
    createCompilerHost,
    createProgram,
    CreateProgramOptions,
    findConfigFile,
    ParsedCommandLine,
    parseJsonConfigFileContent,
    Program,
    readConfigFile,
    SourceFile,
    sys,
    CompilerOptions,
    ProjectReference,
    CompilerHost,
    Diagnostic,
} from 'typescript';
declare module 'typescript' {
    export function changeCompilerHostToUseCache(
        host: CompilerHost,
        toPath: (fileName: string) => string,
        useCacheForSourceFile: boolean
    ): void;
}

export function tsProgram(
    tsconfigPath: string,
    params: {
        preTransformer?: (sourceFile: SourceFile) => SourceFile;
    } = {}
) {
    let program: Program | undefined;
    const sourceFileMap = new Map<string, SourceFile | undefined>();
    const { preTransformer = (s: SourceFile) => s } = params;
    const tsconfig = getConfig(tsconfigPath);
    const compilerOptions = tsconfig.options;
    compilerOptions.noEmit = true;
    compilerOptions.noResolve = false;
    compilerOptions.skipLibCheck = true;
    compilerOptions.declaration = false;
    compilerOptions.sourceMap = false;
    compilerOptions.plugins = undefined;
    const host = createHost(compilerOptions);

    function getConfig(dir: string) {
        //dirOrTsconfig.match(/\.json$/) ? dirOrTsconfig :
        const configFileName = findConfigFile(dir, sys.fileExists);
        if (configFileName) {
            const result = readConfigFile(configFileName, sys.readFile);
            if (result.error) {
                throw new Error('tsconfig.json error: ' + result.error.messageText);
            }
            const config = parseJsonConfigFileContent(
                result.config,
                sys,
                dirname(configFileName),
                undefined,
                configFileName
            );
            return config;
        }
        throw new Error('tsconfig.json is not found');
    }

    function createHost(config: CompilerOptions) {
        const host = createCompilerHost(config);
        // changeCompilerHostToUseCache(host, fileName => fileName, /*useCacheForSourceFile*/ false);
        const origGetSource = host.getSourceFile;
        host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
            const existSourceFile = sourceFileMap.get(fileName);
            // console.log(fileName, !!existSourceFile);
            if (existSourceFile) return existSourceFile;
            let sourceFile = origGetSource(fileName, languageVersion, onError, shouldCreateNewSourceFile);
            if (sourceFile) sourceFile = preTransformer(sourceFile);
            sourceFileMap.set(fileName, sourceFile);
            return sourceFile;
        };
        return host;
    }

    function compile() {
        const programOptions: CreateProgramOptions = {
            rootNames: tsconfig.fileNames,
            projectReferences: tsconfig.projectReferences,
            options: compilerOptions,
            host,
            oldProgram: program,
        };
        program = createProgram(programOptions);
    }

    function updateFile(fileName: string) {
        sourceFileMap.delete(fileName);
        program = undefined;
    }

    return {
        getProgram: () => {
            if (program === undefined) compile();
            return program!;
        },
        updateFile,
    };
}

//     const watchCompilerHost = createWatchCompilerHost(configFileName, { noEmit: true, skipLibCheck: true }, sys);
//     watchCompilerHost;
//     const p = createWatchProgram(watchCompilerHost);
//     const program = p.getProgram();
//     // program.getProgram()
// }

// function createWatchOfConfigFile() {}
