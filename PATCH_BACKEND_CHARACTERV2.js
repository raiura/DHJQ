/**
 * 后端API角色卡2.0集成补丁
 * 
 * 文件：backend/models/character.js
 * 文件：backend/routes/characters.js
 * 文件：backend/services/dialogueService.js
 */

// ============================================
// PART 1: 扩展 character.js 模型 (backend/models/character.js)
// ============================================

const CHARACTER_MODEL_PATCH = `
// ========== 在文件顶部添加 ==========

/**
 * 角色卡版本枚举
 */
const CharacterFormat = {
  V1: 'v1',
  V2: 'v2',
  MIXED: 'mixed'  // V1+V2混合
};

// ========== 扩展 schema 定义 ==========

const characterSchemaDefinition = {
  // ... 保留所有现有字段 ...
  
  // ========== V2新增字段 ==========
  
  /**
   * 版本信息
   */
  version: {
    type: String,
    default: '1.0'
  },
  format: {
    type: String,
    enum: Object.values(CharacterFormat),
    default: CharacterFormat.V1
  },
  
  /**
   * V2完整数据（JSON存储）
   * 当format为v2时，主要数据存储在这里
   */
  v2Data: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  
  /**
   * 迁移标记
   */
  _migration: {
    fromVersion: { type: String },
    migratedAt: { type: Date },
    autoMigrated: { type: Boolean, default: false }
  }
};

// ========== 添加中间件 ==========

/**
 * 保存前钩子：同步V2数据到V1字段（保持兼容）
 */
characterSchema.pre('save', function(next) {
  // 如果存在V2数据，同步关键字段到V1格式
  if (this.v2Data && this.format === CharacterFormat.V2) {
    console.log('[Character Model] 同步V2数据到V1字段:', this.v2Data.name);
    
    // 基础字段同步
    this.name = this.v2Data.name || this.name;
    this.color = this.v2Data.visual?.color || this.color;
    this.image = this.v2Data.visual?.avatar || this.v2Data.visual?.image || this.image;
    this.keys = this.v2Data.activation?.keys || this.keys || [];
    this.priority = this.v2Data.activation?.priority || this.priority || 100;
    this.enabled = this.v2Data.activation?.enabled !== false;
    
    // 关系字段同步
    if (this.v2Data.relationship) {
      this.favor = this.v2Data.relationship.favor || this.favor || 50;
      this.trust = this.v2Data.relationship.trust || this.trust || 50;
      this.mood = this.v2Data.relationship.mood || this.mood || '平静';
    }
    
    // 设定字段同步（反向映射）
    if (this.v2Data.core) {
      // description映射到appearance
      if (this.v2Data.core.description) {
        this.appearance = this.v2Data.core.description;
      }
      this.personality = this.v2Data.core.personality || this.personality;
      // scenario映射到background
      if (this.v2Data.core.scenario) {
        this.background = this.v2Data.core.scenario;
      }
    }
    
    // 重新生成prompt
    this.prompt = buildPromptFromV2Data(this.v2Data);
    
    // 更新版本号
    this.version = this.v2Data.version || '2.0';
  }
  
  next();
});

/**
 * 从V2数据构建prompt字符串
 */
function buildPromptFromV2Data(v2Data) {
  if (!v2Data) return '';
  
  const parts = [];
  parts.push(\`【角色名称】\${v2Data.name}\`);
  
  if (v2Data.core?.description) {
    parts.push(\`\\n【角色描述】\\n\${v2Data.core.description}\`);
  }
  if (v2Data.core?.personality) {
    parts.push(\`\\n【性格特点】\\n\${v2Data.core.personality}\`);
  }
  if (v2Data.core?.scenario) {
    parts.push(\`\\n【当前处境】\\n\${v2Data.core.scenario}\`);
  }
  if (v2Data.injection?.characterNote?.content) {
    parts.push(\`\\n【状态备注】\\n\${v2Data.injection.characterNote.content}\`);
  }
  if (v2Data.injection?.postHistory) {
    parts.push(\`\\n【后续引导】\\n\${v2Data.injection.postHistory}\`);
  }
  
  return parts.join('\\n');
}

// 添加到schema静态方法
characterSchema.statics.CharacterFormat = CharacterFormat;
characterSchema.statics.buildPromptFromV2Data = buildPromptFromV2Data;

// ========== 实例方法 ==========

/**
 * 获取角色数据（自动处理版本）
 */
characterSchema.methods.getData = function() {
  if (this.format === CharacterFormat.V2 && this.v2Data) {
    return {
      ...this.v2Data,
      _id: this._id,
      id: this._id,
      format: this.format,
      version: this.version
    };
  }
  
  // 返回V1格式
  return this.toObject();
};

/**
 * 升级为V2格式
 */
characterSchema.methods.upgradeToV2 = function() {
  if (this.format === CharacterFormat.V2) {
    return { success: false, message: '已经是V2格式' };
  }
  
  // 构建V2数据
  this.v2Data = {
    id: this._id.toString(),
    name: this.name,
    version: '2.0.0',
    visual: {
      avatar: this.image || this.avatar || '',
      cover: '',
      emotionCGs: {},
      color: this.color || '#8a6d3b'
    },
    core: {
      description: this.appearance || '',
      personality: this.personality || '',
      scenario: this.background || '',
      firstMessage: '',
      worldConnection: {
        faction: '',
        location: '',
        relationships: []
      }
    },
    examples: {
      dialogues: [],
      style: ''
    },
    injection: {
      characterNote: {
        content: '',
        depth: 0,
        frequency: 1,
        role: 'system'
      },
      postHistory: '',
      mainPromptOverride: ''
    },
    lorebook: {
      entries: [],
      linkedGlobalEntries: []
    },
    activation: {
      keys: this.keys || [],
      priority: this.priority || 100,
      enabled: this.enabled !== false,
      conditions: [],
      entrance: {
        autoTrigger: false,
        triggerMessage: '',
        requiredContext: []
      }
    },
    relationship: {
      favor: this.favor || 50,
      trust: this.trust || 50,
      mood: this.mood || '平静',
      attitude: {
        current: '中立',
        history: []
      },
      sharedMemories: []
    },
    meta: {
      author: '',
      createdAt: this.createdAt,
      updatedAt: new Date(),
      tags: [],
      description: '',
      exportFormat: 'dahuang-v2'
    }
  };
  
  this.format = CharacterFormat.V2;
  this.version = '2.0.0';
  this._migration = {
    fromVersion: '1.0',
    migratedAt: new Date(),
    autoMigrated: true
  };
  
  return { success: true, message: '已升级为V2格式' };
};

// 导出枚举
if (!useMemoryStore) {
  // ... 原有Mongoose模型导出 ...
  module.exports.CharacterFormat = CharacterFormat;
}
`;

