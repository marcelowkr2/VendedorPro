/**
 * auth.js — Autenticação com módulos nativos do Node (sem dependências)
 * - Senhas: PBKDF2 com SHA-256 (crypto.pbkdf2Sync)
 * - Tokens: JWT-like assinado com HMAC-SHA256 (crypto.createHmac)
 */
import crypto from 'node:crypto';
import { get, update, flushSync, uid } from './db.js';

const ALGO = 'sha256';
const ITER = 100_000;
const KEY_LEN = 64;
const SALT_LEN = 16;
const TOKEN_TTL = 8 * 60 * 60; // 8h
const SECRET = process.env.JWT_SECRET || 'saas-vendas-dev-secret-change-in-prod';

// --- Senhas ---
export function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LEN).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITER, KEY_LEN, ALGO).toString('hex');
  return `${salt}:${ITER}:${KEY_LEN}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored) return false;
  const [salt, iterStr, keyLenStr, hash] = stored.split(':');
  const iter = parseInt(iterStr, 10);
  const keyLen = parseInt(keyLenStr, 10);
  if (!salt || !iter || !keyLen || !hash) return false;
  const check = crypto.pbkdf2Sync(password, salt, iter, keyLen, ALGO).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(check));
}

// --- Tokens (HMAC-SHA256) ---
function b64url(str) {
  return Buffer.from(str).toString('base64url');
}

function b64urlDecode(str) {
  return Buffer.from(str, 'base64url').toString('utf-8');
}

export function signToken(payload) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({
    ...payload,
    exp: Date.now() + TOKEN_TTL * 1000,
    iat: Date.now(),
  }));
  const sig = crypto
    .createHmac(ALGO, SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = crypto
    .createHmac(ALGO, SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(b64urlDecode(body));
    if (data.exp && Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

// --- Operações de auth ---
export function seedAdmin() {
  const db = get();
  const admin = db.users.find(u => u.email === 'admin@saasvendas.com');
  if (admin && !admin.passwordHash) {
    admin.passwordHash = hashPassword('Admin@123');
    admin.mustChangePassword = true;
    flushSync();
  }
}

export function authenticate(email, password) {
  const db = get();
  const user = db.users.find(u => u.email === email.toLowerCase().trim());
  if (!user || !user.active) return { ok: false, reason: 'invalid' };
  if (!verifyPassword(password, user.passwordHash)) return { ok: false, reason: 'invalid' };
  return { ok: true, user };
}

export function register({ name, email, password, role = 'vendas' }) {
  const db = get();
  if (!name || !email || !password) return { ok: false, reason: 'missing' };
  if (password.length < 6) return { ok: false, reason: 'weak' };
  if (db.users.find(u => u.email === email.toLowerCase().trim())) {
    return { ok: false, reason: 'exists' };
  }
  const user = {
    id: uid('u'),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash: hashPassword(password),
    role,
    active: true,
    mustChangePassword: false,
    createdAt: new Date().toISOString(),
  };
  update((d) => d.users.push(user));
  return { ok: true, user };
}

export function changePassword(userId, oldPass, newPass) {
  const db = get();
  const user = db.users.find(u => u.id === userId);
  if (!user) return { ok: false, reason: 'notfound' };
  if (!verifyPassword(oldPass, user.passwordHash)) return { ok: false, reason: 'wrong' };
  if (newPass.length < 6) return { ok: false, reason: 'weak' };
  user.passwordHash = hashPassword(newPass);
  user.mustChangePassword = false;
  flushSync();
  return { ok: true };
}

export function listUsers() {
  const db = get();
  return db.users.map(({ passwordHash, ...u }) => u);
}

export function toggleUser(userId, active) {
  const db = get();
  const user = db.users.find(u => u.id === userId);
  if (!user) return false;
  user.active = active;
  flushSync();
  return true;
}