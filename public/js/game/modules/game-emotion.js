/**
 * 情感系统模块
 * 管理角色情感状态和提示词
 */

// 获取情感系统提示词
function getEmotionSystemPrompt() {
    return `
【情感标签系统 - 必须遵守】
你必须在每句角色对话的末尾添加情感标签，格式如下：
[emotion:类型]或[emotion:类型:强度]

【情感类型说明】
- calm: 平静/日常/普通对话
- happy: 开心/笑/满足
- angry: 生气/怒/威严/命令
- sad: 悲伤/失落/沉默
- shy: 害羞/脸红/结巴/傲娇
- surprise: 惊讶/震惊/意外
- serious: 认真/严肃/战斗/责任
- hurt: 受伤/痛苦/脆弱

【强度等级】
- :1 轻微（略显）
- :2 中等（明显）← 默认
- :3 强烈（情绪爆发）

【示例】
玩家："你好"
你："嗯，找我何事？[emotion:calm:1]"

玩家："谢谢你"
你："（转过头）才、才不是为了你呢...[emotion:shy:2]"

玩家："你去哪了"
你："这不关你的事！[emotion:angry:2]"

【重要规则】
1. 每句对话必须包含一个情感标签
2. 标签放在句子最末尾
3. 根据对话内容和角色性格选择合适的情感
4. 情感应该与对话内容一致
`;
}

// 解析情感标签
function parseEmotionTag(text) {
    const match = text.match(/\[emotion:(\w+)(?::(\d))?\]$/);
    if (match) {
        return {
            type: match[1],
            intensity: parseInt(match[2] || '2'),
            raw: match[0]
        };
    }
    return null;
}

// 移除情感标签
function removeEmotionTag(text) {
    return text.replace(/\s*\[emotion:[^\]]+\]\s*$/, '').trim();
}

// 获取情感对应的颜色
function getEmotionColor(emotionType) {
    const colors = {
        calm: '#a0a0a0',
        happy: '#f1c40f',
        angry: '#e74c3c',
        sad: '#3498db',
        shy: '#e91e63',
        surprise: '#9b59b6',
        serious: '#2c3e50',
        hurt: '#c0392b'
    };
    return colors[emotionType] || '#a0a0a0';
}

// 获取情感中文名称
function getEmotionLabel(emotionType) {
    const labels = {
        calm: '平静',
        happy: '开心',
        angry: '生气',
        sad: '悲伤',
        shy: '害羞',
        surprise: '惊讶',
        serious: '认真',
        hurt: '受伤'
    };
    return labels[emotionType] || emotionType;
}

// 导出到全局
if (typeof window !== 'undefined') {
    window.getEmotionSystemPrompt = getEmotionSystemPrompt;
    window.parseEmotionTag = parseEmotionTag;
    window.removeEmotionTag = removeEmotionTag;
    window.getEmotionColor = getEmotionColor;
    window.getEmotionLabel = getEmotionLabel;
}
