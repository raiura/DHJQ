/**
 * 验证模式定义
 * 使用 Joi 定义各种请求的验证规则
 */

const Joi = require('joi');

// ============================================
// 游戏相关验证
// ============================================

const gameSchemas = {
  // 创建游戏
  createGame: Joi.object({
    title: Joi.string().min(2).max(100).required()
      .messages({
        'string.empty': '游戏标题不能为空',
        'string.min': '游戏标题至少需要2个字符',
        'string.max': '游戏标题最多100个字符',
        'any.required': '游戏标题是必填项'
      }),
    subtitle: Joi.string().max(200).allow('', null)
      .messages({
        'string.max': '副标题最多200个字符'
      }),
    slug: Joi.string().alphanum().min(2).max(50).required()
      .messages({
        'string.empty': '游戏标识不能为空',
        'string.alphanum': '游戏标识只能包含字母和数字',
        'string.min': '游戏标识至少需要2个字符',
        'string.max': '游戏标识最多50个字符',
        'any.required': '游戏标识是必填项'
      }),
    description: Joi.string().max(1000).allow('', null),
    cover: Joi.string().uri().allow('', null),
    background: Joi.string().uri().allow('', null),
    worldSetting: Joi.string().max(10000).allow('', null),
    genre: Joi.string().max(50).allow('', null),
    tags: Joi.array().items(Joi.string().max(30)).max(10)
  }),

  // 更新游戏
  updateGame: Joi.object({
    title: Joi.string().min(2).max(100),
    subtitle: Joi.string().max(200).allow('', null),
    description: Joi.string().max(1000).allow('', null),
    cover: Joi.string().uri().allow('', null),
    background: Joi.string().uri().allow('', null),
    worldSetting: Joi.string().max(10000).allow('', null),
    genre: Joi.string().max(50).allow('', null),
    tags: Joi.array().items(Joi.string().max(30)).max(10)
  }),

  // 发布游戏
  publishGame: Joi.object({
    status: Joi.string().valid('published', 'draft').required()
  })
};

// ============================================
// 对话相关验证
// ============================================

const dialogueSchemas = {
  // 发送消息
  sendMessage: Joi.object({
    message: Joi.string().min(1).max(2000).required()
      .messages({
        'string.empty': '消息内容不能为空',
        'string.min': '消息内容至少需要1个字符',
        'string.max': '消息内容最多2000个字符',
        'any.required': '消息内容是必填项'
      }),
    characterId: Joi.string().required()
      .messages({
        'string.empty': '角色ID不能为空',
        'any.required': '角色ID是必填项'
      }),
    userSettings: Joi.object({
      promptAddon: Joi.string().max(2000).allow('', null),
      worldbookEntries: Joi.array().items(Joi.string()).max(20),
      temperature: Joi.number().min(0).max(2).default(0.7),
      systemPrompt: Joi.string().max(5000).allow('', null)
    }).optional()
  })
};

// ============================================
// 角色相关验证
// ============================================

const characterSchemas = {
  // 创建角色
  createCharacter: Joi.object({
    name: Joi.string().min(1).max(50).required()
      .messages({
        'string.empty': '角色名称不能为空',
        'string.max': '角色名称最多50个字符',
        'any.required': '角色名称是必填项'
      }),
    description: Joi.string().max(500).allow('', null),
    avatar: Joi.string().uri().allow('', null),
    personality: Joi.string().max(1000).allow('', null),
    background: Joi.string().max(2000).allow('', null),
    greeting: Joi.string().max(200).allow('', null),
    scenario: Joi.string().max(1000).allow('', null),
    exampleDialogs: Joi.string().max(2000).allow('', null)
  }),

  // 更新角色
  updateCharacter: Joi.object({
    name: Joi.string().min(1).max(50),
    description: Joi.string().max(500).allow('', null),
    avatar: Joi.string().uri().allow('', null),
    personality: Joi.string().max(1000).allow('', null),
    background: Joi.string().max(2000).allow('', null),
    greeting: Joi.string().max(200).allow('', null),
    scenario: Joi.string().max(1000).allow('', null),
    exampleDialogs: Joi.string().max(2000).allow('', null)
  }),

  // 更新好感度
  updateFavor: Joi.object({
    favor: Joi.number().min(-100).max(100).required()
      .messages({
        'number.base': '好感度必须是数字',
        'number.min': '好感度不能低于-100',
        'number.max': '好感度不能高于100',
        'any.required': '好感度是必填项'
      })
  })
};

