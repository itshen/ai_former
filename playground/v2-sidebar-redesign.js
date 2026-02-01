// ============ 基础功能 ============

// 全局状态：表单是否已识别
let isFormScanned = false;

function closeOnboarding() {
    document.getElementById('onboarding').style.display = 'none';
}

function toggleOnboarding() {
    const banner = document.getElementById('onboarding');
    if (banner.style.display === 'none') {
        banner.style.display = 'block';
    } else {
        banner.style.display = 'none';
    }
}

function toggleCollapsible(header) {
    const content = header.nextElementSibling;
    const isActive = header.classList.contains('active');
    
    if (isActive) {
        header.classList.remove('active');
        content.classList.remove('active');
    } else {
        header.classList.add('active');
        content.classList.add('active');
    }
}

function showStatus(action, skipSuccess = false) {
    const message = skipSuccess ? action : `${action}成功`;
    
    // 如果在iframe内，发送消息给主窗口
    if (window.parent !== window) {
        window.parent.postMessage({ 
            action: 'showStatus', 
            message: message,
            skipSuccess: skipSuccess
        }, '*');
        return;
    }
    
    // 在主窗口，直接显示
    const container = document.getElementById('status-container');
    if (!container) return;
    
    const status = document.createElement('div');
    status.className = 'status-indicator';
    
    status.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
        </svg>
        ${message}
    `;
    
    container.innerHTML = '';
    container.appendChild(status);
    setTimeout(() => status.remove(), 3000);
}

function showAbout() {
    document.getElementById('aboutPage').classList.add('active');
}

function hideAbout() {
    document.getElementById('aboutPage').classList.remove('active');
}

function fillHistoryPrompt(element) {
    const text = element.textContent;
    document.querySelector('.textarea').value = text;
    showStatus('已填入历史记录');
}

// ============ 扫描表单 ============

function scanForm() {
    // 检查是否在主窗口（有iframe元素）
    const iframe = document.getElementById('scene-iframe');
    if (iframe) {
        // 在主窗口，发送消息给iframe
        iframe.contentWindow.postMessage({ action: 'scanForm' }, '*');
        return;
    }
    
    // 在iframe内部，执行扫描
    const inputs = document.querySelectorAll('.mock-input:not(.mock-input-disabled), .mock-textarea, .mock-select');
    
    showStatus('开始识别表单', true);
    
    // 逐个显示橙色脉冲扫描动画
    inputs.forEach((input, index) => {
        setTimeout(() => {
            input.classList.add('ai-scanning');
            setTimeout(() => {
                input.classList.remove('ai-scanning');
                input.classList.add('ai-recognized');
            }, 1500);
        }, index * 200);
    });
    
    // 识别完成
    setTimeout(() => {
        isFormScanned = true; // 标记表单已识别
        showStatus('识别完成，共找到 ' + inputs.length + ' 个字段');
    }, inputs.length * 200 + 1500);
}

// ============ 智能填充（AI生成） ============

function fillForm() {
    // 检查是否在主窗口
    const iframe = document.getElementById('scene-iframe');
    if (iframe) {
        // 在主窗口，发送消息给iframe
        iframe.contentWindow.postMessage({ action: 'fillForm' }, '*');
        return;
    }
    
    // 在iframe内部，执行填充
    const inputs = document.querySelectorAll('.mock-input:not(.mock-input-disabled), .mock-textarea, .mock-select');
    
    // 如果已经识别过表单，直接跳到填充步骤
    if (isFormScanned) {
        startFilling();
        return;
    }
    
    // 如果未识别，先快速识别（不添加视觉动画）
    showStatus('识别表单', true);
    
    setTimeout(() => {
        isFormScanned = true; // 标记表单已识别
        showStatus('识别完成，开始填充', true);
        setTimeout(() => {
            startFilling();
        }, 500);
    }, 800);
}

// 开始填充（提取为独立函数）
function startFilling() {
    const btn = document.querySelector('.btn-primary');
    const inputs = document.querySelectorAll('.mock-input:not(.mock-input-disabled), .mock-textarea, .mock-select');
    
    btn.disabled = true;
    btn.style.opacity = '0.6';
    btn.innerHTML = `
        <i data-lucide="loader" style="animation: spin 1s linear infinite;"></i>
        正在填充...
    `;
    // 重新初始化 Lucide 图标
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    showStatus('调用 AI', true);
    
    setTimeout(() => {
        showStatus('开始填充', true);
        
        // Demo data: 对应最终的表单结构
        // 顺序：姓名、性别、学历、年龄、邮箱、手机号、地址、公司名称、个人简介
        const demoData = [
            { selector: 0, value: '张明' },
            { selector: 1, value: 'male', isSelect: true },
            { selector: 2, value: 'bachelor', isSelect: true },
            { selector: 3, value: '28' },
            { selector: 4, value: 'zhangming@example.com' },
            { selector: 5, value: '+86 138 0013 8000' },
            { selector: 6, value: '广东省横琴粤澳深度合作区' },
            { selector: 7, value: '米羊科技（珠海横琴）有限公司' },
            { selector: 8, value: '拥有5年前端开发经验，熟练掌握 React、Vue 等主流框架，擅长构建高性能的 Web 应用。对用户体验有深入理解，注重代码质量和团队协作。' }
        ];
        
        demoData.forEach((item, i) => {
            setTimeout(() => {
                const input = inputs[item.selector];
                input.classList.remove('ai-recognized');
                
                // 添加橙色脉冲扫描动画
                input.classList.add('ai-scanning');
                
                setTimeout(() => {
                    input.classList.remove('ai-scanning');
                    input.style.borderColor = 'var(--primary)';
                    input.style.boxShadow = '0 0 0 3px rgba(66, 133, 244, 0.2)';
                    
                    if (item.isSelect) {
                        input.value = item.value;
                        input.style.borderColor = '#2d8f47';
                        input.style.backgroundColor = 'rgba(45, 143, 71, 0.05)';
                        
                        setTimeout(() => {
                            input.style.borderColor = '';
                            input.style.boxShadow = '';
                            input.style.backgroundColor = '';
                        }, 500);
                    } else {
                        let currentText = '';
                        let charIndex = 0;
                        const typeInterval = setInterval(() => {
                            if (charIndex < item.value.length) {
                                currentText += item.value[charIndex];
                                input.value = currentText;
                                charIndex++;
                            } else {
                                clearInterval(typeInterval);
                                input.style.borderColor = '#2d8f47';
                                input.style.backgroundColor = 'rgba(45, 143, 71, 0.05)';
                                setTimeout(() => {
                                    input.style.borderColor = '';
                                    input.style.boxShadow = '';
                                    input.style.backgroundColor = '';
                                }, 500);
                            }
                        }, 30);
                    }
                }, 800); // 橙色脉冲持续 800ms
            }, i * 600);
        });
        
        setTimeout(() => {
            showStatus('填充完成');
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.innerHTML = `
                <i data-lucide="sparkles"></i>
                开始智能填充
            `;
            // 重新初始化 Lucide 图标
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, demoData.length * 600 + 1000);
    }, 1500);
}

// ============ 快速填充（字段映射） ============

function quickFill() {
    // 检查是否在主窗口
    const iframe = document.getElementById('scene-iframe');
    if (iframe) {
        // 在主窗口，发送消息给iframe
        iframe.contentWindow.postMessage({ action: 'quickFill' }, '*');
        return;
    }
    
    // 在iframe内部，执行快速填充
    const inputs = document.querySelectorAll('.mock-input:not(.mock-input-disabled), .mock-textarea, .mock-select');
    showStatus('开始快速填充', true);
    
    // Mock mapping data (姓名=0, 邮箱=4)
    const mappingData = {
        0: '张明',
        4: 'zhangming@example.com'
    };
    
    let filledCount = 0;
    let skippedCount = 0;
    
    inputs.forEach((input, index) => {
        if (mappingData[index] !== undefined) {
            if (input.value && input.value.trim() !== '') {
                skippedCount++;
                return;
            }
            
            setTimeout(() => {
                input.value = mappingData[index];
                input.classList.add('filled');
                setTimeout(() => input.classList.remove('filled'), 500);
            }, filledCount * 150);
            
            filledCount++;
        }
    });
    
    setTimeout(() => {
        let message = `快速填充完成，已填充 ${filledCount} 个字段`;
        if (skippedCount > 0) {
            message += `，跳过 ${skippedCount} 个已填充字段`;
        }
        showStatus(message, true);
    }, filledCount * 150 + 300);
}

// ============ 学习内容 ============

function learnContent() {
    // 检查是否在主窗口
    const iframe = document.getElementById('scene-iframe');
    if (iframe) {
        // 在主窗口，发送消息给iframe
        iframe.contentWindow.postMessage({ action: 'learnContent' }, '*');
        return;
    }
    
    // 在iframe内部，执行学习
    const inputs = document.querySelectorAll('.mock-input:not(.mock-input-disabled), .mock-textarea, .mock-select');
    
    let hasContent = false;
    inputs.forEach(input => {
        if (input.value && input.value.trim() !== '') {
            hasContent = true;
        }
    });
    
    if (!hasContent) {
        const container = document.getElementById('status-container');
        const status = document.createElement('div');
        status.className = 'status-indicator error';
        status.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            表单为空，无法学习
        `;
        container.innerHTML = '';
        container.appendChild(status);
        setTimeout(() => status.remove(), 3000);
        return;
    }
    
    showStatus('开始学习', true);
    
    setTimeout(() => {
        showStatus('学习完成，已保存到知识库');
    }, 1500);
}

