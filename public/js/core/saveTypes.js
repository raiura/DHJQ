/**
 * 存档系统类型定义
 * @module Core/SaveTypes
 * @description 角色级独立存档的数据结构定义
 */

/**
 * 存档槽位（顶层结构）
 * @typedef {Object} SaveSlot
 * @property {string} id - 存档ID (save_xxx)
 * @property {string} name - 用户命名
 * @property {number} createdAt - 创建时间戳
 * @property {number} lastModified - 最后修改时间戳
 * @property {Map<string, CharacterArchive>} characters - 角色独立档案
 * @property {WorldState} world - 共享世界状态
 * @property {PlayerPreferences} player - 玩家偏好设置
 */

/**
 * 角色独立档案（核心！）
 * @typedef {Object} CharacterArchive
 * @property {string} characterId - 角色ID
 * @property {string} templateId - 关联的角色模板ID
 * @property {number} favor - 好感度 (-100 ~ 100)
 * @property {number} trust - 信任度 (0 ~ 100)
 * @property {number} intimacy - 亲密值 (0 ~ 100, 隐藏)
 * @property {CharacterStatus} status - 实时状态
 * @property {CharacterMemories} memories - 记忆系统
 * @property {DialogueMessage[]} dialogueLog - 完整对话历史
 * @property {CharacterUnlocked} unlocked - 解锁内容
 * @property {CharacterConfig} [config] - 角色专属配置
 */

/**
 * 角色状态
 * @typedef {Object} CharacterStatus
 * @property {string} mood - 当前心情 (calm/happy/angry/sad/shy/surprise/serious/hurt)
 * @property {string} location - 当前所在地点
 * @property {string} activity - 正在进行的活动
 * @property {boolean} isPresent - 是否在场可对话
 * @property {number} lastMet - 上次见面时间戳
 */

/**
 * 角色记忆系统（完全独立！）
 * @typedef {Object} CharacterMemories
 * @property {ShortTermMemory[]} shortTerm - 短期记忆（最近N轮）
 * @property {LongTermMemory[]} longTerm - 长期记忆（压缩摘要）
 * @property {CoreMemory[]} core - 核心记忆（永不遗忘）
 * @property {Experience[]} experiences - 经历档案（UI展示用）
 */

/**
 * 对话消息
 * @typedef {Object} DialogueMessage
 * @property {string} id - 消息ID
 * @property {'player'|'assistant'|'system'} role - 角色
 * @property {string} content - 内容
 * @property {number} timestamp - 时间戳
 * @property {string} [emotion] - 情感类型（AI回复）
 * @property {number} [emotionLevel] - 情感强度 1-3
 * @property {string} [location] - 发生地点
 * @property {string[]} [tags] - 标签
 */

/**
 * 经历条目
 * @typedef {Object} Experience
 * @property {string} id - 经历ID
 * @property {string} title - 标题
 * @property {string} description - 描述
 * @property {string} [icon] - 图标
 * @property {number} unlockedAt - 解锁时间
 * @property {boolean} isRevealed - 是否已在UI展示
 * @property {string} [trigger] - 触发条件描述
 */

/**
 * 解锁内容
 * @typedef {Object} CharacterUnlocked
 * @property {string[]} secrets - 知道的秘密ID
 * @property {string[]} scenes - 解锁的场景CG
 * @property {string[]} topics - 可聊的话题标签
 * @property {string[]} endings - 已触发的结局片段
 */

/**
 * 世界状态（跨角色共享）
 * @typedef {Object} WorldState
 * @property {GameTime} gameTime - 游戏内时间
 * @property {number} timeSpeed - 时间流逝速度
 * @property {string} weather - 天气
 * @property {string} season - 季节
 * @property {Object.<string, LocationState>} locations - 地点状态
 * @property {PlotState} plot - 剧情状态
 * @property {InventoryItem[]} inventory - 背包物品
 * @property {Object.<string, number>} resources - 资源数量
 */

/**
 * 游戏时间
 * @typedef {Object} GameTime
 * @property {number} year
 * @property {number} month
 * @property {number} day
 * @property {number} hour
 * @property {number} minute
 */

/**
 * 地点状态
 * @typedef {Object} LocationState
 * @property {boolean} unlocked - 是否解锁
 * @property {number} visitedCount - 访问次数
 * @property {string[]} currentCharacters - 当前在场的角色
 * @property {Object} state - 地点动态状态
 */

/**
 * 剧情状态
 * @typedef {Object} PlotState
 * @property {string} currentChapter - 当前章节
 * @property {string} currentScene - 当前场景
 * @property {Object.<string, boolean>} flags - 剧情标记
 * @property {string[]} branches - 已激活的分支
 */

/**
 * 玩家偏好设置
 * @typedef {Object} PlayerPreferences
 * @property {AIConfig} ai - AI行为配置
 * @property {UIConfig} ui - 界面配置
 * @property {GameConfig} game - 游戏配置
 */

/**
 * AI配置
 * @typedef {Object} AIConfig
 * @property {number} temperature - 温度
 * @property {number} maxTokens - 最大token
 * @property {number} memoryDepth - 上下文长度
 * @property {string} model - 模型名称
 * @property {string} [apiKey] - API密钥
 * @property {string} [apiUrl] - API地址
 */

/**
 * UI配置
 * @typedef {Object} UIConfig
 * @property {'light'|'dark'|'auto'} theme - 主题
 * @property {number} fontSize - 字体大小
 * @property {boolean} cgAnimation - CG动画开关
 * @property {number} textSpeed - 文字显示速度
 */

/**
 * 游戏配置
 * @typedef {Object} GameConfig
 * @property {boolean} autoSave - 自动保存
 * @property {number} autoSaveInterval - 自动保存间隔（分钟）
 * @property {boolean} skipRead - 已读文本快进
 */

// 情感类型枚举
const EmotionType = {
    CALM: 'calm',
    HAPPY: 'happy',
    ANGRY: 'angry',
    SAD: 'sad',
    SHY: 'shy',
    SURPRISE: 'surprise',
    SERIOUS: 'serious',
    HURT: 'hurt'
};

// 好感度等级
const FavorLevel = {
    HOSTILE: { min: -100, max: -20, name: '敌对', color: '#616161' },
    COLD: { min: -20, max: 0, name: '冷淡', color: '#9e9e9e' },
    NEUTRAL: { min: 0, max: 40, name: '普通', color: '#ffb347' },
    FRIENDLY: { min: 40, max: 70, name: '友好', color: '#ff6b9d' },
    INTIMATE: { min: 70, max: 100, name: '亲密', color: '#ff1744' }
};

/**
 * 获取好感度等级
 * @param {number} favor - 好感度值
 * @returns {Object} 等级信息
 */
function getFavorLevel(favor) {
    for (const level of Object.values(FavorLevel)) {
        if (favor >= level.min && favor < level.max) {
            return level;
        }
    }
    return FavorLevel.NEUTRAL;
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EmotionType, FavorLevel, getFavorLevel };
}
