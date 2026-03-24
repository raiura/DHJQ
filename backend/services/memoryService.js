/**
 * 记忆服务 - 三层记忆结构管理
 * 短期记忆 -> 长期记忆 -> 核心记忆 -> 世界书存档
 */

const Memory = require('../models/memory');
const Logger = require('../utils/logger');

class MemoryService {
  constructor() {
    this.MemoryType = Memory.MemoryType || {
      SHORT: 'short',
      LONG: 'long', 
      CORE: 'core'
    };
    this.MemoryStatus = Memory.MemoryStatus || {
      ACTIVE: 'active',
      MERGED: 'merged',
      ARCHIVED: 'archived'
    };
    
    // 配置参数
    this.config = {
      shortMemoryLimit: 6,      // 短期记忆累积6条后合并
      longMemoryLimit: 12,      // 长期记忆每12轮合并一次
      coreMemoryLimit: 20       // 核心记忆上限
    };
  }

  /**
   * 添加短期记忆
   * @param {string} gameId - 游戏ID
   * @param {string} content - 记忆内容
   * @param {object} options - 选项
   */
  async addShortMemory(gameId, content, options = {}) {
    try {
      const { userId, sessionId, turn = 0, tags = [], importance = 50 } = options;
      
      const memory = await Memory.create({
        gameId,
        userId,
        sessionId,
        type: this.MemoryType.SHORT,
        content,
        timestamp: options.timestamp || new Date(),
        turn,
        tags,
        importance,
        status: this.MemoryStatus.ACTIVE
      });
      
      Logger.debug(`[Memory] 添加短期记忆: ${content.substring(0, 50)}...`);
      
      // 检查是否需要合并到长期记忆
      await this._checkAndMergeShortMemories(gameId);
      
      return memory;
    } catch (error) {
      Logger.error('[Memory] 添加短期记忆失败:', error);
      throw error;
    }
  }

