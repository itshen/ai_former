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
    const container = document.getElementById('status-container');
    const status = document.createElement('div');
    status.className = 'status-indicator';
    
    const message = skipSuccess ? action : `${action}成功`;
    
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
    
    // ============ 场景切换和划词功能初始化 ============
    initSceneSwitcher();
    initTextSelection();
});

// ============ 场景切换 ============
let currentScene = 'form'; // 'form' 或 'bbs'

function initSceneSwitcher() {
    // 确保初始状态正确
    const formScene = document.getElementById('scene-form');
    const bbsScene = document.getElementById('scene-bbs');
    
    if (formScene && bbsScene) {
        // 直接操作 style，确保生效
        formScene.style.display = 'block';
        bbsScene.style.display = 'none';
        formScene.classList.add('active');
        bbsScene.classList.remove('active');
        console.log('初始化场景完成：表单场景显示');
    } else {
        console.error('场景容器未找到！', { formScene, bbsScene });
    }
}

function toggleScene() {
    const formScene = document.getElementById('scene-form');
    const bbsScene = document.getElementById('scene-bbs');
    const mockPage = document.querySelector('.mock-page');
    
    if (!formScene || !bbsScene) {
        console.error('场景容器未找到！');
        showStatus('错误：场景容器未找到');
        return;
    }
    
    // 根据当前场景状态进行切换
    if (currentScene === 'form') {
        // 切换到 BBS - 直接操作 style
        formScene.style.display = 'none';
        bbsScene.style.display = 'block';
        formScene.classList.remove('active');
        bbsScene.classList.add('active');
        currentScene = 'bbs';
        showStatus('已切换到 BBS 回复场景');
    } else {
        // 切换到表单 - 直接操作 style
        bbsScene.style.display = 'none';
        formScene.style.display = 'block';
        bbsScene.classList.remove('active');
        formScene.classList.add('active');
        currentScene = 'form';
        showStatus('已切换到注册表单场景');
    }
    
    // 重置滚动位置到顶部
    if (mockPage) {
        mockPage.scrollTop = 0;
    }
}

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

