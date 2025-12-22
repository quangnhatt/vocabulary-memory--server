import dotenv from "dotenv";
import jwt from 'jsonwebtoken';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = '7d';

export function signAuthToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: EXPIRES_IN,
  });
}

export function verifyAuthToken(token) {
  return jwt.verify(token, JWT_SECRET);
}