// ============ 输入框交互 ============

function aiFillSingle(button) {
    const group = button.closest('.mock-form-group');
    const input = group.querySelector('.mock-input, .mock-textarea, .mock-select');
    
    // 清空现有内容
    input.value = '';
    
    input.classList.add('filling');
    
    const demoValues = {
        'mock-input': '示例内容',
        'mock-textarea': '这是一段通过 AI 生成的个人简介示例。',
        'mock-select': 'bachelor'
    };
    
    const value = demoValues[input.className.split(' ')[0]] || '填充内容';
    
    setTimeout(() => {
        if (input.tagName === 'SELECT') {
            input.value = value;
        } else {
            let currentText = '';
            let charIndex = 0;
            const typeInterval = setInterval(() => {
                if (charIndex < value.length) {
                    currentText += value[charIndex];
                    input.value = currentText;
                    charIndex++;
                } else {
                    clearInterval(typeInterval);
                }
            }, 30);
        }
        
        input.classList.remove('filling');
        input.classList.add('filled');
        
        setTimeout(() => {
            input.classList.remove('filled');
        }, 800);
    }, 800);
}

function translateField(button, lang) {
    const group = button.closest('.mock-form-group');
    const input = group.querySelector('.mock-input, .mock-textarea, .mock-select');
    
    showStatus(`正在翻译为 ${lang}`, true);
    
    setTimeout(() => {
        showStatus('翻译完成');
    }, 1000);
}

