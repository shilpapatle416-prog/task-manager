const bcrypt = require('bcryptjs');
const { supabase } = require('../config/supabase');

/**
 * User Model backed by Supabase PostgreSQL
 */
class User {
  constructor(data = {}) {
    this.id = data.id || null;
    this._id = data.id || null;
    this.name = data.name || '';
    this.email = data.email || '';
    this.password = data.password || '';
    this.avatar = data.avatar || '';
    this.createdAt = data.created_at || data.createdAt || new Date().toISOString();
    this.updatedAt = data.updated_at || data.updatedAt || new Date().toISOString();
    this._passwordModified = false;
  }

  // Setter to track password changes
  setPassword(newPassword) {
    this.password = newPassword;
    this._passwordModified = true;
  }

  /**
   * Compare entered password with hashed password
   */
  async matchPassword(enteredPassword) {
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
  }

  /**
   * Save user record to Supabase
   */
  async save() {
    if (this._passwordModified && this.password && !this.password.startsWith('$2')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      this._passwordModified = false;
    }

    const updates = {
      name: this.name.trim(),
      email: this.email.toLowerCase().trim(),
      avatar: this.avatar,
      updated_at: new Date().toISOString()
    };

    if (this.password) {
      updates.password = this.password;
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', this.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }

    if (data) {
      this.updatedAt = data.updated_at;
      this.createdAt = data.created_at;
    }

    return this;
  }

  /**
   * Safe JSON representation without sensitive fields
   */
  toJSON() {
    return {
      id: this.id,
      _id: this.id,
      name: this.name,
      email: this.email,
      avatar: this.avatar,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  toObject() {
    return this.toJSON();
  }

  /**
   * Static: Find single user matching criteria
   */
  static findOne(query = {}) {
    let email = null;
    let id = null;

    if (query.email) email = query.email.toLowerCase().trim();
    if (query._id) id = query._id;
    if (query.id) id = query.id;

    let includePassword = false;

    const execute = async () => {
      let q = supabase.from('users').select('*');
      if (email) q = q.eq('email', email);
      if (id) q = q.eq('id', id);

      const { data, error } = await q.maybeSingle();
      if (error || !data) return null;

      const user = new User(data);
      if (!includePassword) {
        // By default, match Mongoose behavior of omitting password unless selected
        user.password = data.password;
      }
      return user;
    };

    const promise = execute();

    // Support Mongoose query chaining like .select('+password')
    promise.select = function (fields) {
      if (typeof fields === 'string' && fields.includes('+password')) {
        includePassword = true;
      }
      return execute();
    };

    return promise;
  }

  /**
   * Static: Find user by ID
   */
  static findById(id) {
    if (!id) return Promise.resolve(null);

    let includePassword = false;

    const execute = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) return null;

      const user = new User(data);
      if (!includePassword) {
        user.password = data.password;
      }
      return user;
    };

    const promise = execute();

    promise.select = function (fields) {
      if (typeof fields === 'string' && fields.includes('+password')) {
        includePassword = true;
      }
      return execute();
    };

    return promise;
  }

  /**
   * Static: Create a new user
   */
  static async create(userData) {
    let hashedPassword = userData.password;
    if (userData.password && !userData.password.startsWith('$2')) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(userData.password, salt);
    }

    const insertPayload = {
      name: userData.name.trim(),
      email: userData.email.toLowerCase().trim(),
      password: hashedPassword,
      avatar: userData.avatar || ''
    };

    const { data, error } = await supabase
      .from('users')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return new User(data);
  }

  /**
   * Static: Delete single user
   */
  static async deleteOne(query = {}) {
    const id = query._id || query.id;
    if (!id) return { deletedCount: 0 };

    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete user: ${error.message}`);
    return { deletedCount: 1 };
  }
}

module.exports = User;
