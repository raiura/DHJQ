/**
 * 章节模板数据 - 游戏本体的线性时间线定义
 * @module Core/ChapterTemplates
 * @description 定义各章节的默认世界状态和角色状态
 */

/**
 * 章节模板数据库
 * @constant {Object.<string, ChapterTemplate>}
 */
const ChapterTemplates = {
    'ch1': {
        id: 'ch1',
        name: '第一章 宗门试炼',
        description: '初入落星剑宗，参加宗门大比',
        unlockTime: { year: 2026, month: 3, day: 1, hour: 8, minute: 0 },
        
        defaultWorld: {
            location: '落星剑宗广场',
            weather: 'sunny',
            season: 'spring',
            flags: {
                'ch1_started': true,
                'sect_entrance': true
            }
        },
        
        defaultCharacters: {
            'char_lucangxue': {
                favor: 0,
                trust: 10,
                intimacy: 0,
                location: '比武台',
                mood: 'serious',
                experiences: ['ch1_sect_meet', 'ch1_tournament'],
                secrets: []
            },
            'char_xuanyuannishang': {
                favor: 0,
                trust: 10,
                intimacy: 0,
                location: '观礼台',
                mood: 'calm',
                experiences: ['ch1_royal_arrival', 'ch1_first_impression'],
                secrets: []
            },
            'char_linwan': {
                favor: 10,
                trust: 20,
                intimacy: 5,
                location: '药房',
                mood: 'happy',
                experiences: ['ch1_pharmacy_meet', 'ch1_healing'],
                secrets: ['wan_medical_skill']
            }
        }
    },
    
    'ch2': {
        id: 'ch2',
        name: '第二章 魔教入侵',
        description: '魔教突袭宗门，并肩抗敌',
        unlockTime: { year: 2026, month: 3, day: 15, hour: 20, minute: 0 },
        
        defaultWorld: {
            location: '宗门山门',
            weather: 'storm',
            season: 'spring',
            flags: {
                'ch2_started': true,
                'demon_attack': true,
                'sect_defense': true
            }
        },
        
        defaultCharacters: {
            'char_lucangxue': {
                favor: 30,
                trust: 40,
                intimacy: 15,
                location: '山门战场',
                mood: 'serious',
                experiences: ['ch1_sect_meet', 'ch1_tournament', 'ch2_battle_together', 'ch2_sword_display'],
                secrets: ['lcx_sword_injury']
            },
            'char_xuanyuannishang': {
                favor: 25,
                trust: 30,
                intimacy: 10,
                location: '指挥台',
                mood: 'serious',
                experiences: ['ch1_royal_arrival', 'ch1_first_impression', 'ch2_royal_command', 'ch2_joint_defense'],
                secrets: []
            },
            'char_linwan': {
                favor: 35,
                trust: 45,
                intimacy: 20,
                location: '伤兵营',
                mood: 'concerned',
                experiences: ['ch1_pharmacy_meet', 'ch1_healing', 'ch2_medical_support', 'ch2_night_care'],
                secrets: ['wan_medical_skill', 'wan_hidden_worry']
            }
        }
    },
    
    'ch3': {
        id: 'ch3',
        name: '第三章 雪原疑云',
        description: '调查北寒冰龙脉异变',
        unlockTime: { year: 2026, month: 3, day: 25, hour: 18, minute: 0 },
        
        defaultWorld: {
            location: '冰龙脉入口',
            weather: 'snow',
            season: 'winter',
            flags: {
                'ch3_started': true,
                'snow_storm': true,
                'ice_dragon_awake': false
            }
        },
        
        defaultCharacters: {
            'char_lucangxue': {
                favor: 60,
                trust: 70,
                intimacy: 40,
                location: '冰龙脉',
                mood: 'concerned',
                experiences: [
                    'ch1_sect_meet', 'ch1_tournament', 
                    'ch2_battle_together', 'ch2_sword_display',
                    'ch3_snow_march', 'ch3_ice_cave', 'ch3_dragon_secret'
                ],
                secrets: ['lcx_sword_injury', 'lcx_dragon_blood']
            },
            'char_xuanyuannishang': {
                favor: 40,
                trust: 50,
                intimacy: 25,
                location: '冰龙脉外围',
                mood: 'calm',
                experiences: [
                    'ch1_royal_arrival', 'ch1_first_impression',
                    'ch2_royal_command', 'ch2_joint_defense',
                    'ch3_political_mission'
                ],
                secrets: ['ns_royal_secret']
            },
            'char_linwan': {
                favor: 50,
                trust: 60,
                intimacy: 35,
                location: '临时营地',
                mood: 'worried',
                experiences: [
                    'ch1_pharmacy_meet', 'ch1_healing',
                    'ch2_medical_support', 'ch2_night_care',
                    'ch3_cold_research'
                ],
                secrets: ['wan_medical_skill', 'wan_hidden_worry', 'wan_ice_poison_cure']
            }
        }
    },
    
    'ch4': {
        id: 'ch4',
        name: '第四章 龙脉觉醒',
        description: '冰龙脉彻底苏醒，面临最终抉择',
        unlockTime: { year: 2026, month: 4, day: 5, hour: 0, minute: 0 },
        
        defaultWorld: {
            location: '龙脉核心',
            weather: 'blizzard',
            season: 'winter',
            flags: {
                'ch4_started': true,
                'ice_dragon_awake': true,
                'final_choice': true
            }
        },
        
        defaultCharacters: {
            'char_lucangxue': {
                favor: 80,
                trust: 85,
                intimacy: 60,
                location: '龙脉核心',
                mood: 'hurt',
                experiences: [
                    'ch1_sect_meet', 'ch1_tournament', 
                    'ch2_battle_together', 'ch2_sword_display',
                    'ch3_snow_march', 'ch3_ice_cave', 'ch3_dragon_secret',
                    'ch4_dragon_dance', 'ch4_soul_bond'
                ],
                secrets: ['lcx_sword_injury', 'lcx_dragon_blood', 'lcx_final_sacrifice']
            },
            'char_xuanyuannishang': {
                favor: 60,
                trust: 70,
                intimacy: 45,
                location: '龙脉核心',
                mood: 'serious',
                experiences: [
                    'ch1_royal_arrival', 'ch1_first_impression',
                    'ch2_royal_command', 'ch2_joint_defense',
                    'ch3_political_mission',
                    'ch4_royal_choice'
                ],
                secrets: ['ns_royal_secret', 'ns_throne_promise']
            },
            'char_linwan': {
                favor: 70,
                trust: 75,
                intimacy: 55,
                location: '龙脉核心',
                mood: 'determined',
                experiences: [
                    'ch1_pharmacy_meet', 'ch1_healing',
                    'ch2_medical_support', 'ch2_night_care',
                    'ch3_cold_research',
                    'ch4_life_choice'
                ],
                secrets: ['wan_medical_skill', 'wan_hidden_worry', 'wan_ice_poison_cure', 'wan_forbidden_arts']
            }
        }
    },
    
    'ch5': {
        id: 'ch5',
        name: '第五章 最终决战',
        description: '正邪决战，命运抉择',
        unlockTime: { year: 2026, month: 4, day: 15, hour: 12, minute: 0 },
        
        defaultWorld: {
            location: '九丘之巅',
            weather: 'chaos',
            season: 'unknown',
            flags: {
                'ch5_started': true,
                'final_battle': true,
                'world_crisis': true
            }
        },
        
        defaultCharacters: {
            'char_lucangxue': {
                favor: 90,
                trust: 95,
                intimacy: 80,
                location: '九丘之巅',
                mood: 'serious',
                experiences: [
                    'ch1_sect_meet', 'ch1_tournament', 
                    'ch2_battle_together', 'ch2_sword_display',
                    'ch3_snow_march', 'ch3_ice_cave', 'ch3_dragon_secret',
                    'ch4_dragon_dance', 'ch4_soul_bond',
                    'ch5_final_stand'
                ],
                secrets: ['lcx_sword_injury', 'lcx_dragon_blood', 'lcx_final_sacrifice']
            },
            'char_xuanyuannishang': {
                favor: 80,
                trust: 85,
                intimacy: 70,
                location: '九丘之巅',
                mood: 'serious',
                experiences: [
                    'ch1_royal_arrival', 'ch1_first_impression',
                    'ch2_royal_command', 'ch2_joint_defense',
                    'ch3_political_mission',
                    'ch4_royal_choice',
                    'ch5_throne_decision'
                ],
                secrets: ['ns_royal_secret', 'ns_throne_promise']
            },
            'char_linwan': {
                favor: 85,
                trust: 90,
                intimacy: 75,
                location: '九丘之巅',
                mood: 'calm',
                experiences: [
                    'ch1_pharmacy_meet', 'ch1_healing',
                    'ch2_medical_support', 'ch2_night_care',
                    'ch3_cold_research',
                    'ch4_life_choice',
                    'ch5_healer_oath'
                ],
                secrets: ['wan_medical_skill', 'wan_hidden_worry', 'wan_ice_poison_cure', 'wan_forbidden_arts']
            }
        }
    }
};

