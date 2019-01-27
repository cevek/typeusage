// import React = require('react');

// export type Id<T, N> = { [K in keyof T]: Id<T[K], N & K> };

// // interface SettingsArgs {
// //     value?: {
// //         asDate?: boolean;
// //     };
// // }
// // interface Settings {
// //     key: string;
// //     value: string;
// // }

// // interface UserArgs {
// //     friends?: {
// //         limit: 10;
// //         orderBy: number;
// //         _?: UserArgs;
// //     };
// //     settings?: { all?: boolean; _?: SettingsArgs };
// // }
// interface User {
//     __typename: 'User';
//     // name: string;
//     avatar: string;
//     // login: string;
//     // friends: User[];
//     // settings: Settings;
// }

// // interface QueryArgs {
// //     me: { id?: number; _?: UserArgs };
// // }
// // interface Query {
// //     me: User;
// // }

// // // type GetArg<T> = T extends {__args: any} ? T['__args'] : never;
// // // type GetChildArgs<T> = {[P in keyof T]: GetArg<T[P]>}

// // function getMe(args: QueryArgs['me']): Query['me'] {
// //     return null!;
// // }

// // getMe({ id: 1, _: { settings: { all: true, _: { value: { asDate: true } } } } }).friends[0].friends[0].friends;

// interface Guest {
//     __typename: 'Guest';
//     // name: {
//     //     login: string;
//     // };
//     displayName: string;
//     // registeredAt: string;
// }

// interface Product {
//     __typename: 'Product';
//     // user: User | Guest;
//     users: (User | Guest)[]
//     // name: string;
// }

// var product!: Id<Product, 'product'>;
// product.users

// // var u = product.users[0];
// // if (u.__typename === 'Guest') {
// //     u.displayName;
// // }
// product.users.map(user => {
//     if (user.__typename === 'Guest') {
//         user.displayName;
//     }
// });


// // product.user.name;
// // if (product.user.__typename === 'Guest') {
// //     product.user.displayName;
// //     product.user.name.login;
// // } else {
// //     product.user.login;
// //     // product.user.friends[0].friends[0].friends[0].login;
// //     product.user.name;
// //     product.name;
// //     // product.user.friends[0].login
// //     product.__typename;
// // }

// usage<Id<Product, 'product'>>();

// // interface Foo {
// //     a: {
// //         b: number;
// //     };
// //     d: { aa: 1 }[];
// //     z: {
// //         y: {
// //             x: 1;
// //             x6: 4;
// //             e: 5;
// //             f: 6;
// //         };
// //     };
// // }

// // usage<Id<Foo, 1>>();
// function usage<T>() {}

// // declare var x: Id<Foo, 1>;
// // declare var y: Id<Foo, 2>;
// // var xa = x.a;
// // var ya = y.a;
// // x.z.y.e;
// // x.z.y.f;
// // x.d[0].aa;

// // // type F = 'a' | 'b' | 1

// // x.d.map(x => {
// //     x.aa;
// // });

// // var xab = xa.b;
// // var yb = ya.b;

// // var za = ya;

// // type XXX = {
// //     foo: Id<Foo, 'XXX'>;
// // };
// // function g(): XXX {
// //     return {
// //         foo: y,
// //     };
// // }
// // g();

// // function Bar(foo: Id<Foo, 'Bar'>) {
// //     console.log(foo.a.b);
// // }

// // Bar(x);

// // function BarCmp(props: { foood: Id<Foo, 'BarCmp'> }) {
// //     props.foood.z.y.x6;
// //     return null;
// // }

// // <BarCmp foood={x} />;