function fillCachedValue(button) {
    const group = button.closest('.mock-form-group');
    const input = group.querySelector('.mock-input[data-cache], .mock-textarea[data-cache]');
    
    if (input) {
        const cacheValue = input.getAttribute('data-cache');
        input.value = cacheValue;
        input.classList.add('filled');
        setTimeout(() => input.classList.remove('filled'), 500);
        showStatus('已填充');
    }
}

// ============ Demo 动画 ============

function triggerScanning() {
    const inputs = document.querySelectorAll('.mock-input:not(.mock-input-disabled), .mock-textarea, .mock-select');
    inputs.forEach((input, index) => {
        setTimeout(() => {
            input.classList.add('ai-scanning');
            setTimeout(() => {
                input.classList.remove('ai-scanning');
            }, 1500);
        }, index * 200);
    });
}

function triggerFilling() {
    const inputs = document.querySelectorAll('.mock-input:not(.mock-input-disabled), .mock-textarea, .mock-select');
    inputs.forEach((input, index) => {
        setTimeout(() => {
            input.classList.add('filling');
            setTimeout(() => {
                input.classList.remove('filling');
                input.classList.add('filled');
                setTimeout(() => input.classList.remove('filled'), 500);
            }, 1000);
        }, index * 300);
    });
}

function triggerError() {
    const inputs = document.querySelectorAll('.mock-input:not(.mock-input-disabled), .mock-textarea, .mock-select');
    inputs.forEach((input, index) => {
        if (index % 2 === 0) {
            setTimeout(() => {
                input.style.borderColor = 'var(--error)';
                input.style.boxShadow = '0 0 0 3px rgba(217, 48, 37, 0.1)';
                setTimeout(() => {
                    input.style.borderColor = '';
                    input.style.boxShadow = '';
                }, 1500);
            }, index * 150);
        }
    });
}

