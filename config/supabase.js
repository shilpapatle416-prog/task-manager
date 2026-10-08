const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

const isConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseKey) &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseUrl.includes('your-supabase-');

// In-Memory Database store for offline/local development & testing
const memoryStore = {
  users: [],
  tasks: []
};

class MemoryQueryBuilder {
  constructor(table) {
    this.table = table;
    this.mode = 'select';
    this.columns = '*';
    this.countOption = null;
    this.headOnly = false;
    this.payload = null;
    this.filters = [];
    this.sorts = [];
    this.rangeFrom = null;
    this.rangeTo = null;
    this.limitCount = null;
    this.isSingle = false;
    this.isMaybeSingle = false;
  }

  select(columns = '*', options = {}) {
    if (this.mode !== 'insert' && this.mode !== 'update' && this.mode !== 'delete') {
      this.mode = 'select';
    }
    this.columns = columns;
    if (options.count) this.countOption = options.count;
    if (options.head) this.headOnly = Boolean(options.head);
    return this;
  }

  insert(values) {
    this.mode = 'insert';
    this.payload = values;
    return this;
  }

  update(values) {
    this.mode = 'update';
    this.payload = values;
    return this;
  }

  delete() {
    this.mode = 'delete';
    return this;
  }

  eq(col, val) {
    this.filters.push((row) => {
      const v = row[col];
      if (typeof val === 'string' && typeof v === 'string' && col.toLowerCase().includes('email')) {
        return v.toLowerCase() === val.toLowerCase();
      }
      return String(v) === String(val);
    });
    return this;
  }

  neq(col, val) {
    this.filters.push((row) => {
      const v = row[col];
      return String(v) !== String(val);
    });
    return this;
  }

  lt(col, val) {
    this.filters.push((row) => {
      const v = row[col];
      if (v === null || v === undefined) return false;
      const d1 = new Date(v).getTime();
      const d2 = new Date(val).getTime();
      return !isNaN(d1) && !isNaN(d2) ? d1 < d2 : v < val;
    });
    return this;
  }

  lte(col, val) {
    this.filters.push((row) => {
      const v = row[col];
      if (v === null || v === undefined) return false;
      const d1 = new Date(v).getTime();
      const d2 = new Date(val).getTime();
      return !isNaN(d1) && !isNaN(d2) ? d1 <= d2 : v <= val;
    });
    return this;
  }

  gt(col, val) {
    this.filters.push((row) => {
      const v = row[col];
      if (v === null || v === undefined) return false;
      const d1 = new Date(v).getTime();
      const d2 = new Date(val).getTime();
      return !isNaN(d1) && !isNaN(d2) ? d1 > d2 : v > val;
    });
    return this;
  }

  gte(col, val) {
    this.filters.push((row) => {
      const v = row[col];
      if (v === null || v === undefined) return false;
      const d1 = new Date(v).getTime();
      const d2 = new Date(val).getTime();
      return !isNaN(d1) && !isNaN(d2) ? d1 >= d2 : v >= val;
    });
    return this;
  }

  not(col, operator, val) {
    if (operator === 'is' && val === null) {
      this.filters.push((row) => row[col] !== null && row[col] !== undefined);
    }
    return this;
  }

  or(filterStr) {
    const conditions = filterStr.split(',').map((part) => part.trim());
    this.filters.push((row) => {
      return conditions.some((cond) => {
        const [column, op, rawPattern] = cond.split('.');
        if (op === 'ilike' && column && rawPattern) {
          const needle = decodeURIComponent(rawPattern.replace(/%/g, '')).toLowerCase();
          const rowVal = String(row[column] || '').toLowerCase();
          return rowVal.includes(needle);
        }
        return false;
      });
    });
    return this;
  }

  order(col, options = {}) {
    const ascending = options.ascending !== false;
    this.sorts.push({ col, ascending, nullsFirst: Boolean(options.nullsFirst) });
    return this;
  }

  range(from, to) {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }

