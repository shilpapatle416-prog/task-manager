const { supabase } = require('../config/supabase');

/**
 * Task Model backed by Supabase PostgreSQL
 */
class Task {
  constructor(data = {}) {
    this.id = data.id || null;
    this._id = data.id || null;
    this.user = data.user_id || data.user || null;
    this.userId = data.user_id || data.user || null;
    this.title = data.title || '';
    this.description = data.description || '';
    this.priority = data.priority || 'Medium';
    this.category = data.category || 'Personal';
    this.status = data.status || 'Pending';
    this.dueDate = data.due_date || data.dueDate || null;
    this.completedAt = data.completed_at || data.completedAt || null;
    this.createdAt = data.created_at || data.createdAt || new Date().toISOString();
    this.updatedAt = data.updated_at || data.updatedAt || new Date().toISOString();
  }

  /**
   * Save changes to existing task
   */
  async save() {
    const updates = {
      title: this.title.trim(),
      description: this.description ? this.description.trim() : '',
      priority: this.priority,
      category: this.category,
      status: this.status,
      due_date: this.dueDate ? new Date(this.dueDate).toISOString() : null,
      completed_at: this.completedAt ? new Date(this.completedAt).toISOString() : null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', this.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update task: ${error.message}`);
    }

    if (data) {
      this.updatedAt = data.updated_at;
      this.dueDate = data.due_date;
      this.completedAt = data.completed_at;
    }

    return this;
  }