// ============ 页面加载完成后的初始化 ============

document.addEventListener('DOMContentLoaded', function() {
    // 🔥 核心功能：动态注入 Action Bar（模拟插件行为）
    injectActionBars();
    
    // 监听所有输入框的 focus 和 blur 事件
    const inputs = document.querySelectorAll('.mock-input:not(.mock-input-disabled), .mock-textarea, .mock-select');
    
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            const group = this.closest('.mock-form-group');
            if (group) {
                document.querySelectorAll('.mock-form-group.active').forEach(g => {
                    if (g !== group) {
                        g.classList.remove('active');
                    }
                });
                group.classList.add('active');
                
                // 动态调整按钮位置
                const actionBar = group.querySelector('.action-bar');
                if (actionBar) {
                    const inputHeight = this.offsetHeight;
                    const borderWidth = parseFloat(getComputedStyle(this).borderWidth) || 1.5;
                    actionBar.style.bottom = `calc(${inputHeight}px + ${borderWidth}px)`;
                }
            }
        });
        
        input.addEventListener('blur', function(e) {
            const group = this.closest('.mock-form-group');
            // 延迟移除，以便点击按钮有时间响应
            setTimeout(() => {
                if (group && !group.contains(document.activeElement)) {
                    group.classList.remove('active');
                }
            }, 200);
        });
        
        input.addEventListener('mouseleave', function() {
            const group = this.closest('.mock-form-group');
            setTimeout(() => {
                if (group && document.activeElement !== this && !group.querySelector('.action-bar:hover')) {
                    group.classList.remove('active');
                }
            }, 200);
        });
    });
    
    // 为 action-bar 添加鼠标悬停事件，保持显示
    document.querySelectorAll('.action-bar').forEach(bar => {
        bar.addEventListener('mouseenter', function() {
            const group = this.closest('.mock-form-group');
            if (group) {
                group.classList.add('active');
            }
        });
    });
    
    // 添加 CSS keyframes for spin animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    // 初始化 Lucide 图标
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});

// ============ 动态注入 Action Bar（核心功能）============

