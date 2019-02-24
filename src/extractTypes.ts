import {relative, resolve, dirname} from 'path';
import * as ts from 'typescript';
import {config} from './config';
import {addMember, createRegistry, mergeTypes, never, nonNull, ObjectType, toObject, Type, TypeKind} from './vtype';

declare module 'typescript' {
    interface TypeChecker {
        isArrayLikeType(arrayType: ts.Type): arrayType is ts.TypeReference;
    }
}

export function extractor() {
    const registry = createRegistry();

    function getTypeFromNode(
        checker: ts.TypeChecker,
        node: ts.Expression,
        contextual: boolean,
        createIfNotFound = false,
    ) {
        const type = (contextual && checker.getContextualType(node)) || checker.getTypeAtLocation(node);
        return createIfNotFound ? _getType(checker, type) : getType(checker, type);
    }

    function _getType(checker: ts.TypeChecker, t: ts.Type): Type {
        return (
            getType(checker, t) || {
                id: checker.typeToString(t),
                kind: TypeKind.Primitive,
                aliases: new Set(),
                used: false,
                value: t.isStringLiteral() ? t.value : checker.typeToString(t),
            }
        );
    }

    function isIdType(type: ts.Type) {
        if (type.aliasSymbol && type.aliasSymbol.name === config.type.Usage && type.aliasTypeArguments) {
            const [subType, idType] = type.aliasTypeArguments;
            return subType.isClassOrInterface();
        }
        return false;
    }

    function getType(checker: ts.TypeChecker, nullableType: ts.Type): Type | undefined {
        if (nullableType.symbol && nullableType.symbol.name === 'Promise') {
            return getType(checker, (nullableType as ts.TypeReference).typeArguments![0]);
        }
        const type = checker.getNonNullableType(nullableType);
        if (
            checker.isArrayLikeType(type) &&
            type.flags !== ts.TypeFlags.Any &&
            type.flags !== ts.TypeFlags.Never &&
            type.typeArguments &&
            type.typeArguments.length > 0
        ) {
            const arg = type.typeArguments[0];
            if ((arg.isUnion() && isIdType(arg.types[0])) || isIdType(arg)) {
                const id = checker.typeToString(type);
                const existType = registry.get(id);
                if (existType) return existType;

                const elementType = _getType(checker, nonNull(type.typeArguments)[0]);
                if (elementType.kind !== TypeKind.Object && elementType.kind !== TypeKind.Union) throw never();
                return registry.add({
                    id,
                    kind: TypeKind.Array,
                    aliases: new Set(),
                    used: false,
                    elementType: elementType,
                });
            }
        }

        // if (ts.isRefer)

        if (type.isUnion()) {
            const id = checker.typeToString(type);
            const existType = registry.get(id);
            if (existType) return existType;

            const subTypes: ObjectType[] = [];
            for (const subType of type.types) {
                if (isIdType(subType)) {
                    const subT = _getType(checker, subType);
                    if (subT.kind === TypeKind.Object) {
                        subTypes.push(subT);
                    }
                }
            }
            if (subTypes.length > 0) {
                const members: {[key: string]: Type} = {};
                for (const prop of type.getProperties()) {
                    const propType = checker.getTypeOfSymbolAtLocation(prop, prop.declarations[0]);
                    members[prop.name] = _getType(checker, propType);
                }
                return registry.add({
                    id,
                    kind: TypeKind.Union,
                    aliases: new Set(),
                    members: members,
                    used: false,
                    union: subTypes,
                });
            }
        }

        if (isIdType(type)) {
            const id = checker.typeToString(type);
            const existType = registry.get(id);
            if (existType) return existType;

            const members: ObjectType['members'] = {};
            for (const prop of type.getProperties()) {
                const propType = checker.getTypeOfSymbolAtLocation(prop, prop.declarations[0]);
                members[prop.name] = _getType(checker, propType);
            }
            const typename = members.__typename;
            return registry.add({
                id,
                kind: TypeKind.Object,
                aliases: new Set(),
                members: members,
                root: false,
                used: false,
                typename: typename && typename.kind === TypeKind.Primitive ? typename.value : undefined,
            });
        }
    }

    function usageCollector(node: ts.Node, checker: ts.TypeChecker) {
        function addAlias(node: ts.Expression, target: ts.Expression) {
            const type = getTypeFromNode(checker, node, true);
            if (type) {
                type.used = true;
                const targetType = getTypeFromNode(checker, target, false);
                if (targetType) {
                    targetType.used = true;
                    if (type !== targetType) {
                        targetType.aliases.add(type);
                    }
                }
            }
        }
        // console.log(ts.SyntaxKind[node.kind]);
        if (ts.isPropertyAccessExpression(node)) {
            // console.log('prop access', node.name.text);
            // if (node.name.text === 'id') debugger;
            const expr = getTypeFromNode(checker, node.expression, false);
            if (expr) {
                expr.used = true;
                if (expr.kind !== TypeKind.Array) {
                    // console.log('a.b: ', node.name.text);
                    const key = addMember(
                        expr,
                        node.name.text,
                        nonNull(getTypeFromNode(checker, node.name, true, true)),
                    );
                    key.used = true;
                }
            }
        }
        if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
            addAlias(node.left, node.right);
        }
        if (ts.isVariableDeclaration(node) && node.initializer && ts.isIdentifier(node.name)) {
            addAlias(node.name, node.initializer);
        }
        if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)) {
            addAlias(node.name, node.initializer);
        }
        if (
            ts.isJsxAttribute(node) &&
            node.initializer &&
            ts.isJsxExpression(node.initializer) &&
            node.initializer.expression
        ) {
            addAlias(node.name, node.initializer.expression);
        }
        if (ts.isCallExpression(node)) {
            const signature = checker.getResolvedSignature(node);
            if (signature) {
                if (node.typeArguments) {
                    const typeArg: ts.TypeNode | undefined = node.typeArguments[0];
                    if (
                        typeArg &&
                        ts.isLiteralTypeNode(typeArg) &&
                        ts.isStringLiteral(typeArg.literal) &&
                        typeArg.literal.text.substr(0, config.type.idPrefix.length) === config.type.idPrefix
                    ) {
                        const type = signature.getReturnType();
                        const t = nonNull(getType(checker, type));
                        if (t.kind !== TypeKind.Object) throw never();
                        t.used = true;
                        t.root = true;
                    }
                }

                node.arguments.forEach((arg, i) => {
                    const argType = getTypeFromNode(checker, arg, false);
                    if (!argType) return;
                    argType.used = true;
                    const fnParameter = signature.parameters[i];
                    if (fnParameter) {
                        const paramType = checker.getTypeOfSymbolAtLocation(fnParameter, fnParameter.declarations[0]);
                        const paramT = getType(checker, paramType);
                        if (paramT) {
                            paramT.used = true;
                            if (argType !== paramT) {
                                argType.aliases.add(paramT);
                            }
                        }
                    } else {
                        console.log(`Cannot find parameter ${i}`);
                    }
                });
            }
        }
        ts.forEachChild(node, n => usageCollector(n, checker));
    }

    const usedTypes = new Set<Type>();
    return {
        roots: () =>
            registry
                .getRoots()
                .map(type => ({type: type, obj: toObject(mergeTypes(type, type, usedTypes), usedTypes)})),
        registry,
        getNonUsedTypes() {
            // console.log(registry.typeRegistry);
            // console.log(usedTypes);
            const nonUsedTypes = registry.getAll().filter(type => type.used && !usedTypes.has(type));
            nonUsedTypes.forEach(type => {
                console.error(`type ${type.id} is not used`);
            });
        },
        usageCollector,
    };
}

export function getId(sourceFile: ts.SourceFile, node: ts.Node, projectDir: string) {
    const {line, character} = ts.getLineAndCharacterOfPosition(sourceFile, node.pos);
    return config.type.idPrefix + `${relative(projectDir, sourceFile.fileName)}:${line}:${character}`;
}

// const checker = program.getTypeChecker();

// const rootNames = ['./test.tsx'];
// const program = ts.createProgram({
//     options: { skipLibCheck: true },
//     rootNames,
// });

// program.emit(undefined, undefined, undefined, undefined, {
//     before: [transformer],
// });

// createFile();

// function createFile() {
//     let s = '';
//     for (const root of getRoots()) {
//         s += `module.exports['${root.id}'] = ` + JSON.stringify(toObject(root)) + ';\n';
//     }
//     writeFileSync('./types.js', s);
// }

// interface X {
//     name: 'string';
// }
