/**
 * 类型定义
 * @module Types
 * @description 项目全局类型定义
 */

/**
 * ============================================
 * 存档相关类型
 * ============================================
 */

/**
 * @typedef {Object} SaveSlot
 * @property {string} id - 存档唯一标识
 * @property {string} name - 存档名称
 * @property {string} startChapter - 起始章节ID
 * @property {string} currentChapter - 当前章节ID
 * @property {WorldState} world - 世界状态
 * @property {Object.<string, CharacterArchive>} characters - 角色档案映射
 * @property {PlayerOverrides} playerOverrides - 玩家覆盖数据
 * @property {PlayerArchive} player - 玩家档案
 * @property {number} createdAt - 创建时间戳
 * @property {number} updatedAt - 更新时间戳
 */

/**
 * @typedef {Object} WorldState
 * @property {string} location - 当前地点
 * @property {string} weather - 天气状况
 * @property {GameTime} gameTime - 游戏内时间
 * @property {Object.<string, boolean>} flags - 剧情标记
 */

/**
 * @typedef {Object} GameTime
 * @property {number} year - 年
 * @property {number} month - 月
 * @property {number} day - 日
 * @property {number} hour - 时
 * @property {number} minute - 分
 */

/**
 * @typedef {Object} PlayerOverrides
 * @property {Object.<string, CharacterOverride>} characters - 角色覆盖数据
 */

/**
 * @typedef {Object} CharacterOverride
 * @property {number} [favor] - 好感度覆盖
 * @property {number} [trust] - 信任度覆盖
 * @property {string} [location] - 位置覆盖
 * @property {string} [mood] - 心情覆盖
 * @property {ExperienceEntry[]} [experiences] - 额外经历
 */

/**
 * @typedef {Object} PlayerArchive
 * @property {PlayerMemoryEntry[]} memories - 记忆列表
 * @property {string[]} shortTerm - 短期记忆ID列表
 * @property {string[]} longTerm - 长期记忆ID列表
 * @property {string[]} core - 核心记忆ID列表
 * @property {string[]} bookmarks - 收藏的记忆ID列表
 * @property {string[]} tags - 记忆标签
 */

/**
 * ============================================
 * 角色相关类型
 * ============================================
 */

/**
 * @typedef {Object} CharacterArchive
 * @property {string} id - 角色ID
 * @property {string} name - 角色名称
 * @property {number} favor - 好感度 (-100 ~ 100)
 * @property {number} trust - 信任度 (0 ~ 100)
 * @property {string} location - 当前位置
 * @property {string} mood - 心情状态
 * @property {string} [avatar] - 头像URL
 * @property {string} [description] - 角色描述
 * @property {ExperienceEntry[]} experiences - 经历列表
 * @property {string[]} secrets - 秘密列表
 */

/**
 * @typedef {Object} ExperienceEntry
 * @property {string} id - 经历唯一标识
 * @property {number} generatedAt - 生成时间戳
 * @property {GameTime} gameTime - 游戏内时间
 * @property {string} triggerType - 触发类型
 * @property {Object} triggerData - 触发数据
 * @property {string} title - 经历标题
 * @property {string} description - 经历描述
 * @property {string} fullContext - 完整上下文
 * @property {number} emotionalImpact - 情感冲击值 (1-10)
 * @property {number} favorDelta - 好感度变化
 * @property {boolean} isRevealed - 是否已揭示
 * @property {PlayerEdits} playerEdits - 玩家编辑
 */

/**
 * @typedef {Object} PlayerEdits
 * @property {string} [customTitle] - 自定义标题
 * @property {string} [customDescription] - 自定义描述
 * @property {string} [playerNote] - 玩家备注
 * @property {boolean} isHidden - 是否隐藏
 */

/**
 * ============================================
 * 记忆相关类型
 * ============================================
 */

/**
 * @typedef {Object} PlayerMemoryEntry
 * @property {string} id - 记忆唯一标识
 * @property {string} type - 记忆类型
 * @property {number} createdAt - 创建时间戳
 * @property {GameTime} gameTime - 游戏内时间
 * @property {string} title - 记忆标题
 * @property {string} description - 记忆描述
 * @property {string[]} relatedCharacters - 相关角色ID列表
 * @property {string} [relatedLocation] - 相关地点
 * @property {string} [relatedPlotFlag] - 相关剧情标记
 * @property {number} importance - 重要度 (1-10)
 * @property {boolean} isCore - 是否为核心记忆
 * @property {number} referencedCount - 引用次数
 * @property {number} [lastReferenced] - 最后引用时间
 * @property {string} [playerNote] - 玩家备注
 * @property {boolean} isHidden - 是否隐藏
 */