/**
 * 经历模板数据库
 * @constant {Object.<string, ExperienceTemplate>}
 */
const ExperienceTemplates = {
    // 第一章经历
    'ch1_sect_meet': {
        id: 'ch1_sect_meet',
        chapter: 'ch1',
        title: '宗门初遇',
        description: '你在宗门大比中首次注意到这个冷傲的剑修。她的剑法凌厉，却带着一丝难以察觉的哀伤。',
        impact: '初次相识，印象一般',
        icon: '⚔️',
        category: '相遇'
    },
    'ch1_tournament': {
        id: 'ch1_tournament',
        chapter: 'ch1',
        title: '比武争锋',
        description: '在比武台上，你们有过短暂交手。她的剑气如霜，让你印象深刻。',
        impact: '展现了彼此的实力',
        icon: '🏆',
        category: '战斗'
    },
    'ch1_pharmacy_meet': {
        id: 'ch1_pharmacy_meet',
        chapter: 'ch1',
        title: '药房邂逅',
        description: '在药房求药时遇见了温柔的医女林婉。她细心地为你诊治，让人心生好感。',
        impact: '建立了良好的第一印象',
        icon: '🌿',
        category: '相遇'
    },
    'ch1_healing': {
        id: 'ch1_healing',
        chapter: 'ch1',
        title: '悉心照料',
        description: '比武受伤后，林婉多次为你换药疗伤。她的温柔体贴让人感到温暖。',
        impact: '关系更加亲近',
        icon: '💊',
        category: '互动'
    },
    'ch1_royal_arrival': {
        id: 'ch1_royal_arrival',
        chapter: 'ch1',
        title: '皇室驾临',
        description: '轩辕皇朝的公主驾临宗门，她的高贵气质和神秘身份引起了你的注意。',
        impact: '初次见面，保持距离',
        icon: '👑',
        category: '相遇'
    },
    
    // 第二章经历
    'ch2_battle_together': {
        id: 'ch2_battle_together',
        chapter: 'ch2',
        title: '并肩抗敌',
        description: '魔教入侵时，你们背靠背作战。生死关头，她的剑始终守护在你身侧。',
        impact: '信任大幅提升',
        icon: '🛡️',
        category: '战斗'
    },
    'ch2_sword_display': {
        id: 'ch2_sword_display',
        chapter: 'ch2',
        title: '剑意共鸣',
        description: '战斗间隙，她向你展示了落星剑宗的秘传剑法。那一刻，你似乎触及了她的内心。',
        impact: '好感度提升，了解加深',
        icon: '✨',
        category: '互动'
    },
    'ch2_medical_support': {
        id: 'ch2_medical_support',
        chapter: 'ch2',
        title: '战场救护',
        description: '林婉在战场后方设立医帐，救治伤员。你也曾帮她运送过药材。',
        impact: '共同经历了艰苦时刻',
        icon: '🏥',
        category: '互动'
    },
    'ch2_night_care': {
        id: 'ch2_night_care',
        chapter: 'ch2',
        title: '夜话疗伤',
        description: '深夜送伤员去医帐，发现林婉还在忙碌。你们聊了很久关于修行的感悟。',
        impact: '关系更加亲密',
        icon: '🌙',
        category: '剧情'
    },
    'ch2_royal_command': {
        id: 'ch2_royal_command',
        chapter: 'ch2',
        title: '皇室号令',
        description: '轩辕霓裳以皇室身份协调各派防御，展现了卓越的领导才能。',
        impact: '对她的能力有了新的认识',
        icon: '📜',
        category: '剧情'
    },
    
    // 第三章经历
    'ch3_snow_march': {
        id: 'ch3_snow_march',
        chapter: 'ch3',
        title: '雪原行军',
        description: '在暴风雪中艰难前行，她始终走在队伍前方开路，从不抱怨。',
        impact: '见识了她的坚韧',
        icon: '❄️',
        category: '剧情'
    },
    'ch3_ice_cave': {
        id: 'ch3_ice_cave',
        chapter: 'ch3',
        title: '冰窟探秘',
        description: '在冰龙脉深处，你们发现了一个古老的秘密。她似乎知道些什么...',
        impact: '触及了她的秘密',
        icon: '🧊',
        category: '探索'
    },
    'ch3_dragon_secret': {
        id: 'ch3_dragon_secret',
        chapter: 'ch3',
        title: '龙血之秘',
        description: '你发现了陆苍雪身怀龙血的秘密。她选择向你坦白，这是极大的信任。',
        impact: '信任达到新的高度',
        icon: '🐉',
        category: '剧情'
    },
    'ch3_cold_research': {
        id: 'ch3_cold_research',
        chapter: 'ch3',
        title: '寒毒研究',
        description: '林婉在研究冰龙脉的寒毒，试图找到治疗方法。你帮她收集了不少样本。',
        impact: '共同进行学术探索',
        icon: '🔬',
        category: '互动'
    },
    'ch3_political_mission': {
        id: 'ch3_political_mission',
        chapter: 'ch3',
        title: '皇室使命',
        description: '轩辕霓裳透露了此行的政治目的：为皇室寻找龙脉之力。',
        impact: '了解了她背负的责任',
        icon: '⚖️',
        category: '剧情'
    }
    // ... 可以继续添加更多经历
};