  limit(count) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this._execute();
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this._execute();
  }

  async _execute() {
    const tableData = memoryStore[this.table] || [];

    if (this.mode === 'insert') {
      const records = Array.isArray(this.payload) ? this.payload : [this.payload];
      const inserted = records.map((rec) => {
        const item = {
          id: rec.id || crypto.randomUUID(),
          ...rec,
          created_at: rec.created_at || new Date().toISOString(),
          updated_at: rec.updated_at || new Date().toISOString()
        };
        tableData.push(item);
        return { ...item };
      });

      const result = Array.isArray(this.payload) ? inserted : inserted[0];
      return { data: result, error: null };
    }

    if (this.mode === 'update') {
      let updatedCount = 0;
      let lastUpdated = null;
      for (const row of tableData) {
        const matches = this.filters.every((f) => f(row));
        if (matches) {
          Object.assign(row, this.payload, { updated_at: new Date().toISOString() });
          lastUpdated = { ...row };
          updatedCount++;
        }
      }
      return {
        data: this.isSingle || this.isMaybeSingle ? lastUpdated : lastUpdated ? [lastUpdated] : [],
        error: null,
        count: updatedCount
      };
    }

    if (this.mode === 'delete') {
      const matchingIndices = [];
      const deletedRows = [];
      for (let i = 0; i < tableData.length; i++) {
        const matches = this.filters.every((f) => f(tableData[i]));
        if (matches) {
          matchingIndices.push(i);
          deletedRows.push({ ...tableData[i] });
        }
      }
      for (let i = matchingIndices.length - 1; i >= 0; i--) {
        tableData.splice(matchingIndices[i], 1);
      }
      return {
        data: this.isSingle || this.isMaybeSingle ? deletedRows[0] || null : deletedRows,
        error: null
      };
    }

    let filtered = tableData.filter((row) => this.filters.every((f) => f(row)));
    const totalCount = filtered.length;

    if (this.sorts.length > 0) {
      filtered.sort((a, b) => {
        for (const s of this.sorts) {
          const valA = a[s.col];
          const valB = b[s.col];
          if (valA === valB) continue;
          if (valA === null || valA === undefined) return s.ascending ? 1 : -1;
          if (valB === null || valB === undefined) return s.ascending ? -1 : 1;
          if (valA < valB) return s.ascending ? -1 : 1;
          if (valA > valB) return s.ascending ? 1 : -1;
        }
        return 0;
      });
    }

    if (this.rangeFrom !== null && this.rangeTo !== null) {
      filtered = filtered.slice(this.rangeFrom, this.rangeTo + 1);
    } else if (this.limitCount !== null) {
      filtered = filtered.slice(0, this.limitCount);
    }

    if (this.headOnly) {
      return { data: null, count: totalCount, error: null };
    }

    if (this.isSingle) {
      const row = filtered[0];
      return {
        data: row ? { ...row } : null,
        error: row ? null : { message: 'Row not found', code: 'PGRST116' }
      };
    }

    if (this.isMaybeSingle) {
      const row = filtered[0];
      return {
        data: row ? { ...row } : null,
        error: null
      };
    }

    return {
      data: filtered.map((r) => ({ ...r })),
      count: this.countOption ? totalCount : null,
      error: null
    };
  }

  then(onFulfilled, onRejected) {
    return this._execute().then(onFulfilled, onRejected);
  }
}

// Wrapper that attempts real Supabase first, but falls back gracefully if network is unreachable
let liveClient = null;
let liveIsReachable = false;
let hasCheckedReachability = false;

if (isConfigured) {
  try {
    liveClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  } catch (err) {
    console.warn(`⚠️ Supabase client init: ${err.message}`);
  }
}

const resilientSupabaseClient = {
  isMock: !isConfigured,
  from(table) {
    if (liveClient && (liveIsReachable || !hasCheckedReachability)) {
      const realBuilder = liveClient.from(table);
      const mockBuilder = new MemoryQueryBuilder(table);

      // Proxy builder to catch network-level ENOTFOUND
      const handler = {
        get(target, prop, receiver) {
          if (prop === 'then') {
            return (onFulfilled, onRejected) => {
              return target
                .then((res) => {
                  liveIsReachable = true;
                  hasCheckedReachability = true;
                  return onFulfilled(res);
                })
                .catch((err) => {
                  if (err.message && (err.message.includes('fetch failed') || err.message.includes('ENOTFOUND'))) {
                    if (liveIsReachable || !hasCheckedReachability) {
                      console.warn(`⚠️ Live Supabase host currently unreachable (${err.message}). Using local store.`);
                      liveIsReachable = false;
                      hasCheckedReachability = true;
                    }
                    return mockBuilder.then(onFulfilled, onRejected);
                  }
                  if (onRejected) return onRejected(err);
                  throw err;
                });
            };
          }

          const original = target[prop];
          if (typeof original === 'function') {
            return function (...args) {
              const res = original.apply(target, args);
              if (typeof mockBuilder[prop] === 'function') {
                mockBuilder[prop](...args);
              }
              return new Proxy(res, handler);
            };
          }
          return Reflect.get(target, prop, receiver);
        }
      };

      return new Proxy(realBuilder, handler);
    }

    return new MemoryQueryBuilder(table);
  },
  _memoryStore: memoryStore
};

/**
 * Test database connectivity and log friendly setup status
 */
const testDatabaseConnection = async () => {
  if (!isConfigured || !liveClient) {
    console.log('⚡ Supabase Client running with local development fallback store.');
    console.log('💡 To connect directly to your live Supabase PostgreSQL database:');
    console.log('   1. Create a project at https://supabase.com');
    console.log('   2. Run "schema.sql" in your Supabase SQL Editor');
    console.log('   3. Set SUPABASE_URL and SUPABASE_KEY in your .env file');
    return true;
  }

  try {
    const { data, error } = await liveClient
      .from('users')
      .select('id', { count: 'exact', head: true });

    hasCheckedReachability = true;

    if (error) {
      if (error.message && (error.message.includes('fetch failed') || error.message.includes('ENOTFOUND'))) {
        liveIsReachable = false;
        console.warn(`⚠️ Live Supabase URL "${supabaseUrl}" is currently unreachable (DNS ENOTFOUND).`);
        console.warn('💡 The Supabase project may still be provisioning or paused. Running on local store in the meantime.');
        return false;
      }
      console.warn(`⚠️ Supabase connection warning: ${error.message}`);
      console.warn('💡 Ensure you have executed "schema.sql" in your Supabase SQL Editor to create tables.');
      return false;
    }

    liveIsReachable = true;
    console.log(`✅ Supabase PostgreSQL Connected: ${supabaseUrl}`);
    return true;
  } catch (err) {
    hasCheckedReachability = true;
    liveIsReachable = false;
    console.warn(`⚠️ Supabase network check: ${err.message}. Running on local store.`);
    return false;
  }
};

module.exports = {
  supabase: resilientSupabaseClient,
  testDatabaseConnection,
  isConfigured,
  memoryStore
};
