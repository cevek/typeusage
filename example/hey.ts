import { User } from './schema';

export function showUserName(user: User) {
    console.log(user.firstName);
}
