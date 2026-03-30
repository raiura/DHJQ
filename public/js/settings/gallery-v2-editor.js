/**
 * Gallery V2.0 Editor
 * 图库管理界面 - 世界角色CG自由拓展系统
 */

// ===== 全局状态 =====
let galleryV2Images = [];
let currentGalleryEditId = null;
let selectedCharacterId = null;

// ===== 初始化 =====
function initGalleryV2() {
    console.log('[Gallery V2] 初始化图库编辑器');
    loadGalleryV2Images();
}

// ===== 加载图库列表 =====
async function loadGalleryV2Images() {
    const gameId = window.gameId || new URLSearchParams(window.location.search).get('id');
    if (!gameId) {
        console.warn('[Gallery V2] 未找到gameId');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/gallery/v2?gameId=${gameId}`, {
            headers: getAuthHeaders()
        });
        const result = await response.json();

        if (result.success) {
            galleryV2Images = result.data.images || [];
            console.log('[Gallery V2] 加载CG:', galleryV2Images.length);
            renderGalleryV2List();
        }
    } catch (error) {
        console.error('[Gallery V2] 加载失败，尝试本地存储:', error);
        // 降级到本地存储
        loadGalleryV2FromLocal(gameId);
    }
}

// ===== 从本地存储加载 =====
function loadGalleryV2FromLocal(gameId) {
    try {
        const storageKey = `game_${gameId}_gallery_v2`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            galleryV2Images = JSON.parse(saved);
            console.log('[Gallery V2] 从本地存储加载CG:', galleryV2Images.length);
            renderGalleryV2List();
        } else {
            galleryV2Images = [];
            renderGalleryV2List();
        }
    } catch (error) {
        console.error('[Gallery V2] 本地加载失败:', error);
        galleryV2Images = [];
        renderGalleryV2List();
    }
}

// ===== 渲染CG列表 =====
function renderGalleryV2List() {
    const container = document.getElementById('galleryV2List');
    if (!container) return;

    if (galleryV2Images.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 40px; text-align: center;">
                <div class="empty-icon" style="font-size: 48px;">🖼️</div>
                <p>暂无CG图片</p>
                <p style="font-size: 13px; color: var(--text-secondary); margin-top: 8px;">
                    点击"添加CG"创建你的第一个角色CG
                </p>
            </div>
        `;
        return;
    }

    container.innerHTML = galleryV2Images.map(img => {
        const typeLabels = {
            'background': '🌄 背景',
            'character_default': '👤 默认立绘',
            'character_extended': '✨ 拓展CG',
            'scene_event': '🎭 场景事件',
            'special_action': '⚔️ 特殊动作'
        };

        const conditions = img.triggerSystem?.conditions || {};
        const conditionTags = [
            ...(conditions.sceneKeywords || []),
            ...(conditions.emotions || []),
            ...(conditions.actions || [])
        ].slice(0, 5);

        return `
            <div class="gallery-v2-card" data-id="${img._id}" style="
                background: var(--bg-secondary);
                border: 1px solid var(--border);
                border-radius: 12px;
                overflow: hidden;
                transition: all 0.2s;
            ">
                <div style="position: relative; height: 120px; background: linear-gradient(135deg, #1a1a2e, #16213e);">
                    ${img.url ? `
                        <img src="${img.url}" style="width: 100%; height: 100%; object-fit: cover;" 
                             onerror="this.style.display='none'">
                    ` : '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-secondary);">无图片</div>'}
                    <div style="position: absolute; top: 8px; left: 8px;">
                        <span style="background: rgba(0,0,0,0.7); color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 11px;">
                            ${typeLabels[img.type] || img.type}
                        </span>
                    </div>
                </div>
                <div style="padding: 12px;">
                    <div style="font-weight: 600; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${img.name}
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">
                        ${img.characterName ? `👤 ${img.characterName}` : '🌐 通用CG'}
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px;">
                        ${conditionTags.map(tag => `
                            <span style="background: rgba(138, 109, 59, 0.2); color: var(--primary-light); padding: 2px 6px; border-radius: 4px; font-size: 11px;">${tag}</span>
                        `).join('')}
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-sm btn-secondary" onclick="editGalleryV2('${img._id}')">编辑</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteGalleryV2('${img._id}')">删除</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ===== 打开添加/编辑CG模态框 =====
function openGalleryV2Modal(imageId = null) {
    currentGalleryEditId = imageId;
    const isEdit = !!imageId;

    // 重置表单
    document.getElementById('galleryV2Form')?.reset();
    document.getElementById('galleryV2TestResults').innerHTML = '';

    if (isEdit) {
        const img = galleryV2Images.find(i => i._id === imageId);
        if (img) {
            populateGalleryV2Form(img);
        }
    } else {
        // 设置默认值
        document.getElementById('g2_type').value = 'character_extended';
        document.getElementById('g2_triggerMode').value = 'tag_match';
        document.getElementById('g2_displayMode').value = 'character_center';
        document.getElementById('g2_priority').value = 100;
        document.getElementById('g2_probability').value = 1.0;
    }

    // 更新标题
    const title = document.getElementById('galleryV2ModalTitle');
    if (title) title.textContent = isEdit ? '✏️ 编辑CG' : '➕ 添加CG';

    // 显示模态框
    const modal = document.getElementById('galleryV2Modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
    }
}

// ===== 填充表单 =====
function populateGalleryV2Form(img) {
    document.getElementById('g2_name').value = img.name || '';
    document.getElementById('g2_url').value = img.url || '';
    document.getElementById('g2_thumbnail').value = img.thumbnail || '';
    document.getElementById('g2_type').value = img.type || 'character_extended';
    document.getElementById('g2_description').value = img.meta?.description || '';
    
    // 处理角色关联 - 支持自定义角色名
    const characterId = img.characterId || '';
    const customInput = document.getElementById('g2_customCharacterName');
    const select = document.getElementById('g2_characterId');
    const hint = document.getElementById('g2_characterHint');
    
    if (characterId === '__custom__') {
        // 自定义角色
        select.value = '__custom__';
        if (customInput) {
            customInput.value = img.characterName || '';
            customInput.style.display = 'block';
            select.style.display = 'none';
        }
        hint.textContent = `自定义角色: ${img.characterName || ''}`;
    } else {
        // 标准角色或通用
        select.value = characterId;
        if (customInput) {
            customInput.value = '';
            customInput.style.display = 'none';
        }
        select.style.display = 'block';
        hint.textContent = characterId ? `已选择角色` : '通用CG可用于任何角色场景';
    }

    // 触发系统
    const ts = img.triggerSystem || {};
    document.getElementById('g2_triggerMode').value = ts.mode || 'tag_match';
    document.getElementById('g2_sceneKeywords').value = (ts.conditions?.sceneKeywords || []).join(', ');
    document.getElementById('g2_emotions').value = (ts.conditions?.emotions || []).join(', ');
    document.getElementById('g2_actions').value = (ts.conditions?.actions || []).join(', ');
    document.getElementById('g2_relationshipStates').value = (ts.conditions?.relationshipStates || []).join(', ');
    document.getElementById('g2_specialTags').value = (ts.conditions?.specialTags || []).join(', ');
    document.getElementById('g2_priority').value = ts.priority || 100;
    document.getElementById('g2_probability').value = ts.probability || 1.0;

    // 显示设置
    const display = img.display || {};
    document.getElementById('g2_displayMode').value = display.mode || 'character_center';
    document.getElementById('g2_animationEnter').value = display.animation?.enter || 'fade';
    document.getElementById('g2_duration').value = display.animation?.duration || 500;
    document.getElementById('g2_zIndex').value = display.zIndex || 10;

    // 约束条件
    const constraints = img.constraints || {};
    const prereq = constraints.prerequisites || {};
    document.getElementById('g2_minFavor').value = prereq.minFavor || 0;
    document.getElementById('g2_maxFavor').value = prereq.maxFavor || 100;
    document.getElementById('g2_cooldownEnabled').checked = constraints.cooldown?.enabled || false;
    document.getElementById('g2_cooldownDuration').value = constraints.cooldown?.duration || 30;
}

// ===== 处理角色选择变化 =====
function onCharacterSelectChange() {
    const select = document.getElementById('g2_characterId');
    const customInput = document.getElementById('g2_customCharacterName');
    const hint = document.getElementById('g2_characterHint');
    
    if (select.value === '__custom__') {
        // 切换到自定义输入
        select.style.display = 'none';
        customInput.style.display = 'block';
        customInput.focus();
        hint.textContent = '输入角色名，AI将根据此名称匹配场景';
    } else {
        hint.textContent = select.value ? `已选择角色: ${select.selectedOptions[0].text}` : '通用CG可用于任何角色场景';
    }
}

// ===== 处理自定义角色输入失去焦点 =====
function onCustomCharacterBlur() {
    const select = document.getElementById('g2_characterId');
    const customInput = document.getElementById('g2_customCharacterName');
    const hint = document.getElementById('g2_characterHint');
    
    if (!customInput.value.trim()) {
        // 如果没有输入，回到选择框
        select.style.display = 'block';
        customInput.style.display = 'none';
        select.value = '';
        hint.textContent = '通用CG可用于任何角色场景';
    } else {
        hint.textContent = `自定义角色: ${customInput.value}`;
    }
}

// ===== 收集表单数据 =====
function collectGalleryV2FormData() {
    const characterId = document.getElementById('g2_characterId').value;
    const customInput = document.getElementById('g2_customCharacterName');
    const characterSelect = document.getElementById('g2_characterId');
    
    // 处理自定义角色名
    let finalCharacterId = characterId;
    let finalCharacterName = '';
    
    if (characterId === '__custom__' && customInput && customInput.value.trim()) {
        // 使用自定义输入
        finalCharacterId = '__custom__';
        finalCharacterName = customInput.value.trim();
    } else if (characterId && characterId !== '__custom__') {
        // 使用选择的角色
        finalCharacterName = characterSelect?.selectedOptions?.[0]?.text?.replace('👤 ', '') || '';
    }

    return {
        gameId: window.gameId || new URLSearchParams(window.location.search).get('id'),
        characterId: finalCharacterId || null,
        characterName: finalCharacterName,
        name: document.getElementById('g2_name').value,
        url: document.getElementById('g2_url').value,
        thumbnail: document.getElementById('g2_thumbnail').value,
        type: document.getElementById('g2_type').value,
        triggerSystem: {
            mode: document.getElementById('g2_triggerMode').value,
            conditions: {
                sceneKeywords: document.getElementById('g2_sceneKeywords').value.split(',').map(s => s.trim()).filter(Boolean),
                emotions: document.getElementById('g2_emotions').value.split(',').map(s => s.trim()).filter(Boolean),
                actions: document.getElementById('g2_actions').value.split(',').map(s => s.trim()).filter(Boolean),
                relationshipStates: document.getElementById('g2_relationshipStates').value.split(',').map(s => s.trim()).filter(Boolean),
                specialTags: document.getElementById('g2_specialTags').value.split(',').map(s => s.trim()).filter(Boolean)
            },
            priority: parseInt(document.getElementById('g2_priority').value) || 100,
            probability: parseFloat(document.getElementById('g2_probability').value) || 1.0
        },
        display: {
            mode: document.getElementById('g2_displayMode').value,
            animation: {
                enter: document.getElementById('g2_animationEnter').value,
                duration: parseInt(document.getElementById('g2_duration').value) || 500
            },
            zIndex: parseInt(document.getElementById('g2_zIndex').value) || 10
        },
        constraints: {
            prerequisites: {
                minFavor: parseInt(document.getElementById('g2_minFavor').value) || 0,
                maxFavor: parseInt(document.getElementById('g2_maxFavor').value) || 100
            },
            cooldown: {
                enabled: document.getElementById('g2_cooldownEnabled').checked,
                duration: parseInt(document.getElementById('g2_cooldownDuration').value) || 30
            }
        },
        meta: {
            description: document.getElementById('g2_description').value
        }
    };
}

// ===== 保存CG =====
async function saveGalleryV2() {
    const data = collectGalleryV2FormData();

    if (!data.name || !data.url) {
        showToast('名称和URL不能为空', 'error');
        return;
    }

    try {
        const url = currentGalleryEditId
            ? `${API_BASE}/gallery/v2/${currentGalleryEditId}`
            : `${API_BASE}/gallery/v2`;
        const method = currentGalleryEditId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify(data)
        });

        // 处理404错误（内存存储模式下数据可能丢失）
        if (response.status === 404 && currentGalleryEditId) {
            console.warn('[Gallery V2] 编辑的资源不存在（可能是内存存储重启），转为创建新资源');
            // 转为创建模式
            const createResponse = await fetch(`${API_BASE}/gallery/v2`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(data)
            });
            
            const createResult = await createResponse.json();
            if (createResult.success) {
                showToast('CG已添加（资源已重新创建）', 'success');
                closeGalleryV2Modal();
                loadGalleryV2Images();
                return;
            }
        }

        const result = await response.json();

        if (result.success) {
            showToast(currentGalleryEditId ? 'CG已更新' : 'CG已添加', 'success');
            closeGalleryV2Modal();
            loadGalleryV2Images();
        } else {
            showToast(result.message || '保存失败', 'error');
        }
    } catch (error) {
        console.error('[Gallery V2] 保存失败:', error);
        // 降级到本地存储
        saveGalleryV2ToLocal(data);
    }
}

// ===== 本地存储降级方案 =====
function saveGalleryV2ToLocal(data) {
    try {
        const gameId = window.gameId || new URLSearchParams(window.location.search).get('id');
        if (!gameId) {
            showToast('无法确定游戏ID', 'error');
            return;
        }
        
        const storageKey = `game_${gameId}_gallery_v2`;
        let gallery = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        if (currentGalleryEditId) {
            // 更新现有CG
            const index = gallery.findIndex(cg => cg._id === currentGalleryEditId || cg.id === currentGalleryEditId);
            if (index >= 0) {
                gallery[index] = { ...gallery[index], ...data, _id: currentGalleryEditId };
            } else {
                // 如果找不到，添加为新CG
                gallery.push({ ...data, _id: 'galv2_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9) });
            }
        } else {
            // 添加新CG
            gallery.push({ ...data, _id: 'galv2_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9) });
        }
        
        localStorage.setItem(storageKey, JSON.stringify(gallery));
        showToast('CG已保存到本地（后端不可用）', 'success');
        closeGalleryV2Modal();
        loadGalleryV2Images();
    } catch (error) {
        console.error('[Gallery V2] 本地保存失败:', error);
        showToast('保存失败', 'error');
    }
}

// ===== 删除CG =====
async function deleteGalleryV2(id) {
    if (!confirm('确定要删除这个CG吗？')) return;

    try {
        const response = await fetch(`${API_BASE}/gallery/v2/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        // 处理404错误（内存存储模式下数据丢失）
        if (response.status === 404) {
            console.warn('[Gallery V2] 删除的资源不存在（内存存储可能已重启），从本地存储删除');
            deleteGalleryV2FromLocal(id);
            return;
        }

        const result = await response.json();

        if (result.success) {
            showToast('CG已删除', 'success');
            loadGalleryV2Images();
        }
    } catch (error) {
        console.error('[Gallery V2] 删除失败:', error);
        // 降级到本地存储删除
        deleteGalleryV2FromLocal(id);
    }
}

// ===== 本地存储删除降级方案 =====
function deleteGalleryV2FromLocal(id) {
    try {
        const gameId = window.gameId || new URLSearchParams(window.location.search).get('id');
        if (!gameId) {
            showToast('无法确定游戏ID', 'error');
            return;
        }
        
        const storageKey = `game_${gameId}_gallery_v2`;
        let gallery = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        // 过滤掉要删除的CG
        const originalLength = gallery.length;
        gallery = gallery.filter(cg => cg._id !== id && cg.id !== id);
        
        if (gallery.length < originalLength) {
            localStorage.setItem(storageKey, JSON.stringify(gallery));
            showToast('CG已从本地存储删除', 'success');
            loadGalleryV2Images();
        } else {
            showToast('CG不存在或已删除', 'info');
            loadGalleryV2Images();
        }
    } catch (error) {
        console.error('[Gallery V2] 本地删除失败:', error);
        showToast('删除失败', 'error');
    }
}

// ===== 关闭模态框 =====
function closeGalleryV2Modal() {
    const modal = document.getElementById('galleryV2Modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
    currentGalleryEditId = null;
}

// ===== 测试匹配功能（核心） =====
async function testGalleryV2Match() {
    const testScenes = document.getElementById('g2_testScenes').value;

    if (!testScenes.trim()) {
        showToast('请输入测试场景', 'error');
        return;
    }

    const gameId = window.gameId || new URLSearchParams(window.location.search).get('id');
    const characterId = document.getElementById('g2_characterId').value || undefined;

    // 先保存当前CG（如果是编辑模式）
    if (currentGalleryEditId) {
        await saveGalleryV2();
    }

    const scenes = testScenes.split('\n').filter(s => s.trim());

    showToast('正在测试匹配...', 'info');

    try {
        const response = await fetch(`${API_BASE}/gallery/v2/test-match`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({
                gameId,
                characterId,
                testScenes: scenes
            })
        });

        const result = await response.json();

        if (result.success) {
            renderTestResults(result.data.testScenes);
        } else {
            showToast(result.message || '测试失败', 'error');
        }
    } catch (error) {
        console.error('[Gallery V2] 测试失败:', error);
        showToast('测试失败', 'error');
    }
}

// ===== 渲染测试结果 =====
function renderTestResults(testScenes) {
    const container = document.getElementById('galleryV2TestResults');
    if (!container) return;

    container.innerHTML = testScenes.map((result, idx) => `
        <div style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin-bottom: 12px;">
            <div style="font-weight: 600; margin-bottom: 8px; color: var(--primary-light);">
                测试场景 ${idx + 1}: ${result.scene}
            </div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">
                匹配到 ${result.allMatches} 个CG，Top 3:
            </div>
            ${result.topMatches.map((match, mIdx) => `
                <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: ${mIdx === 0 ? 'rgba(138, 109, 59, 0.1)' : 'transparent'}; border-radius: 4px; margin-bottom: 4px;">
                    <span style="font-weight: 600; color: ${mIdx === 0 ? '#4caf50' : 'var(--text-secondary)'};">#${mIdx + 1}</span>
                    <img src="${match.url}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;" onerror="this.style.display='none'">
                    <div style="flex: 1;">
                        <div style="font-size: 13px; font-weight: 500;">${match.name}</div>
                        <div style="font-size: 11px; color: var(--text-secondary);">
                            匹配度: ${match.score.toFixed(1)} - ${match.details.slice(0, 2).join(', ')}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `).join('');

    container.style.display = 'block';
}

// ===== 初始化角色选择器 =====
function initCharacterSelector() {
    const select = document.getElementById('g2_characterId');
    if (!select) return;

    const characters = window.characters || [];

    select.innerHTML = `
        <option value="">🌐 通用CG（不绑定角色）</option>
        ${characters.map(char => `
            <option value="${char._id || char.id}">👤 ${char.name}</option>
        `).join('')}
        <option value="__custom__">✏️ 自定义输入...</option>
    `;
    
    // 重置自定义输入框
    const customInput = document.getElementById('g2_customCharacterName');
    if (customInput) {
        customInput.value = '';
        customInput.style.display = 'none';
    }
    select.style.display = 'block';
}

// ===== 暴露到全局 =====
window.initGalleryV2 = initGalleryV2;
window.openGalleryV2Modal = openGalleryV2Modal;
window.closeGalleryV2Modal = closeGalleryV2Modal;
window.saveGalleryV2 = saveGalleryV2;
window.editGalleryV2 = (id) => openGalleryV2Modal(id);
window.deleteGalleryV2 = deleteGalleryV2;
window.testGalleryV2Match = testGalleryV2Match;
window.initCharacterSelector = initCharacterSelector;
window.onCharacterSelectChange = onCharacterSelectChange;
window.onCustomCharacterBlur = onCustomCharacterBlur;
window.loadGalleryV2Images = loadGalleryV2Images;
window.loadGalleryV2FromLocal = loadGalleryV2FromLocal;
window.deleteGalleryV2FromLocal = deleteGalleryV2FromLocal;
window.saveGalleryV2ToLocal = saveGalleryV2ToLocal;

console.log('[Gallery V2] Editor loaded');