function injectActionBars() {
    const inputs = document.querySelectorAll('.mock-input:not(.mock-input-disabled), .mock-textarea, .mock-select');
    
    console.log('🔥 开始注入 Action Bars，找到输入框数量:', inputs.length);
    
    inputs.forEach(input => {
        const group = input.closest('.mock-form-group');
        if (!group) return;
        
        // 检查是否已经注入过
        if (group.querySelector('.action-bar')) {
            console.log('⏭️ 跳过已注入:', input);
            return;
        }
        
        // 判断输入框类型，决定是否显示某些按钮
        const inputType = input.type || input.tagName.toLowerCase();
        const isPassword = inputType === 'password';
        const isTel = inputType === 'tel';
        const isNumber = inputType === 'number';
        const isSelect = input.tagName === 'SELECT';
        const isEmpty = !input.value || input.value.trim() === '';
        const isPureNumber = !isEmpty && /^\d+$/.test(input.value);
        
        console.log('📝 处理输入框:', { 
            tagName: input.tagName, 
            type: inputType, 
            isPassword, 
            isTel, 
            isNumber, 
            isSelect,
            placeholder: input.placeholder 
        });
        
        // 密码字段不显示任何按钮
        if (isPassword) {
            console.log('🔒 密码字段，跳过');
            return;
        }
        
        // 创建 action-bar
        const actionBar = document.createElement('div');
        actionBar.className = 'action-bar';
        
        // 1. 如果有缓存值，添加确认按钮
        const cachedValue = input.dataset.cache;
        if (cachedValue) {
            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'cache-confirm-btn';
            confirmBtn.setAttribute('data-tooltip', `填充：${cachedValue}`);
            confirmBtn.innerHTML = '<i data-lucide="check"></i>';
            confirmBtn.onclick = function() {
                input.value = cachedValue;
                input.classList.add('ai-filled');
                showStatus('已填充缓存值');
            };
            actionBar.appendChild(confirmBtn);
        }
        
        // 2. AI 填充按钮（蓝色主色调）
        const fillBtn = document.createElement('button');
        fillBtn.className = 'action-btn action-btn-fill primary';
        fillBtn.setAttribute('data-tooltip', 'AI 填充');
        fillBtn.innerHTML = '<i data-lucide="sparkles"></i>';
        fillBtn.onclick = function() { fillSingleField(this); };
        actionBar.appendChild(fillBtn);
        
        // 3. 翻译按钮（不对 select、tel、number 显示）
        if (!isSelect && !isTel && !isNumber) {
            console.log('添加翻译按钮到:', input);
            
            const translateGroup = document.createElement('div');
            translateGroup.className = 'action-btn-group';
            
            const translateBtn = document.createElement('button');
            translateBtn.className = 'action-btn action-btn-translate';
            translateBtn.setAttribute('data-tooltip', '翻译');
            translateBtn.innerHTML = '<i data-lucide="languages"></i>';
            translateBtn.onclick = function() { toggleTranslateMenu(this); };
            
            const translateMenu = document.createElement('div');
            translateMenu.className = 'translate-menu';
            
            const languages = [
                { code: 'en', name: '🇬🇧 English' },
                { code: 'ru', name: '🇷🇺 Русский' },
                { code: 'ko', name: '🇰🇷 한국어' },
                { code: 'ja', name: '🇯🇵 日本語' },
                { code: 'es', name: '🇪🇸 Español' },
                { code: 'pt', name: '🇵🇹 Português' },
                { code: 'fr', name: '🇫🇷 Français' },
                { code: 'de', name: '🇩🇪 Deutsch' },
                { code: 'id', name: '🇮🇩 Bahasa Indonesia' },
                { code: 'th', name: '🇹🇭 ไทย' },
                { code: 'ar', name: '🇸🇦 العربية' },
                { code: 'zh-TW', name: '🇭🇰 繁體中文' },
                { code: 'zh-CN', name: '🇨🇳 简体中文' }
            ];
            
            languages.forEach(lang => {
                const item = document.createElement('div');
                item.className = 'translate-item';
                item.textContent = lang.name;
                item.onclick = function() { translateTo(this, lang.code); };
                translateMenu.appendChild(item);
            });
            
            translateGroup.appendChild(translateBtn);
            translateGroup.appendChild(translateMenu);
            actionBar.appendChild(translateGroup);
            
            console.log('翻译按钮已添加，菜单项数量:', languages.length);
        } else {
            console.log('跳过翻译按钮:', { isSelect, isTel, isNumber, input });
        }
        
        // 4. 重填整个表单按钮
        const refillBtn = document.createElement('button');
        refillBtn.className = 'action-btn action-btn-refill';
        refillBtn.setAttribute('data-tooltip', '重填整个表单');
        refillBtn.innerHTML = '<i data-lucide="list-restart"></i>';
        refillBtn.onclick = function() { refillEntireForm(); };
        actionBar.appendChild(refillBtn);
        
        // 插入到 group 中
        group.appendChild(actionBar);
    });
    
    // 重新初始化 Lucide 图标
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// ============ 场景切换 ============
let currentScene = 'form'; // 'form' 或 'bbs'

function toggleScene() {
    const iframe = document.getElementById('scene-iframe');
    
    if (!iframe) {
        // 如果在iframe内部，通知父窗口切换
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ action: 'toggleScene' }, '*');
        }
        return;
    }
    
    // 在主窗口中切换iframe的src
    if (currentScene === 'form') {
        iframe.src = 'scene-bbs.html';
        currentScene = 'bbs';
        showStatus('已切换到 BBS 回复场景');
    } else {
        iframe.src = 'scene-form.html';
        currentScene = 'form';
        showStatus('已切换到注册表单场景');
    }
}

