export const enum TypeKind {
    Primitive = 'Primitive',
    Object = 'Object',
    Union = 'Union',
    Array = 'Array',
}

export type Type = NonPrimitiveType | PrimitiveType;
export type NonPrimitiveType = ObjectType | UnionType | ArrayType;

interface BaseType {
    id: string;
    used: boolean;
    aliases: Set<Type>;
    // raw: string;
}

export interface ObjectType extends BaseType {
    kind: TypeKind.Object;
    typename: string | undefined;
    root: boolean;
    members: { [key: string]: Type };
}

export interface PrimitiveType extends BaseType {
    kind: TypeKind.Primitive;
    value: string;
}

export interface UnionType extends BaseType {
    kind: TypeKind.Union;
    members: { [key: string]: Type };
    union: ObjectType[];
}

export interface ArrayType extends BaseType {
    kind: TypeKind.Array;
    elementType: ObjectType | UnionType;
}

export function createRegistry() {
    const typeRegistry: { [key: string]: NonPrimitiveType } = {};
    return {
        add,
        get,
        getRoots,
        getAll,
        typeRegistry,
    };

    function add(type: NonPrimitiveType) {
        if (typeRegistry[type.id]) throw never();
        typeRegistry[type.id] = type;
        return type;
    }

    function get(id: string) {
        return typeRegistry[id];
    }

    function getRoots() {
        const roots: ObjectType[] = [];
        for (const key in typeRegistry) {
            const type = typeRegistry[key];
            if (type.kind === TypeKind.Object && type.root) {
                roots.push(type);
            }
        }
        return roots;
    }
    function getAll() {
        const types: NonPrimitiveType[] = [];
        for (const key in typeRegistry) {
            types.push(typeRegistry[key]);
        }
        return types;
    }
}

export function addMember(parentType: Type, key: string, value: Type) {
    if (parentType.kind !== TypeKind.Object && parentType.kind !== TypeKind.Union) throw never();
    let member = parentType.members[key];
    if (!member) {
        member = parentType.members[key] = value;
    }
    return member;
}

export function mergeTypes(type: Type, targetType: Type, usedTypes: Set<Type>): Type {
    if (type !== targetType) targetType.aliases.add(type);
    if (type.used || targetType.used) {
        // type.used = true;
        targetType.used = true;
        usedTypes.add(type);
        usedTypes.add(targetType);
    }
    // if (type.used) {
    // targetType.used = true;
    // parents.forEach(parent => {
    //     parent.used = true;
    // });
    // } else if (targetType.used) type.used = true;
    if (type.kind === TypeKind.Union || type.kind === TypeKind.Object) {
        if (targetType.kind !== type.kind) throw never();
        for (const key in type.members) {
            const member = type.members[key];
            const targetMember = targetType.members[key] || member;
            mergeTypes(member, targetMember, usedTypes);
        }
    }

    if (type.kind === TypeKind.Object) {
        if (targetType.kind !== type.kind) throw never();
        if (type.typename !== targetType.typename) throw never();
    }
    if (type.kind === TypeKind.Union) {
        if (targetType.kind !== type.kind) throw never();
        if (targetType.union.length !== type.union.length) throw never();
        for (let i = 0; i < type.union.length; i++) {
            const element = type.union[i];
            const targetElement = targetType.union[i];
            mergeTypes(element, targetElement, usedTypes);
        }
    }
    if (type.kind === TypeKind.Array) {
        if (targetType.kind !== type.kind) throw never();
        mergeTypes(type.elementType, targetType.elementType, usedTypes);
    }

    type.aliases.forEach(alias => {
        mergeTypes(alias, alias, usedTypes);
        mergeTypes(alias, targetType, usedTypes);
    });
    return targetType;
}

// function addToUsage(type: Type, usedTypes: Set<Type>) {
//     if (type.kind !== TypeKind.Primitive) usedTypes.add(type);
//     type.aliases.forEach(alias => addToUsage(alias, usedTypes));
// }
export function toObject(type: Type, usedTypes: Set<Type>): {} {
    if (type.kind === TypeKind.Primitive) {
        return type.value;
    }
    if (type.kind === TypeKind.Array) {
        return [toObject(type.elementType, usedTypes)];
    }
    if (type.kind === TypeKind.Object || type.kind === TypeKind.Union) {
        const obj: { [key: string]: any } = {};
        for (const key in type.members) {
            const member = type.members[key];
            if (member.used && usedTypes.has(member)) {
                obj[key] = toObject(member, usedTypes);
            }
        }
        if (type.kind === TypeKind.Union) {
            for (const element of type.union) {
                if (element.used && usedTypes.has(element)) {
                    if (!obj.__on) obj.__on = {};
                    if (element.typename) {
                        obj.__on[element.typename] = toObject(element, usedTypes);
                    }
                }
            }
        }
        return obj;
    }
    throw never(type);
}

export function never(n?: never) {
    debugger;
    throw new Error('Never');
}

export function nonNull<T>(val: T | null | undefined): T {
    if (val === null || val === undefined) throw never();
    return val;
}