  toJSON() {
    return {
      id: this.id,
      _id: this.id,
      user: this.user,
      title: this.title,
      description: this.description,
      priority: this.priority,
      category: this.category,
      status: this.status,
      dueDate: this.dueDate,
      completedAt: this.completedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  toObject() {
    return this.toJSON();
  }

  /**
   * Helper: Apply filter constraints to Supabase PostgREST query
   */
  static _applyFilters(q, query = {}) {
    const userId = query.user || query.user_id;
    if (userId) {
      q = q.eq('user_id', userId);
    }

    // $or search (title or description)
    if (query.$or && Array.isArray(query.$or)) {
      const searchItem = query.$or.find((item) => item.title || item.description);
      if (searchItem) {
        let needle = '';
        const titleVal = searchItem.title;
        if (titleVal instanceof RegExp) {
          needle = titleVal.source.replace(/\\/g, '');
        } else if (typeof titleVal === 'string') {
          needle = titleVal;
        }
        if (needle) {
          needle = encodeURIComponent(needle);
          q = q.or(`title.ilike.%${needle}%,description.ilike.%${needle}%`);
        }
      }
    }

    // Status filter
    if (query.status) {
      if (typeof query.status === 'string') {
        q = q.eq('status', query.status);
      } else if (typeof query.status === 'object' && query.status.$ne) {
        q = q.neq('status', query.status.$ne);
      }
    }

    // Priority filter
    if (query.priority && typeof query.priority === 'string') {
      q = q.eq('priority', query.priority);
    }

    // Category filter
    if (query.category && typeof query.category === 'string') {
      q = q.eq('category', query.category);
    }

    // Due date filter
    if (query.dueDate && typeof query.dueDate === 'object') {
      if (query.dueDate.$ne === null) {
        q = q.not('due_date', 'is', null);
      }
      if (query.dueDate.$lt) {
        const ltDate = new Date(query.dueDate.$lt).toISOString();
        q = q.lt('due_date', ltDate);
      }
      if (query.dueDate.$lte) {
        const lteDate = new Date(query.dueDate.$lte).toISOString();
        q = q.lte('due_date', lteDate);
      }
      if (query.dueDate.$gte) {
        const gteDate = new Date(query.dueDate.$gte).toISOString();
        q = q.gte('due_date', gteDate);
      }
      if (query.dueDate.$gt) {
        const gtDate = new Date(query.dueDate.$gt).toISOString();
        q = q.gt('due_date', gtDate);
      }
    }

    return q;
  }

  /**
   * Static: Count documents matching query
   */
  static async countDocuments(query = {}) {
    let q = supabase.from('tasks').select('*', { count: 'exact', head: true });
    q = Task._applyFilters(q, query);

    const { count, error } = await q;
    if (error) {
      throw new Error(`Failed to count tasks: ${error.message}`);
    }
    return count || 0;
  }

  /**
   * Static: Find multiple tasks with sorting, skipping, and limiting
   */
  static find(query = {}) {
    let q = supabase.from('tasks').select('*');
    q = Task._applyFilters(q, query);

    let sorts = [];
    let skipCount = 0;
    let limitCount = null;

    const builder = {
      sort(sortOptions) {
        if (sortOptions && typeof sortOptions === 'object') {
          sorts.push(sortOptions);
        }
        return builder;
      },
      skip(n) {
        skipCount = parseInt(n, 10) || 0;
        return builder;
      },
      limit(n) {
        limitCount = parseInt(n, 10);
        return builder;
      },
      async then(onFulfilled, onRejected) {
        try {
          for (const s of sorts) {
            for (const [key, val] of Object.entries(s)) {
              const asc = val === 1 || val === 'asc';
              const col =
                key === 'dueDate'
                  ? 'due_date'
                  : key === 'createdAt'
                  ? 'created_at'
                  : key === 'updatedAt'
                  ? 'updated_at'
                  : key;
              q = q.order(col, { ascending: asc, nullsFirst: false });
            }
          }

          if (limitCount !== null && limitCount > 0) {
            const from = skipCount;
            const to = skipCount + limitCount - 1;
            q = q.range(from, to);
          }

          const { data, error } = await q;
          if (error) {
            throw new Error(`Failed to fetch tasks: ${error.message}`);
          }

          const tasks = (data || []).map((row) => new Task(row));
          return onFulfilled(tasks);
        } catch (err) {
          if (onRejected) return onRejected(err);
          throw err;
        }
      }
    };

    return builder;
  }

  /**
   * Static: Find single task
   */
  static async findOne(query = {}) {
    const id = query._id || query.id;
    const userId = query.user || query.user_id;

    let q = supabase.from('tasks').select('*');
    if (id) q = q.eq('id', id);
    if (userId) q = q.eq('user_id', userId);

    const { data, error } = await q.maybeSingle();
    if (error || !data) return null;

    return new Task(data);
  }

  /**
   * Static: Create a new task
   */
  static async create(payload = {}) {
    const userId = payload.user || payload.user_id;
    const insertPayload = {
      user_id: userId,
      title: payload.title.trim(),
      description: payload.description ? payload.description.trim() : '',
      priority: payload.priority || 'Medium',
      category: payload.category || 'Personal',
      status: payload.status || 'Pending',
      due_date: payload.dueDate ? new Date(payload.dueDate).toISOString() : null,
      completed_at: payload.completedAt ? new Date(payload.completedAt).toISOString() : null
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create task: ${error.message}`);
    }

    return new Task(data);
  }

  /**
   * Static: Find one and delete
   */
  static async findOneAndDelete(query = {}) {
    const id = query._id || query.id;
    const userId = query.user || query.user_id;

    // First retrieve record
    const existing = await Task.findOne({ _id: id, user: userId });
    if (!existing) return null;

    let q = supabase.from('tasks').delete().eq('id', id);
    if (userId) q = q.eq('user_id', userId);

    const { error } = await q;
    if (error) {
      throw new Error(`Failed to delete task: ${error.message}`);
    }

    return existing;
  }

  /**
   * Static: Delete multiple tasks
   */
  static async deleteMany(query = {}) {
    const userId = query.user || query.user_id;
    let q = supabase.from('tasks').delete();
    if (userId) q = q.eq('user_id', userId);

    const { error } = await q;
    if (error) {
      throw new Error(`Failed to delete tasks: ${error.message}`);
    }

    return { acknowledged: true };
  }

  /**
   * Static: Insert multiple tasks
   */
  static async insertMany(taskList = []) {
    const rows = taskList.map((t) => ({
      user_id: t.user || t.user_id,
      title: t.title.trim(),
      description: t.description ? t.description.trim() : '',
      priority: t.priority || 'Medium',
      category: t.category || 'Personal',
      status: t.status || 'Pending',
      due_date: t.dueDate ? new Date(t.dueDate).toISOString() : null,
      completed_at: t.completedAt ? new Date(t.completedAt).toISOString() : null
    }));

    const { data, error } = await supabase.from('tasks').insert(rows).select();
    if (error) {
      throw new Error(`Failed to insert many tasks: ${error.message}`);
    }

    return (data || []).map((r) => new Task(r));
  }

  /**
   * Static: Category aggregation
   */
  static async aggregate(pipeline = []) {
    const match = pipeline.find((p) => p.$match)?.$match || {};
    const userId = match.user || match.user_id;

    let q = supabase.from('tasks').select('category');
    if (userId) q = q.eq('user_id', userId);

    const { data, error } = await q;
    if (error) {
      throw new Error(`Failed to aggregate tasks: ${error.message}`);
    }

    const counts = {};
    (data || []).forEach((row) => {
      const cat = row.category || 'Other';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return Object.entries(counts).map(([category, count]) => ({
      _id: category,
      count
    }));
  }
}

module.exports = Task;