// ============================================
// PART 2: 扩展 characters.js 路由 (backend/routes/characters.js)
// ============================================

const CHARACTERS_ROUTE_PATCH = `
// ========== 在文件末尾添加 V2 API 路由 ==========

/**
 * V2 API: 获取角色（支持自动版本检测）
 * GET /api/characters/v2/:id
 */
router.get('/v2/:id', async (req, res) => {
  try {
    const character = await Character.findById(req.params.id);
    
    if (!character) {
      return res.status(404).json({ success: false, message: '角色不存在' });
    }
    
    // 返回适合格式的数据
    const data = character.getData();
    
    res.json({
      success: true,
      data: data,
      meta: {
        format: character.format,
        version: character.version,
        isV2: character.format === Character.CharacterFormat.V2
      }
    });
  } catch (error) {
    console.error('[V2 API] 获取角色失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * V2 API: 创建角色
 * POST /api/characters/v2
 */
router.post('/v2', async (req, res) => {
  try {
    const v2Data = req.body;
    
    // 验证必要字段
    if (!v2Data.name) {
      return res.status(400).json({ success: false, message: '角色名称不能为空' });
    }
    
    // 创建角色（V2格式）
    const character = new Character({
      name: v2Data.name,
      format: Character.CharacterFormat.V2,
      version: v2Data.version || '2.0.0',
      v2Data: v2Data,
      // V1兼容字段（会被pre-save钩子自动填充）
      gameId: req.body.gameId || null
    });
    
    await character.save();
    
    res.json({
      success: true,
      data: character.getData(),
      message: 'V2角色创建成功'
    });
  } catch (error) {
    console.error('[V2 API] 创建角色失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * V2 API: 更新角色
 * PUT /api/characters/v2/:id
 */
router.put('/v2/:id', async (req, res) => {
  try {
    const character = await Character.findById(req.params.id);
    
    if (!character) {
      return res.status(404).json({ success: false, message: '角色不存在' });
    }
    
    // 更新V2数据
    character.v2Data = {
      ...character.v2Data,
      ...req.body,
      id: character._id.toString(), // 保持ID一致
      meta: {
        ...character.v2Data?.meta,
        ...req.body.meta,
        updatedAt: new Date()
      }
    };
    
    character.format = Character.CharacterFormat.V2;
    character.version = req.body.version || '2.0.0';
    character.updatedAt = new Date();
    
    await character.save();
    
    res.json({
      success: true,
      data: character.getData(),
      message: 'V2角色更新成功'
    });
  } catch (error) {
    console.error('[V2 API] 更新角色失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * V2 API: 升级角色到V2
 * POST /api/characters/v2/:id/upgrade
 */
router.post('/v2/:id/upgrade', async (req, res) => {
  try {
    const character = await Character.findById(req.params.id);
    
    if (!character) {
      return res.status(404).json({ success: false, message: '角色不存在' });
    }
    
    const result = character.upgradeToV2();
    
    if (result.success) {
      await character.save();
      res.json({
        success: true,
        data: character.getData(),
        message: '角色已升级到V2格式'
      });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('[V2 API] 升级角色失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * V2 API: 批量获取角色（带格式标记）
 * GET /api/characters/v2?gameId=xxx
 */
router.get('/v2', async (req, res) => {
  try {
    const query = {};
    if (req.query.gameId) {
      query.$or = [
        { gameId: req.query.gameId },
        { gameId: null },
        { gameId: { $exists: false } }
      ];
    }
    
    const characters = await Character.find(query).sort({ updatedAt: -1 });
    
    res.json({
      success: true,
      data: characters.map(c => ({
        ...c.getData(),
        _format: c.format,
        _version: c.version
      })),
      meta: {
        total: characters.length,
        v2Count: characters.filter(c => c.format === Character.CharacterFormat.V2).length
      }
    });
  } catch (error) {
    console.error('[V2 API] 批量获取角色失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
`;

