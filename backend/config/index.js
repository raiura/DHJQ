/**
 * 统一配置管理
 * 所有配置集中管理，避免硬编码
 */

require('dotenv').config();

const config = {
  // 服务器配置
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development'
  },

  // 数据库配置
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/galgame'
  },

  // AI API 配置
  ai: {
    apiKey: process.env.API_KEY,
    apiUrl: process.env.API_URL || 'https://api.siliconflow.cn/v1/chat/completions',
    model: process.env.MODEL || 'Pro/deepseek-ai/DeepSeek-V3.2',
    maxTokens: 1000,
    temperature: 0.7
  },

  // JWT 配置
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },

  // 默认数据配置
  defaults: {
    characters: [
      {
        name: '林婉',
        color: '#FF69B4',
        image: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'400\'%3E%3Crect fill=\'%23FF69B4\' width=\'300\' height=\'400\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' fill=\'%23fff\' font-family=\'Microsoft YaHei\' font-size=\'20\' text-anchor=\'middle\'%3E林婉%3C/text%3E%3C/svg%3E',
        prompt: '林婉是一个温柔、细腻、关心他人的女孩，说话轻声细语，总是为他人着想。她是修仙世界的向导，对周围的环境非常熟悉。',
        enabled: true
      },
      {
        name: '陆苍雪',
        color: '#87CEFA',
        image: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'400\'%3E%3Crect fill=\'%234ECDC4\' width=\'300\' height=\'400\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' fill=\'%23fff\' font-family=\'Microsoft YaHei\' font-size=\'20\' text-anchor=\'middle\'%3E陆苍雪%3C/text%3E%3C/svg%3E',
        prompt: '陆苍雪是一个冷静、智慧、神秘的男孩，擅长冰系法术。他说话简洁有力，富有哲理，给人一种高深莫测的感觉。',
        enabled: true
      },
      {
        name: '轩辕霓裳',
        color: '#FF4500',
        image: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'400\'%3E%3Crect fill=\'%23FFD93D\' width=\'300\' height=\'400\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' fill=\'%23fff\' font-family=\'Microsoft YaHei\' font-size=\'20\' text-anchor=\'middle\'%3E轩辕霓裳%3C/text%3E%3C/svg%3E',
        prompt: '轩辕霓裳是一个活泼、热情、豪爽的女孩，充满活力和趣味性。她喜欢热闹的地方，总是能给周围的人带来快乐。',
        enabled: true
      }
    ],
    worldbook: {
      content: '这是一个修仙世界，充满了神秘和奇迹。'
    }
  }
};

// 验证必要的环境变量
const requiredEnvVars = ['API_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn(`警告: 缺少环境变量: ${missingVars.join(', ')}，将使用默认值`);
}

module.exports = config;
