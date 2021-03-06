export interface User {
    __typename: 'User';
    avatar: string;
    firstName: string;
    lastName: string;
}

export interface Guest {
    __typename: 'Guest';
    displayName: string;
}

export interface Product {
    __typename: 'Product';
    name: string;
    users: (User | Guest)[];
}

export declare function getProduct<T>(): T extends Auto ? Product : Usage<Product, T>;
export declare function getProduct<T>(query: T): T;

export declare function getProductAsync<T>(): T extends Auto ? Promise<Product> : Promise<Usage<Product, T>>;
export declare function getProductAsync<T>(query: T): Promise<T>;
