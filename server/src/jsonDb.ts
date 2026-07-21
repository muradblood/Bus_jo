import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// On Vercel the filesystem is read-only except /tmp.
// Locally, data is stored in a data/ directory under the server working directory.
const DATA_DIR = process.env.VERCEL
  ? '/tmp/bus_jo_data'
  : join(process.cwd(), 'data');

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readCollection<T>(name: string): T[] {
  ensureDataDir();
  const file = join(DATA_DIR, `${name}.json`);
  if (!existsSync(file)) return [];
  try {
    const data = JSON.parse(readFileSync(file, 'utf-8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeCollection<T>(name: string, data: T[]): void {
  ensureDataDir();
  writeFileSync(join(DATA_DIR, `${name}.json`), JSON.stringify(data, null, 2), 'utf-8');
}

function getNextId(items: Array<{ id: number }>): number {
  if (items.length === 0) return 1;
  return Math.max(...items.map((i) => i.id)) + 1;
}

type WhereClause = Record<string, unknown>;
type OrderByClause = Record<string, 'asc' | 'desc'>;

function matchesWhere(item: Record<string, unknown>, where: WhereClause): boolean {
  for (const [key, value] of Object.entries(where)) {
    if (key === 'OR') {
      const clauses = value as WhereClause[];
      if (!clauses.some((c) => matchesWhere(item, c))) return false;
      continue;
    }
    if (key === 'AND') {
      const clauses = value as WhereClause[];
      if (!clauses.every((c) => matchesWhere(item, c))) return false;
      continue;
    }

    // Composite unique key: key not in item, value is a plain object
    // e.g. fromCity_toCity: { fromCity: 'X', toCity: 'Y' }
    if (!(key in item) && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const composite = value as Record<string, unknown>;
      for (const [k, v] of Object.entries(composite)) {
        if (item[k] !== v) return false;
      }
      continue;
    }

    const itemValue = item[key];

    // Range / comparison operators: { gte, lte, gt, lt }
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const ops = value as Record<string, unknown>;
      if ('gte' in ops) {
        const threshold = ops.gte instanceof Date ? ops.gte : new Date(ops.gte as string);
        const d = new Date(itemValue as string);
        if (isNaN(d.getTime()) || d < threshold) return false;
        continue;
      }
      if ('lte' in ops) {
        const threshold = ops.lte instanceof Date ? ops.lte : new Date(ops.lte as string);
        const d = new Date(itemValue as string);
        if (isNaN(d.getTime()) || d > threshold) return false;
        continue;
      }
      if ('gt' in ops) {
        const threshold = ops.gt instanceof Date ? ops.gt : new Date(ops.gt as string);
        const d = new Date(itemValue as string);
        if (isNaN(d.getTime()) || d <= threshold) return false;
        continue;
      }
      if ('lt' in ops) {
        const threshold = ops.lt instanceof Date ? ops.lt : new Date(ops.lt as string);
        const d = new Date(itemValue as string);
        if (isNaN(d.getTime()) || d >= threshold) return false;
        continue;
      }
    }

    if (itemValue !== value) return false;
  }
  return true;
}

function applyOrderBy<T>(items: T[], orderBy: OrderByClause): T[] {
  const sorted = [...items];
  const entries = Object.entries(orderBy);
  if (entries.length === 0) return sorted;
  const [key, dir] = entries[0];
  sorted.sort((a, b) => {
    const aVal = (a as Record<string, unknown>)[key];
    const bVal = (b as Record<string, unknown>)[key];
    let cmp = 0;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      const aDate = new Date(aVal);
      const bDate = new Date(bVal);
      if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
        cmp = aDate.getTime() - bDate.getTime();
      } else {
        cmp = aVal.localeCompare(bVal);
      }
    } else if (typeof aVal === 'number' && typeof bVal === 'number') {
      cmp = aVal - bVal;
    }
    return dir === 'desc' ? -cmp : cmp;
  });
  return sorted;
}

export class JsonCollection<T extends { id: number | string }> {
  constructor(private readonly collectionName: string) {}

  private read(): T[] {
    return readCollection<T>(this.collectionName);
  }

  private write(data: T[]): void {
    writeCollection<T>(this.collectionName, data);
  }