// ============================================
// 记忆相关验证
// ============================================

const memorySchemas = {
  // 创建记忆
  createMemory: Joi.object({
    content: Joi.string().min(1).max(1000).required()
      .messages({
        'string.empty': '记忆内容不能为空',
        'string.max': '记忆内容最多1000个字符',
        'any.required': '记忆内容是必填项'
      }),
    type: Joi.string().valid('short', 'long', 'core').default('short'),
    importance: Joi.number().min(1).max(10).default(5),
    tags: Joi.array().items(Joi.string().max(20)).max(5)
  }),

  // 更新记忆
  updateMemory: Joi.object({
    content: Joi.string().min(1).max(1000),
    importance: Joi.number().min(1).max(10),
    tags: Joi.array().items(Joi.string().max(20)).max(5)
  })
};

// ============================================
// 图库相关验证
// ============================================

const gallerySchemas = {
  // 添加图片
  addImage: Joi.object({
    gameId: Joi.string().required()
      .messages({
        'string.empty': '游戏ID不能为空',
        'any.required': '游戏ID是必填项'
      }),
    name: Joi.string().min(1).max(100).required()
      .messages({
        'string.empty': '图片名称不能为空',
        'any.required': '图片名称是必填项'
      }),
    url: Joi.string().uri().required()
      .messages({
        'string.uri': '图片URL格式不正确',
        'any.required': '图片URL是必填项'
      }),
    type: Joi.string().valid('background', 'character', 'cg', 'ui').default('background'),
    tags: Joi.array().items(Joi.string().max(30)).max(10),
    description: Joi.string().max(500).allow('', null),
    characterId: Joi.string().allow('', null),
    characterName: Joi.string().max(50).allow('', null)
  })
};

// ============================================
// 设置相关验证
// ============================================

const settingSchemas = {
  // 更新AI设置
  updateAISettings: Joi.object({
    apiKey: Joi.string().min(10).required()
      .messages({
        'string.empty': 'API密钥不能为空',
        'string.min': 'API密钥格式不正确',
        'any.required': 'API密钥是必填项'
      }),
    apiUrl: Joi.string().uri().required()
      .messages({
        'string.uri': 'API URL格式不正确',
        'any.required': 'API URL是必填项'
      }),
    model: Joi.string().min(1).required()
      .messages({
        'string.empty': '模型名称不能为空',
        'any.required': '模型名称是必填项'
      })
  }),

  // 测试AI连接
  testAIConnection: Joi.object({
    apiKey: Joi.string().required(),
    apiUrl: Joi.string().uri().required(),
    model: Joi.string().required()
  })
};

// ============================================
// 用户相关验证
// ============================================

const userSchemas = {
  // 用户注册
  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(20).required()
      .messages({
        'string.empty': '用户名不能为空',
        'string.alphanum': '用户名只能包含字母和数字',
        'string.min': '用户名至少需要3个字符',
        'string.max': '用户名最多20个字符',
        'any.required': '用户名是必填项'
      }),
    password: Joi.string().min(6).max(100).required()
      .messages({
        'string.empty': '密码不能为空',
        'string.min': '密码至少需要6个字符',
        'any.required': '密码是必填项'
      }),
    nickname: Joi.string().max(50).allow('', null),
    email: Joi.string().email().allow('', null)
  }),

  // 用户登录
  login: Joi.object({
    username: Joi.string().required()
      .messages({
        'string.empty': '用户名不能为空',
        'any.required': '用户名是必填项'
      }),
    password: Joi.string().required()
      .messages({
        'string.empty': '密码不能为空',
        'any.required': '密码是必填项'
      })
  })
};

// 导出所有验证模式
module.exports = {
  gameSchemas,
  dialogueSchemas,
  characterSchemas,
  memorySchemas,
  gallerySchemas,
  settingSchemas,
  userSchemas
};
