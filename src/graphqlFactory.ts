import { Auto, Usage } from "./globals";

export function graphqlFactory<T extends object>(fetchGraphqlQuery: (query: string) => any) {
    const obj = {} as TransformMethods<T>;
    return new Proxy<TransformMethods<T>>(obj, {
        get(target, prop: never) {
            const fn = target[prop];
            if (fn) return fn;
            target[prop] = function(params: {}, query: {}) {
                if (arguments.length === 1) {
                    query = params;
                    params = undefined!;
                }
                const queryS = toGraphQLQuery({[prop]: params ? {__args: params, body: query} : query});
                return fetchGraphqlQuery(queryS).data[prop];
            } as never;
            return target[prop];
        },
    });
}

function toGraphQLQuery(query: any): string {
    let s = '';
    if (typeof query === 'object' && query !== null) {
        if (query instanceof Array) return toGraphQLQuery(query[0]);
        if (query.__args) {
            s += '(';
            for (const arg in query.__args) {
                s += `${arg}:${JSON.stringify(query.__args[arg])}`;
            }
            s += ')' + toGraphQLQuery(query.body);
            return s;
        }
        s += `{`;
        let i = 0;
        for (const key in query) {
            const val = query[key];
            if (key === '__on') {
                for (const typeName in val) {
                    s += `...on ${typeName}${toGraphQLQuery(val[typeName])}`;
                }
                continue;
            }
            s += `${i > 0 ? ',' : ''}${key}${toGraphQLQuery(val)}`;
            i++;
        }
        s += `}`;
    }
    return s;
}

export interface Method<Args extends any[], Ret> {
    (...args: Args): never;
    <T extends Auto>(...args: Args): Ret;
    <T extends string>(...args: Args): Usage<Ret, T>;
}
export type TransformMethods<T> = {[K in keyof T]: T[K] extends (...args: infer Args) => infer Ret ? Method<Args, Ret> : T[K]};
