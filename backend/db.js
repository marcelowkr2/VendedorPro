/**
 * db.js — Camada de persistência (JSON local)
 * Substitui um banco de dados SQL. Em produção troque por PostgreSQL/MySQL.
 * Estrutura: { users, products, customers, orders, order_items, stock_moves }
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');
const DB_FILE = join(DATA_DIR, 'db.json');

// Garante pasta de dados
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const DEFAULT_DB = {
  users: [
    {
      id: 'u-admin-001',
      name: 'Administrador',
      email: 'admin@saasvendas.com',
      passwordHash: '',
      role: 'admin',
      active: true,
      mustChangePassword: false,
      createdAt: new Date().toISOString(),
    },
  ],
  products: [],
  customers: [],
  orders: [],
  order_items: [],
  stock_moves: [],
  settings: {
    lowStockThreshold: 5,
    taxRate: 0.0,
  },
};

function load() {
  if (!existsSync(DB_FILE)) {
    writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
    return structuredClone(DEFAULT_DB);
  }
  try {
    return JSON.parse(readFileSync(DB_FILE, 'utf-8'));
  } catch {
    writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
    return structuredClone(DEFAULT_DB);
  }
}

function atomicWrite(obj) {
  const tmp = DB_FILE + '.tmp';
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf-8');
  renameSync(tmp, DB_FILE);
}

// Singleton em memória para performance + escrita controlada
let _db = load();
let _dirty = false;
let _timer = null;

function flush() {
  if (!_dirty) return;
  _dirty = false;
  atomicWrite(_db);
}

function scheduleFlush() {
  _dirty = true;
  if (_timer) return;
  _timer = setTimeout(flush, 200);
}

// Força escrita imediata (útil em operações críticas)
function flushSync() {
  if (_timer) { clearTimeout(_timer); _timer = null; }
  if (_dirty) {
    atomicWrite(_db);
    _dirty = false;
  }
}

function get() { return _db; }

function update(mutator) {
  mutator(_db);
  scheduleFlush();
}

// Helpers de ID
function uid(prefix) {
  return prefix + '-' + crypto.randomBytes(6).toString('hex');
}

export { get, update, flushSync, uid, DB_FILE };