/**
 * @typedef {string} PlayerMemoryType
 * @description 记忆类型枚举
 * - 'CHARACTER_FIRST_MEET' - 首次遇见角色
 * - 'IMPORTANT_DIALOGUE' - 重要对话
 * - 'PLOT_EVENT' - 剧情事件
 * - 'DISCOVERY' - 发现/获取信息
 * - 'ACHIEVEMENT' - 成就/里程碑
 * - 'PLAYER_FEELING' - 玩家感受
 * - 'WORLD_STATE' - 世界状态变化
 */

/**
 * ============================================
 * 经历生成相关类型
 * ============================================
 */

/**
 * @typedef {Object} TriggerResult
 * @property {string} type - 触发器类型
 * @property {Object} data - 触发数据
 */

/**
 * @typedef {Object} GeneratedExperience
 * @property {string} title - 标题
 * @property {string} description - 描述
 * @property {string} fullContext - 完整上下文
 * @property {number} emotionalImpact - 情感冲击值
 * @property {number} favorDelta - 好感度变化
 * @property {string} triggerType - 触发类型
 * @property {Object} triggerData - 触发数据
 * @property {string} generatedBy - 生成方式 (AI/TEMPLATE)
 */

/**
 * @typedef {Object} TriggerContext
 * @property {string} characterId - 角色ID
 * @property {CharacterArchive} character - 角色数据
 * @property {number} previousFavor - 之前的好感度
 * @property {string} playerInput - 玩家输入
 * @property {string} aiReply - AI回复
 * @property {SaveSlot} save - 存档数据
 * @property {string[]} newlySetFlags - 新设置的剧情标记
 */

/**
 * ============================================
 * 游戏相关类型
 * ============================================
 */

/**
 * @typedef {Object} GameConfig
 * @property {string} id - 游戏ID
 * @property {string} title - 游戏标题
 * @property {string} [subtitle] - 副标题
 * @property {string} slug - URL标识
 * @property {string} [description] - 游戏描述
 * @property {string} [cover] - 封面图URL
 * @property {string} [background] - 背景图URL
 * @property {string} [worldSetting] - 世界设定
 * @property {string} [genre] - 游戏类型
 * @property {string[]} [tags] - 标签列表
 * @property {string} status - 状态 (published/draft)
 * @property {GameStats} stats - 统计信息
 */

/**
 * @typedef {Object} GameStats
 * @property {number} plays - 游玩次数
 * @property {number} rating - 评分
 * @property {number} favorites - 收藏数
 */

/**
 * ============================================
 * API 相关类型
 * ============================================
 */

/**
 * @typedef {Object} APIResponse
 * @property {boolean} success - 是否成功
 * @property {string} message - 消息
 * @property {*} [data] - 响应数据
 * @property {Object} [pagination] - 分页信息
 */

/**
 * @typedef {Object} PaginationInfo
 * @property {number} page - 当前页
 * @property {number} pageSize - 每页大小
 * @property {number} total - 总数
 * @property {number} totalPages - 总页数
 */

/**
 * ============================================
 * UI 相关类型
 * ============================================
 */

/**
 * @typedef {Object} ToastOptions
 * @property {string} type - 类型 (success/error/warning/info)
 * @property {number} [duration] - 显示时长 (ms)
 * @property {boolean} [closable] - 是否可关闭
 * @property {Function} [onClose] - 关闭回调
 */

/**
 * @typedef {Object} ModalOptions
 * @property {string} title - 标题
 * @property {string} [content] - 内容
 * @property {string} [confirmText] - 确认按钮文本
 * @property {string} [cancelText] - 取消按钮文本
 * @property {boolean} [showCancel] - 是否显示取消按钮
 * @property {Function} [onConfirm] - 确认回调
 * @property {Function} [onCancel] - 取消回调
 */

// 导出类型（用于TypeScript或IDE识别）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {};
}
