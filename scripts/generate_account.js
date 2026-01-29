import {registerWithEmail} from '../services/auth.service.js';

const a = await registerWithEmail('apple@bluefenix.io', '123123');

console.log(a);