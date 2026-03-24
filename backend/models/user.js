const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const memoryStore = require('../utils/memoryStore');
const Logger = require('../utils/logger');

// 检查 MongoDB 是否连接
let useMemoryStore = false;
try {
  useMemoryStore = mongoose.connection.readyState !== 1;
} catch (error) {
  useMemoryStore = true;
}

// 用户Schema定义
const userSchemaDefinition = {
  username: {
    type: String,
    required: [true, '用户名不能为空'],
    unique: true,
    trim: true,
    minlength: [3, '用户名至少需要3个字符'],
    maxlength: [20, '用户名最多20个字符']
  },
  password: {
    type: String,
    required: [true, '密码不能为空'],
    minlength: [6, '密码至少需要6个字符']
  },
  nickname: {
    type: String,
    trim: true,
    maxlength: [50, '昵称最多50个字符'],
    default: function() {
      return this.username;
    }
  },
  avatar: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  lastLoginAt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
};

// 如果 MongoDB 已连接，使用 Mongoose 模型
if (!useMemoryStore) {
  const userSchema = new mongoose.Schema(userSchemaDefinition, {
    timestamps: true
  });

  // 密码加密中间件
  userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      next();
    } catch (error) {
      next(error);
    }
  });

  // 验证密码方法
  userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  };

  // 转换为JSON时隐藏密码
  userSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.password;
    return user;
  };

  module.exports = mongoose.model('User', userSchema);
} else {
  // 内存存储模型
  class MemoryUserModel {
    constructor() {
      this.collectionName = 'users';
    }

    async find(query = {}) {
      const all = memoryStore.findAll(this.collectionName);
      if (Object.keys(query).length === 0) return all;
      
      return all.filter(doc => {
        for (const [key, value] of Object.entries(query)) {
          if (doc[key] !== value) return false;
        }
        return true;
      });
    }

    async findOne(query) {
      const results = await this.find(query);
      return results[0] || null;
    }

    async findById(id) {
      return memoryStore.findById(this.collectionName, id);
    }

    async create(data) {
      // 密码加密
      if (data.password && !data.password.startsWith('$2')) {
        const salt = await bcrypt.genSalt(10);
        data.password = await bcrypt.hash(data.password, salt);
      }
      
      // 设置默认值
      const doc = {
        ...data,
        role: data.role || 'user',
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdAt: data.createdAt || new Date(),
        updatedAt: data.updatedAt || new Date()
      };
      
      return memoryStore.create(this.collectionName, doc);
    }

    async findByIdAndUpdate(id, data) {
      return memoryStore.update(this.collectionName, id, {
        ...data,
        updatedAt: new Date()
      });
    }

    async countDocuments() {
      return memoryStore.count(this.collectionName);
    }

    // 初始化管理员账号
    async initAdminUser() {
      try {
        const existingAdmin = await this.findOne({ username: 'admin' });
        if (existingAdmin) {
          Logger.info('管理员账号已存在，跳过初始化');
          return;
        }

        const adminUser = await this.create({
          username: 'admin',
          password: 'admin123',
          nickname: '管理员',
          role: 'admin',
          createdAt: new Date(),
          updatedAt: new Date()
        });

        Logger.info('============================================');
        Logger.info('管理员账号创建成功！');
        Logger.info('用户名: admin');
        Logger.info('密码: admin123');
        Logger.info('============================================');
        return adminUser;
      } catch (error) {
        Logger.error('创建管理员账号失败:', error);
      }
    }
  }

  module.exports = new MemoryUserModel();
}