// 监听来自iframe的消息
window.addEventListener('message', function(event) {
    if (event.data.action === 'toggleScene') {
        toggleScene();
    } else if (event.data.action === 'scanForm') {
        scanForm();
    } else if (event.data.action === 'fillForm') {
        fillForm();
    } else if (event.data.action === 'quickFill') {
        quickFill();
    } else if (event.data.action === 'learnContent') {
        learnContent();
    } else if (event.data.action === 'showStatus') {
        // iframe 请求显示状态
        showStatus(event.data.message, event.data.skipSuccess);
    }
});

// ============ 划词功能 ============
let selectionTooltip = null;

function initTextSelection() {
    // 创建浮动按钮
    selectionTooltip = document.createElement('div');
    selectionTooltip.className = 'selection-tooltip';
    selectionTooltip.innerHTML = '➕ 添加到引用';
    document.body.appendChild(selectionTooltip);
    
    // 监听文本选择
    document.addEventListener('mouseup', function(e) {
        // 只在 BBS 场景下生效
        if (currentScene !== 'bbs') {
            selectionTooltip.classList.remove('visible');
            return;
        }
        
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        // 如果选中了文本且在可选择区域
        if (selectedText.length > 0 && e.target.closest('.selectable-text')) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            // 定位浮动按钮
            selectionTooltip.style.left = rect.left + (rect.width / 2) - (selectionTooltip.offsetWidth / 2) + 'px';
            selectionTooltip.style.top = (rect.top - 40) + 'px';
            selectionTooltip.classList.add('visible');
            
            // 保存选中的文本和来源信息
            const post = e.target.closest('.bbs-post');
            selectionTooltip.dataset.text = selectedText;
            selectionTooltip.dataset.floor = post ? post.dataset.floor : '';
            selectionTooltip.dataset.author = post ? post.dataset.author : '';
        } else {
            selectionTooltip.classList.remove('visible');
        }
    });
    
    // 点击浮动按钮
    selectionTooltip.addEventListener('click', function() {
        const text = this.dataset.text;
        const floor = this.dataset.floor;
        const author = this.dataset.author;
        
        addToReference(text, { type: 'bbs', floor, author });
        
        // 隐藏按钮
        this.classList.remove('visible');
        window.getSelection().removeAllRanges();
        
        showStatus(`已添加来自 #${floor}楼 @${author} 的引用`);
    });
}

function addToReference(text, source) {
    // TODO: 实际实现需要在侧边栏的引用区域添加引用卡片
    console.log('添加引用:', { text, source });
    
    // 这里暂时只显示提示
    // 后续需要在侧边栏的 HTML 中添加引用区域，并动态插入引用卡片
}