  count(options?: { where?: WhereClause }): number {
    const items = this.read();
    if (!options?.where) return items.length;
    return items.filter((i) => matchesWhere(i as Record<string, unknown>, options.where!)).length;
  }

  findUnique(options: { where: WhereClause }): T | null {
    const items = this.read();
    return (
      items.find((i) => matchesWhere(i as Record<string, unknown>, options.where)) ?? null
    );
  }

  findFirst(options?: { where?: WhereClause; orderBy?: OrderByClause }): T | null {
    let items = this.read();
    if (options?.where) {
      items = items.filter((i) => matchesWhere(i as Record<string, unknown>, options.where!));
    }
    if (options?.orderBy) items = applyOrderBy(items, options.orderBy);
    return items[0] ?? null;
  }

  findMany(options?: { where?: WhereClause; orderBy?: OrderByClause; take?: number }): T[] {
    let items = this.read();
    if (options?.where) {
      items = items.filter((i) => matchesWhere(i as Record<string, unknown>, options.where!));
    }
    if (options?.orderBy) items = applyOrderBy(items, options.orderBy);
    if (options?.take !== undefined) items = items.slice(0, options.take);
    return items;
  }

  create(options: { data: Record<string, unknown> }): T {
    const items = this.read();
    const now = new Date().toISOString();
    const d = options.data as Record<string, unknown>;
    const newItem = {
      ...d,
      id: d.id !== undefined ? d.id : getNextId(items as Array<{ id: number }>),
      createdAt: d.createdAt ?? now,
      updatedAt: now,
    } as unknown as T;
    items.push(newItem);
    this.write(items);
    return newItem;
  }

  update(options: { where: WhereClause; data: Record<string, unknown> }): T {
    const items = this.read();
    const now = new Date().toISOString();
    let found = false;
    let updated!: T;

    const newItems = items.map((item) => {
      if (matchesWhere(item as Record<string, unknown>, options.where)) {
        found = true;
        updated = {
          ...(item as Record<string, unknown>),
          ...options.data,
          updatedAt: now,
        } as unknown as T;
        return updated;
      }
      return item;
    });

    if (!found) throw new Error(`Record not found in ${this.collectionName}`);
    this.write(newItems);
    return updated;
  }

  updateMany(options: { where?: WhereClause; data: Record<string, unknown> }): { count: number } {
    const items = this.read();
    const now = new Date().toISOString();
    let count = 0;

    const newItems = items.map((item) => {
      if (!options.where || matchesWhere(item as Record<string, unknown>, options.where)) {
        count++;
        return {
          ...(item as Record<string, unknown>),
          ...options.data,
          updatedAt: now,
        } as unknown as T;
      }
      return item;
    });

    this.write(newItems);
    return { count };
  }

  upsert(options: {
    where: WhereClause;
    create: Record<string, unknown>;
    update: Record<string, unknown>;
  }): T {
    const existing = this.findUnique({ where: options.where });
    if (existing) return this.update({ where: options.where, data: options.update });
    return this.create({ data: options.create });
  }

  delete(options: { where: WhereClause }): T {
    const items = this.read();
    let deleted: T | null = null;

    const newItems = items.filter((item) => {
      if (matchesWhere(item as Record<string, unknown>, options.where)) {
        deleted = item;
        return false;
      }
      return true;
    });

    if (!deleted) throw new Error(`Record not found in ${this.collectionName}`);
    this.write(newItems);
    return deleted;
  }

  deleteMany(options?: { where?: WhereClause }): { count: number } {
    const items = this.read();
    let count = 0;

    const newItems = items.filter((item) => {
      if (!options?.where || matchesWhere(item as Record<string, unknown>, options.where)) {
        count++;
        return false;
      }
      return true;
    });

    this.write(newItems);
    return { count };
  }

  aggregate(options: { _sum?: Record<string, boolean> }): { _sum: Record<string, number | null> } {
    const items = this.read();
    const result: { _sum: Record<string, number | null> } = { _sum: {} };

    if (options._sum) {
      for (const [field, include] of Object.entries(options._sum)) {
        if (include) {
          const sum = items.reduce((acc, item) => {
            const val = (item as Record<string, unknown>)[field];
            const num = typeof val === 'number' ? val : parseFloat(String(val ?? '0'));
            return acc + (isNaN(num) ? 0 : num);
          }, 0);
          result._sum[field] = sum;
        }
      }
    }

    return result;
  }
}