// ============================================
// PART 3: 扩展 dialogueService.js (backend/services/dialogueService.js)
// ============================================

const DIALOGUE_SERVICE_PATCH = `
// ========== 修改 generateResponse 方法 ==========

class DialogueService {
  static async generateResponse(message, characterId, userSettings = {}) {
    try {
      // 获取角色
      let character = null;
      try {
        character = await Character.findById(characterId);
      } catch (error) {
        console.error('Error getting character:', error.message);
      }
      
      // 判断使用V1还是V2逻辑
      const useV2Format = userSettings.useV2Format && 
                         character && 
                         character.format === Character.CharacterFormat.V2;
      
      console.log('[DialogueService] 使用格式:', useV2Format ? 'V2' : 'V1');
      
      // 构建提示词
      let prompt;
      if (useV2Format) {
        prompt = this.buildV2Prompt(character.v2Data, userSettings);
      } else {
        prompt = this.buildV1Prompt(character, userSettings);
      }
      
      // 获取AI设置
      const setting = await this.getAISettings();
      
      // 调用AI API
      const aiResponse = await this.callAIAPI(prompt, setting, userSettings);
      
      // 解析响应
      const parsedResponse = this.parseResponse(aiResponse);
      
      // 保存对话历史
      try {
        await this.saveDialogue(message, parsedResponse, characterId);
      } catch (error) {
        console.error('Error saving dialogue:', error.message);
      }
      
      return parsedResponse;
    } catch (error) {
      console.error('Error generating response:', error.message);
      return this.getDefaultResponse();
    }
  }
  
  /**
   * 构建V1格式提示词
   */
  static buildV1Prompt(character, userSettings) {
    let prompt = '';
    
    // 系统提示词
    if (userSettings.systemPrompt) {
      prompt += userSettings.systemPrompt + '\\n\\n';
    }
    
    // 角色设定
    if (character && character.prompt) {
      prompt += character.prompt + '\\n\\n';
    }
    
    // 世界书
    if (userSettings.worldbookEntries) {
      prompt += '【世界书】\\n' + userSettings.worldbookEntries + '\\n\\n';
    }
    
    // 用户补充
    if (userSettings.promptAddon) {
      prompt += '【补充设定】\\n' + userSettings.promptAddon + '\\n\\n';
    }
    
    // 用户消息
    prompt += '【用户消息】\\n' + userSettings.message;
    
    return prompt;
  }
  
  /**
   * 构建V2格式提示词
   */
  static buildV2Prompt(v2Data, userSettings) {
    const parts = [];
    
    // 1. 系统级提示词
    let systemPart = '';
    
    // Main Prompt Override
    if (v2Data.injection?.mainPromptOverride) {
      systemPart += v2Data.injection.mainPromptOverride + '\\n\\n';
    }
    
    // 用户系统提示词
    if (userSettings.systemPrompt) {
      systemPart += userSettings.systemPrompt + '\\n\\n';
    }
    
    // 世界观
    if (userSettings.worldSetting) {
      systemPart += '【世界观】\\n' + userSettings.worldSetting + '\\n\\n';
    }
    
    // 全局世界书（system位置）
    // 这里可以集成全局世界书
    
    if (systemPart) {
      parts.push(systemPart.trim());
    }
    
    // 2. 角色级提示词
    let characterPart = '';
    
    if (v2Data.core?.description) {
      characterPart += \`【角色】\${v2Data.name}\\n\${v2Data.core.description}\\n\\n\`;
    }
    
    if (v2Data.core?.personality) {
      characterPart += \`【性格】\\n\${v2Data.core.personality}\\n\\n\`;
    }
    
    if (v2Data.core?.scenario) {
      characterPart += \`【处境】\\n\${v2Data.core.scenario}\\n\\n\`;
    }
    
    // 角色专属世界书
    if (v2Data.lorebook?.entries) {
      const charLore = v2Data.lorebook.entries
        .filter(e => e.enabled !== false && (e.insertPosition === 'character' || !e.insertPosition))
        .map(e => \`[\${e.name}]: \${e.content}\`)
        .join('\\n');
      
      if (charLore) {
        characterPart += \`【角色相关知识】\\n\${charLore}\\n\\n\`;
      }
    }
    
    if (characterPart) {
      parts.push(characterPart.trim());
    }
    
    // 3. 示例对话（Few-shot）
    if (v2Data.examples?.dialogues && v2Data.examples.dialogues.length > 0) {
      let examplesPart = '【示例对话】\\n';
      
      v2Data.examples.dialogues.forEach((ex, idx) => {
        examplesPart += \`\\n--- 示例\${idx + 1} ---\\n\`;
        examplesPart += \`玩家: \${ex.user}\\n\`;
        examplesPart += \`\${v2Data.name}: \${ex.character}\\n\`;
      });
      
      parts.push(examplesPart);
    }
    
    // 4. 动态注入（CharacterNote）
    if (v2Data.injection?.characterNote?.content) {
      const charNote = v2Data.injection.characterNote;
      parts.push(\`【状态提醒】\\n\${charNote.content}\`);
    }
    
    // 5. 用户补充
    if (userSettings.promptAddon) {
      parts.push(\`【补充设定】\\n\${userSettings.promptAddon}\`);
    }
    
    // 6. 世界书条目
    if (userSettings.worldbookEntries) {
      parts.push(\`【相关知识】\\n\${userSettings.worldbookEntries}\`);
    }
    
    // 7. 用户消息
    parts.push(\`【用户消息】\\n\${userSettings.message}\`);
    
    // 8. Post-History Instructions
    if (v2Data.injection?.postHistory || userSettings.postHistory) {
      parts.push(\`【后续引导】\\n\${v2Data.injection?.postHistory || userSettings.postHistory}\`);
    }
    
    return parts.join('\\n\\n');
  }
  
  // ... 其他方法保持不变 ...
}
`;