/**
 * 章节数据库访问
 */
const ChapterDB = {
    /**
     * 获取章节模板
     * @param {string} chapterId - 章节ID
     * @returns {ChapterTemplate|null}
     */
    get(chapterId) {
        return ChapterTemplates[chapterId] || null;
    },
    
    /**
     * 获取所有章节列表
     * @returns {Array<{id: string, name: string}>}
     */
    getAll() {
        return Object.values(ChapterTemplates).map(ch => ({
            id: ch.id,
            name: ch.name,
            description: ch.description
        }));
    },
    
    /**
     * 获取章节的角色默认状态
     * @param {string} chapterId - 章节ID
     * @param {string} characterId - 角色ID
     * @returns {CharacterDefaultState|null}
     */
    getCharacterDefault(chapterId, characterId) {
        const chapter = this.get(chapterId);
        if (!chapter) return null;
        return chapter.defaultCharacters[characterId] || null;
    }
};

/**
 * 经历数据库访问
 */
const ExperienceDB = {
    /**
     * 获取经历模板
     * @param {string} expId - 经历ID
     * @returns {ExperienceTemplate|null}
     */
    get(expId) {
        return ExperienceTemplates[expId] || null;
    },
    
    /**
     * 获取章节的所有经历
     * @param {string} chapterId - 章节ID
     * @returns {ExperienceTemplate[]}
     */
    getByChapter(chapterId) {
        return Object.values(ExperienceTemplates).filter(exp => exp.chapter === chapterId);
    },
    
    /**
     * 获取所有经历
     * @returns {ExperienceTemplate[]}
     */
    getAll() {
        return Object.values(ExperienceTemplates);
    },
    
    /**
     * 搜索经历
     * @param {string} keyword - 关键词
     * @returns {ExperienceTemplate[]}
     */
    search(keyword) {
        const lower = keyword.toLowerCase();
        return Object.values(ExperienceTemplates).filter(exp => 
            exp.title.toLowerCase().includes(lower) ||
            exp.description.toLowerCase().includes(lower) ||
            exp.category.toLowerCase().includes(lower)
        );
    }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ChapterTemplates, ExperienceTemplates, ChapterDB, ExperienceDB };
}