// ============ 输入框动作按钮功能 ============

function fillSingleField(button) {
    const group = button.closest('.mock-form-group');
    const input = group.querySelector('.mock-input, .mock-textarea, .mock-select');
    
    if (!input) return;
    
    showStatus('正在生成内容', true);
    
    // 模拟 AI 生成内容
    setTimeout(() => {
        const sampleTexts = {
            textarea: '感谢楼主提问！我之前也遇到过类似的问题。建议先从 React 官方文档开始，跟着做几个小项目。同时要理解 JSX、组件、Props、State 这些核心概念。有问题随时交流！',
            input: '示例内容',
            select: '选项1'
        };
        
        let content = '';
        if (input.tagName === 'TEXTAREA') {
            content = sampleTexts.textarea;
        } else if (input.tagName === 'SELECT') {
            content = sampleTexts.select;
        } else {
            content = sampleTexts.input;
        }
        
        // 清空并打字效果
        input.value = '';
        input.classList.add('ai-filling');
        
        let i = 0;
        const typingInterval = setInterval(() => {
            if (i < content.length) {
                input.value += content[i];
                i++;
            } else {
                clearInterval(typingInterval);
                input.classList.remove('ai-filling');
                input.classList.add('ai-filled');
                showStatus('内容生成完成');
            }
        }, 30);
    }, 800);
}

function toggleTranslateMenu(button) {
    const menu = button.parentElement.querySelector('.translate-menu');
    if (!menu) return;
    
    // 关闭其他已打开的菜单
    document.querySelectorAll('.translate-menu.active').forEach(m => {
        if (m !== menu) m.classList.remove('active');
    });
    
    menu.classList.toggle('active');
    
    // 点击外部关闭菜单
    if (menu.classList.contains('active')) {
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target) && e.target !== button) {
                    menu.classList.remove('active');
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 0);
    }
}

function translateTo(item, lang) {
    const menu = item.parentElement;
    const group = menu.closest('.mock-form-group');
    const input = group.querySelector('.mock-input, .mock-textarea, .mock-select');
    
    if (!input || !input.value) {
        showStatus('内容为空，无法翻译');
        menu.classList.remove('active');
        return;
    }
    
    // 检查是否为不适合翻译的类型
    const inputType = input.type || input.tagName.toLowerCase();
    const isTel = inputType === 'tel';
    const isNumber = inputType === 'number';
    const isSelect = input.tagName === 'SELECT';
    const isPureNumber = /^\d+$/.test(input.value);
    
    if (isTel || isNumber || isSelect || isPureNumber) {
        showStatus('此字段不适合翻译');
        menu.classList.remove('active');
        return;
    }
    
    showStatus(`正在翻译为${item.textContent}`, true);
    menu.classList.remove('active');
    
    // 模拟翻译
    setTimeout(() => {
        const translations = {
            'en': 'Thank you for the question! I had similar issues before. I suggest starting with the official React documentation and building a few small projects. Also, understand core concepts like JSX, Components, Props, and State. Feel free to discuss anytime!',
            'ja': 'ご質問ありがとうございます！私も以前同じような問題に遭遇しました。Reactの公式ドキュメントから始めて、いくつかの小さなプロジェクトを作ることをお勧めします。同時に、JSX、コンポーネント、Props、Stateなどの中核概念を理解する必要があります。質問があればいつでも交流しましょう！'
        };
        
        input.value = translations[lang] || `[${item.textContent}] ${input.value}`;
        showStatus('翻译完成');
    }, 1000);
}

function refillEntireForm() {
    showStatus('重新填充整个表单', true);
    
    // 检查是否在主窗口
    const iframe = document.getElementById('scene-iframe');
    if (iframe) {
        // 在主窗口，发送消息给iframe
        iframe.contentWindow.postMessage({ action: 'fillForm' }, '*');
    } else {
        // 在iframe内，直接调用
        fillForm();
    }
}

// Version: 1769924759