// ============================================
// PART 4: 安装脚本
// ============================================

const INSTALLATION_SCRIPT = `
/**
 * 后端补丁安装说明
 * 
 * 步骤1：备份现有文件
 * cp backend/models/character.js backend/models/character.js.bak
 * cp backend/routes/characters.js backend/routes/characters.js.bak
 * cp backend/services/dialogueService.js backend/services/dialogueService.js.bak
 * 
 * 步骤2：应用补丁
 * 
 * 对于 character.js：
 * - 在schema定义前添加 CharacterFormat 枚举
 * - 在schema定义中添加 v2Data, version, format 字段
 * - 添加 pre-save 中间件
 * - 添加实例方法 getData() 和 upgradeToV2()
 * 
 * 对于 characters.js：
 * - 在文件末尾添加所有V2路由
 * 
 * 对于 dialogueService.js：
 * - 修改 generateResponse 方法
 * - 添加 buildV1Prompt 和 buildV2Prompt 方法
 * 
 * 步骤3：重启服务
 * npm restart
 * 
 * 步骤4：验证
 * - 测试创建V2角色
 * - 测试V2角色对话
 * - 测试V1角色仍然正常工作
 */

console.log('后端补丁安装说明');
console.log('================');
console.log('');
console.log('1. 备份文件');
console.log('2. 手动合并补丁代码（参考上方代码块）');
console.log('3. 重启服务');
console.log('4. 测试验证');
`;

// 导出所有补丁
module.exports = {
  CHARACTER_MODEL_PATCH,
  CHARACTERS_ROUTE_PATCH,
  DIALOGUE_SERVICE_PATCH,
  INSTALLATION_SCRIPT
};