  /**
   * 获取记忆（按优先级和时间排序）
   * @param {string} gameId - 游戏ID
   * @param {object} options - 查询选项
   */
  async getMemories(gameId, options = {}) {
    try {
      const { types = ['short', 'long', 'core'], limit = 50, sessionId } = options;
      
      const query = { 
        gameId, 
        type: { $in: types },
        status: this.MemoryStatus.ACTIVE
      };
      if (sessionId) query.sessionId = sessionId;
      
      const memories = await Memory.find(query);
      
      // 按时间正序排序（旧的在前面）
      memories.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      // 限制数量，优先保留核心记忆和最近的长期记忆
      if (memories.length > limit) {
        const coreMemories = memories.filter(m => m.type === this.MemoryType.CORE);
        const otherMemories = memories.filter(m => m.type !== this.MemoryType.CORE);
        
        // 保留所有核心记忆，其他按时间截取
        const remainingSlots = limit - coreMemories.length;
        const slicedOthers = otherMemories.slice(-remainingSlots);
        
        return [...coreMemories, ...slicedOthers].sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );
      }
      
      return memories;
    } catch (error) {
      Logger.error('[Memory] 获取记忆失败:', error);
      return [];
    }
  }

  /**
   * 获取用于AI拼接的记忆（按优先级格式化）
   * @param {string} gameId - 游戏ID
   * @param {object} timelineArchive - 世界书存档时间线
   */
  async getFormattedMemories(gameId, timelineArchive = null) {
    try {
      const memories = await this.getMemories(gameId);
      
      // 按类型分组
      const grouped = {
        short: [],
        long: [],
        core: []
      };
      
      for (const mem of memories) {
        if (grouped[mem.type]) {
          grouped[mem.type].push(mem);
        }
      }
      
      // 格式化各部分
      const result = {
        // 世界书存档时间线（最高优先级）
        timeline: timelineArchive ? this._formatTimelineArchive(timelineArchive) : '',
        
        // 核心记忆
        core: grouped.core.map(m => this._formatMemory(m)).join('\n'),
        
        // 长期记忆
        long: grouped.long.map(m => this._formatMemory(m)).join('\n'),
        
        // 短期记忆
        short: grouped.short.map(m => this._formatMemory(m)).join('\n')
      };
      
      return result;
    } catch (error) {
      Logger.error('[Memory] 格式化记忆失败:', error);
      return { timeline: '', core: '', long: '', short: '' };
    }
  }

  /**
   * 手动固化时间线（将核心记忆写入世界书存档）
   * @param {string} gameId - 游戏ID
   * @param {string} worldbookId - 世界书条目ID（存档·当前时间线）
   */
  async solidifyTimeline(gameId, worldbookId) {
    try {
      // 获取核心记忆
      const coreMemories = await Memory.find({
        gameId,
        type: this.MemoryType.CORE,
        status: this.MemoryStatus.ACTIVE
      });
      
      // 构建存档内容
      const now = new Date();
      const archiveContent = {
        timestamp: now.toISOString(),
        gameTime: this._formatGameTime(now),
        coreMemories: coreMemories.map(m => ({
          time: m.timestamp,
          content: m.content,
          importance: m.importance
        })),
        summary: this._generateSummary(coreMemories)
      };
      
      // 标记这些核心记忆为已固化
      for (const mem of coreMemories) {
        mem.isSolidified = true;
        await mem.save();
      }
      
      Logger.info(`[Memory] 时间线已固化: ${gameId}, 核心记忆数: ${coreMemories.length}`);
      
      return {
        success: true,
        archiveContent,
        solidifiedCount: coreMemories.length
      };
    } catch (error) {
      Logger.error('[Memory] 固化时间线失败:', error);
      throw error;
    }
  }

  /**
   * 检查并合并短期记忆到长期记忆
   */
  async _checkAndMergeShortMemories(gameId) {
    try {
      // 获取活跃的短期记忆
      const shortMemories = await Memory.find({
        gameId,
        type: this.MemoryType.SHORT,
        status: this.MemoryStatus.ACTIVE
      });
      
      // 如果达到合并阈值
      if (shortMemories.length >= this.config.shortMemoryLimit) {
        await this._mergeShortToLong(gameId, shortMemories);
      }
    } catch (error) {
      Logger.error('[Memory] 合并短期记忆失败:', error);
    }
  }

  /**
   * 合并短期记忆到长期记忆
   */
  async _mergeShortToLong(gameId, shortMemories) {
    try {
      // 按时间排序
      shortMemories.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      // 生成摘要内容（去重+时序重排）
      const uniqueContents = [...new Set(shortMemories.map(m => m.content))];
      const mergedContent = this._generateMergedContent(uniqueContents);
      
      // 获取当前最大轮次
      const maxTurn = Math.max(...shortMemories.map(m => m.turn || 0));
      
      // 创建长期记忆
      const longMemory = await Memory.create({
        gameId,
        type: this.MemoryType.LONG,
        content: mergedContent,
        timestamp: shortMemories[shortMemories.length - 1].timestamp,
        turn: maxTurn,
        sourceIds: shortMemories.map(m => m._id),
        tags: [...new Set(shortMemories.flatMap(m => m.tags || []))],
        importance: Math.round(shortMemories.reduce((sum, m) => sum + (m.importance || 50), 0) / shortMemories.length)
      });
      
      // 标记短期记忆为已合并
      for (const mem of shortMemories) {
        mem.status = this.MemoryStatus.MERGED;
        await mem.save();
      }
      
      Logger.info(`[Memory] 短期记忆已合并为长期记忆: ${shortMemories.length}条 -> 1条`);
      
      // 检查是否需要合并长期记忆到核心记忆
      await this._checkAndMergeLongMemories(gameId);
      
      return longMemory;
    } catch (error) {
      Logger.error('[Memory] 合并到长期记忆失败:', error);
      throw error;
    }
  }

  /**
   * 检查并合并长期记忆到核心记忆
   */
  async _checkAndMergeLongMemories(gameId) {
    try {
      // 获取活跃的长期记忆
      const longMemories = await Memory.find({
        gameId,
        type: this.MemoryType.LONG,
        status: this.MemoryStatus.ACTIVE
      });
      
      // 检查是否需要合并（数量达到限制或包含重要内容）
      const needsMerge = longMemories.length >= this.config.longMemoryLimit ||
        longMemories.some(m => (m.importance || 0) >= 80);
      
      if (needsMerge && longMemories.length >= 2) {
        await this._mergeLongToCore(gameId, longMemories);
      }
    } catch (error) {
      Logger.error('[Memory] 合并长期记忆失败:', error);
    }
  }

  /**
   * 合并长期记忆到核心记忆（去重+状态收敛）
   */
  async _mergeLongToCore(gameId, longMemories) {
    try {
      // 按时间排序
      longMemories.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      // 状态收敛：提取关键事实和状态
      const keyFacts = this._extractKeyFacts(longMemories);
      const currentState = this._extractCurrentState(longMemories);
      
      // 生成核心记忆内容
      const coreContent = this._generateCoreContent(keyFacts, currentState);
      
      // 获取当前最大轮次
      const maxTurn = Math.max(...longMemories.map(m => m.turn || 0));
      
      // 创建核心记忆
      const coreMemory = await Memory.create({
        gameId,
        type: this.MemoryType.CORE,
        content: coreContent,
        timestamp: longMemories[longMemories.length - 1].timestamp,
        turn: maxTurn,
        sourceIds: longMemories.map(m => m._id),
        tags: ['核心', '自动总结', ...new Set(longMemories.flatMap(m => m.tags || []))],
        importance: 90 // 核心记忆重要性固定为90
      });
      
      // 标记长期记忆为已合并
      for (const mem of longMemories) {
        mem.status = this.MemoryStatus.MERGED;
        await mem.save();
      }
      
      Logger.info(`[Memory] 长期记忆已合并为核心记忆: ${longMemories.length}条 -> 1条`);
      
      return coreMemory;
    } catch (error) {
      Logger.error('[Memory] 合并到核心记忆失败:', error);
      throw error;
    }
  }

  // ============ 辅助方法 ============

  _formatMemory(memory) {
    const timeStr = this._formatGameTime(memory.timestamp);
    return `[${timeStr}] ${memory.content}`;
  }

  _formatTimelineArchive(archive) {
    if (typeof archive === 'string') return archive;
    if (archive.content) return archive.content;
    return JSON.stringify(archive, null, 2);
  }

  _formatGameTime(date) {
    if (!date) return '未知时间';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  _generateMergedContents(contents) {
    // 简单的合并逻辑：去重后连接
    const unique = [...new Set(contents)];
    if (unique.length === 1) return unique[0];
    return unique.map((c, i) => `${i + 1}. ${c}`).join('\n');
  }

  _extractKeyFacts(memories) {
    const facts = [];
    for (const mem of memories) {
      const lines = mem.content.split(/[。\n]/).filter(l => l.trim());
      for (const line of lines) {
        if (line.includes('获得') || line.includes('失去') || line.includes('达成') || 
            line.includes('完成') || line.includes('击败') || line.includes('发现')) {
          facts.push(line.trim());
        }
      }
    }
    return [...new Set(facts)].slice(0, 10); // 最多保留10条关键事实
  }

  _extractCurrentState(memories) {
    // 提取最新的状态信息
    const latest = memories[memories.length - 1];
    const state = {
      lastUpdate: latest.timestamp,
      turn: latest.turn,
      location: '',
      status: ''
    };
    
    // 尝试从内容中提取位置和状态
    const content = latest.content;
    if (content.includes('在') && content.includes('处')) {
      const match = content.match(/在(.+?)处/);
      if (match) state.location = match[1];
    }
    
    return state;
  }

  _generateCoreContent(facts, state) {
    const parts = [];
    
    if (facts.length > 0) {
      parts.push('【关键事实】');
      parts.push(facts.join('；'));
    }
    
    parts.push(`\n【当前状态】更新时间：${this._formatGameTime(state.lastUpdate)}`);
    if (state.location) parts.push(`当前位置：${state.location}`);
    parts.push(`当前轮次：第${state.turn}轮`);
    
    return parts.join('\n');
  }

  _generateSummary(memories) {
    if (memories.length === 0) return '无核心记忆';
    return `共${memories.length}条核心记忆，最新更新：${this._formatGameTime(memories[memories.length - 1]?.timestamp)}`;
  }
}

// 单例
const memoryService = new MemoryService();
module.exports = memoryService;
