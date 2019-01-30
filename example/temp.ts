import { showUserName } from './hey';
import { Product, Guest, User, getProduct, getProductAsync } from './schema';

// var product = getProduct(usage<Product>());
var product = getProduct<Auto>();

// var product = usage<Product>();
// var product = usage<Id<Product, 'foo'>>();

product.users.map(user => user.__typename === 'Guest' && outGust(user));
product.users.map(user => outUser(user));
// product.users.map(outUser);
// showUsers(product.users);
function outGust(user: Guest) {
    if (user.__typename === 'Guest') {
        user.displayName;
    }
}

// function showUsers(users: Usage<(User | Guest), 'showUsers'>[]) {
//     users.map(user => {
//         if (user.__typename === 'Guest') {
//             user.displayName;
//         }
//     });
// }

async function main() {
    // const p = await getProductAsync<Auto>();
    // p.name;
}
abstract class Base {
    async use() {
        // const res = await this.send();
        // res.name;
    }
    abstract send(): Promise<Product>;
}
class ProductForm extends Base {
     async send() {
        return getProductAsync<Auto>();
    }
}

async function use() {
    var x = await new ProductForm().send();
    x.name;
}

function getProductPromise() {}

function outUser(user: User | Guest) {
    if (user.__typename === 'Guest') {
        user.displayName;
    } else {
        user.avatar;
        showUserName(user);
    }
}

// declare var usage: unknown;
declare function usage<T>(): T;
