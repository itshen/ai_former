document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const modelProviderSelect = document.getElementById('model-provider');
    const modelSelectionSelect = document.getElementById('model-selection');
    const apiContainer = document.getElementById('api-container');
    const apiKeyLabel = document.getElementById('api-key-label');
    const apiKeyInput = document.getElementById('api-key');
    const ollamaContainer = document.getElementById('ollama-container');
    const ollamaUrlInput = document.getElementById('ollama-url');
    
    // 模型选择相关元素
    const modelInput = document.getElementById('model-input');
    const modelDropdown = document.getElementById('model-dropdown');
    const modelList = document.getElementById('model-list');
    const refreshModelsButton = document.getElementById('refresh-models');
    
    const fillFormButton = document.getElementById('fill-form');
    const extractFormButton = document.getElementById('extract-form');
    const removeHighlightsButton = document.getElementById('remove-highlights');
    const statusDiv = document.getElementById('status');
    const userPromptTextarea = document.getElementById('user-prompt');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    // Reasoning 开关相关元素
    const reasoningToggleContainer = document.getElementById('reasoning-toggle-container');
    const reasoningEnabledCheckbox = document.getElementById('reasoning-enabled');
    
    // 反馈按钮和模态框相关元素
    const feedbackLink = document.getElementById('feedback-link');
    const feedbackModal = document.getElementById('feedback-modal');
    const closeModalButton = document.getElementById('close-modal');
    
    // 补充资料相关元素
    const additionalInfoContainer = document.querySelector('.additional-info-container');
    const additionalInfoHeader = document.querySelector('.additional-info-header');
    const additionalInfoTextarea = document.getElementById('additional-info');
    const wordCountDiv = document.getElementById('word-count');
    const tagsList = document.getElementById('tags-list');
    const saveInfoButton = document.getElementById('save-info');
    const saveAsButton = document.getElementById('save-as');
    
    // 补充资料管理相关变量
    let currentTagId = null;
    let additionalInfos = {};
    
    // 初始化补充资料展开状态
    function initializeAdditionalInfoState() {
        chrome.storage.local.get(['additionalInfoExpanded'], function(data) {
            if (data.additionalInfoExpanded) {
                additionalInfoContainer.classList.add('expanded');
            }
        });
    }
    
    // 切换补充资料展开状态
    additionalInfoHeader.addEventListener('click', function() {
        const isExpanded = additionalInfoContainer.classList.toggle('expanded');
        chrome.storage.local.set({ additionalInfoExpanded: isExpanded });
    });
    
    // 初始化补充资料
    function initializeAdditionalInfo() {
        chrome.storage.local.get(['additionalInfos', 'currentTagId', 'additionalInfoExpanded'], function(data) {
            additionalInfos = data.additionalInfos || {};
            currentTagId = data.currentTagId;
            
            // 设置展开状态
            if (data.additionalInfoExpanded) {
                additionalInfoContainer.classList.add('expanded');
            }
            
            // 渲染标签
            renderTags();
            
            // 如果有当前标签，加载其内容
            if (currentTagId && additionalInfos[currentTagId]) {
                additionalInfoTextarea.value = additionalInfos[currentTagId].content;
            } else {
                // 如果没有当前标签或当前标签不存在，清空内容并选中"空"标签
                currentTagId = null;
                additionalInfoTextarea.value = '';
            }
            updateWordCount();
        });
    }
    
    // 渲染标签列表
    function renderTags() {
        tagsList.innerHTML = '';
        
        // 添加置顶的"空"标签
        const emptyTag = document.createElement('div');
        emptyTag.className = `tag ${currentTagId === null ? 'active' : ''}`;
        emptyTag.innerHTML = '空';
        emptyTag.addEventListener('click', () => {
            // 如果当前有未保存的内容，提示保存
            if (currentTagId && additionalInfos[currentTagId] && 
                additionalInfos[currentTagId].content !== additionalInfoTextarea.value) {
                if (confirm('当前内容未保存，是否保存？')) {
                    saveCurrentContent();
                }
            }
            
            // 切换到空标签
            currentTagId = null;
            additionalInfoTextarea.value = '';
            updateWordCount();
            
            // 更新UI
            document.querySelectorAll('.tag').forEach(tag => {
                tag.classList.remove('active');
            });
            emptyTag.classList.add('active');
            
            // 保存当前标签ID
            chrome.storage.local.set({ currentTagId: null });
        });
        tagsList.appendChild(emptyTag);
        
        Object.entries(additionalInfos).forEach(([id, info]) => {
            const tag = document.createElement('div');
            tag.className = `tag ${id === currentTagId ? 'active' : ''}`;
            tag.innerHTML = `
                ${info.name}
                <button class="delete-btn" title="删除" data-id="${id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            `;
            
            // 点击标签切换内容
            tag.addEventListener('click', (e) => {
                if (e.target.closest('.delete-btn')) return;
                switchTag(id);
            });
            
            // 删除标签
            tag.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteTag(id);
            });
            
            tagsList.appendChild(tag);
        });
    }
    
    // 切换标签
    function switchTag(tagId, skipSaveCheck = false) {
        // 如果当前有未保存的内容，且不是通过另存为触发的切换，提示保存
        if (!skipSaveCheck && currentTagId && additionalInfos[currentTagId] && 
            additionalInfos[currentTagId].content !== additionalInfoTextarea.value) {
            if (confirm('当前内容未保存，是否保存？')) {
                saveCurrentContent();
            }
        }
        
        currentTagId = tagId;
        additionalInfoTextarea.value = additionalInfos[tagId].content;
        updateWordCount();
        
        // 更新UI
        document.querySelectorAll('.tag').forEach(tag => {
            tag.classList.toggle('active', tag.querySelector('.delete-btn').dataset.id === tagId);
        });
        
        // 保存当前标签ID
        chrome.storage.local.set({ currentTagId: tagId });
    }
    
    // 另存为新标签
    function saveAsNewTag() {
        // 如果没有内容，不创建
        if (!additionalInfoTextarea.value.trim()) {
            showToastInPage('请先输入内容', 'warning');
            return;
        }

        const name = prompt('请输入补充资料名称：');
        if (!name) return;
        
        const id = Date.now().toString();
        additionalInfos[id] = {
            name: name,
            content: additionalInfoTextarea.value
        };
        
        // 保存到存储
        chrome.storage.local.set({ additionalInfos: additionalInfos }, () => {
            renderTags();
            switchTag(id, true); // 传入 true 表示跳过保存检查
            showToastInPage('创建成功', 'success');
        });
    }
    
    // 删除标签
    function deleteTag(tagId) {
        if (!confirm('确定要删除这份补充资料吗？')) return;
        
        delete additionalInfos[tagId];
        
        // 如果删除的是当前标签，清空编辑区
        if (tagId === currentTagId) {
            currentTagId = null;
            additionalInfoTextarea.value = '';
            updateWordCount();
        }
        
        // 保存到存储
        chrome.storage.local.set({ 
            additionalInfos: additionalInfos,
            currentTagId: currentTagId
        }, () => {
            renderTags();
        });
    }
    
    // 保存当前内容
    function saveCurrentContent() {
        // 如果是空标签，不允许保存
        if (currentTagId === null) {
            showToastInPage('空标签不能保存内容，请使用"另存为"创建新标签', 'error');
            return;
        }
        
        // 如果没有任何标签，创建新标签
        if (Object.keys(additionalInfos).length === 0) {
            saveAsNewTag();
            return;
        }
        
        // 如果有标签但没有选中任何标签，提示选择
        if (!currentTagId) {
            showToastInPage('请先选择一个补充资料', 'warning');
            return;
        }
        
        additionalInfos[currentTagId].content = additionalInfoTextarea.value;
        
        // 保存到存储
        chrome.storage.local.set({ additionalInfos: additionalInfos }, () => {
            showToastInPage('保存成功', 'success');
        });
    }
    
    // 添加事件监听器
    saveInfoButton.addEventListener('click', saveCurrentContent);
    saveAsButton.addEventListener('click', (e) => {
        e.preventDefault();
        saveAsNewTag();
    });
    
    // 初始化补充资料
    initializeAdditionalInfo();
    
    // 初始隐藏下拉列表
    modelDropdown.style.display = 'none';
    
    // 当前模型列表
    let currentModels = [];
    
    // 添加一个变量来跟踪AI请求状态
    let isAIRequestInProgress = false;
    let aiRequestTimeoutId = null;
    let isHighlightBeingRemoved = false; // 添加标志位，跟踪是否正在移除高亮
    let isRefreshPromptShown = false; // 添加标志位，避免重复显示刷新提示

    // 缓存每个供应商的配置
    let providerConfigs = {
        ollama: { url: 'http://localhost:11434', model: '' },
        lmstudio: { url: 'http://localhost:1234', model: '' },
        bailian: { apiKey: '', model: '' },
        zhipu: { apiKey: '', model: '' },
        kimi: { apiKey: '', model: '' },
        deepseek: { apiKey: '', model: '' },
        volcengine: { apiKey: '', model: '' },
        siliconflow: { apiKey: '', model: '' },
        openrouter: { apiKey: '', model: '' },
        mimo: { apiKey: '', model: '' }
    };

    // 模型配置
    const modelConfigs = {
        ollama: {
            label: "Ollama 地址",
            models: [] // 将动态获取
        },
        lmstudio: {
            label: "LM Studio 地址",
            models: [] // 将动态获取
        },
        bailian: {
            label: "阿里云百炼 API Key",
            models: [] // 将动态获取
        },
        zhipu: {
            label: "智谱 API Key",
            models: [] // 将动态获取
        },
        kimi: {
            label: "Kimi API Key",
            models: [] // 将动态获取
        },
        deepseek: {
            label: "DeepSeek API Key",
            models: [] // 将动态获取
        },
        volcengine: {
            label: "火山引擎 API Key",
            models: [] // 将动态获取
        },
        siliconflow: {
            label: "硅基流动 API Key",
            models: [] // 将动态获取
        },
        openrouter: {
            label: "OpenRouter API Key",
            models: [] // 将动态获取
        },
        mimo: {
            label: "小米 Mimo API Key",
            models: [] // 将动态获取
        }
    };

    // 默认模型列表，作为备选
    const defaultModels = {
        lmstudio: [
            { value: "local-model", label: "本地模型" }
        ],
        bailian: [
            { value: "qwen-long", label: "qwen-long" },
            { value: "qwen-plus", label: "qwen-plus" },
            { value: "qwen-turbo", label: "qwen-turbo" },
            { value: "qwen-max", label: "qwen-max" },
            { value: "qwen-coder-plus", label: "qwen-coder-plus" },
            { value: "qwen2.5-72b-instruct", label: "qwen2.5-72b-instruct" },
            { value: "qwen2.5-32b-instruct", label: "qwen2.5-32b-instruct" }
        ],
        zhipu: [
            { value: "GLM-4-Plus", label: "GLM-4-Plus" },
            { value: "GLM-4-0520", label: "GLM-4-0520" },
            { value: "GLM-4-Long", label: "GLM-4-Long" },
            { value: "GLM-4-Flash", label: "GLM-4-Flash" },
            { value: "GLM-4-Air", label: "GLM-4-Air" },
            { value: "GLM-4-FlashX", label: "GLM-4-FlashX" }
        ],
        kimi: [
            { value: "moonshot-v1-8k", label: "moonshot-v1-8k" },
            { value: "moonshot-v1-32k", label: "moonshot-v1-32k" },
            { value: "moonshot-v1-128k", label: "moonshot-v1-128k" }
        ],
        deepseek: [
            { value: "deepseek-chat", label: "deepseek-chat" },
            { value: "deepseek-coder", label: "deepseek-coder" }
        ],
        volcengine: [
            { value: "doubao-1-5-pro-32k", label: "doubao-1.5-pro-32k" },
            { value: "doubao-1-5-pro-256k", label: "doubao-1.5-pro-256k" },
            { value: "doubao-1-5-lite-32k", label: "doubao-1.5-lite-32k" },
            { value: "doubao-pro-32k", label: "doubao-pro-32k" },
            { value: "doubao-lite-32k", label: "doubao-lite-32k" }
        ],
        siliconflow: [
            { value: "Pro/deepseek-ai/DeepSeek-R1", label: "DeepSeek-R1" },
            { value: "Pro/deepseek-ai/DeepSeek-V3", label: "DeepSeek-V3" },
            { value: "Qwen/Qwen2.5-7B-Instruct", label: "Qwen2.5-7B-Instruct" }
        ],
        openrouter: [
            { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash" },
            { value: "moonshotai/kimi-k2.5", label: "Kimi K2.5" },
            { value: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4" },
            { value: "openai/gpt-4o", label: "GPT-4o" }
        ],
        mimo: [
            { value: "mimo-v2-flash", label: "mimo-v2-flash" }
        ]
    };
    
    // 推荐模型配置：首次加载时优先选择这些模型
    const recommendedModels = {
        bailian: 'qwen-plus',
        zhipu: 'glm-4.7',
        kimi: 'kimi-k2.5',
        deepseek: 'deepseek-chat',
        volcengine: 'doubao-seed-1-8-251228',
        siliconflow: 'MiniMax-M2.1',
        openrouter: 'google/gemini-3-flash-preview',
        mimo: 'mimo-v2-flash'
    };

    // 通用错误处理函数，处理"Receiving end does not exist"错误
    function handleConnectionError(error, tabId, callback) {
        console.error('连接错误:', error);
        
        // 检查是否是"Receiving end does not exist"错误
        if (error && error.message && error.message.includes("Receiving end does not exist")) {
            // 避免重复显示刷新提示
            if (!isRefreshPromptShown) {
                isRefreshPromptShown = true;
                
                // 显示错误提示，并提供刷新按钮
                showToastInPage('无法连接到页面，请刷新页面或重新打开侧边栏', 'error', 10000);
                
                // 创建刷新按钮
                const refreshButton = document.createElement('button');
                refreshButton.textContent = '刷新页面';
                refreshButton.style.marginTop = '10px';
                refreshButton.style.backgroundColor = '#4285f4';
                refreshButton.style.color = 'white';
                refreshButton.style.border = 'none';
                refreshButton.style.padding = '7px 12px';
                refreshButton.style.borderRadius = '4px';
                refreshButton.style.cursor = 'pointer';
                
                // 添加点击事件
                refreshButton.addEventListener('click', function() {
                    // 刷新当前标签页
                    chrome.tabs.reload(tabId, {}, function() {
                        showToastInPage('页面已刷新，请稍等片刻再试', 'info');
                        setTimeout(() => {
                            isRefreshPromptShown = false;
                        }, 3000);
                    });
                });
                
                // 添加到状态区域
                statusDiv.appendChild(document.createElement('br'));
                statusDiv.appendChild(refreshButton);
                
                // 尝试自动注入内容脚本
                try {
                    chrome.scripting.executeScript({
                        target: {tabId: tabId},
                        files: ['content.js']
                    }).then(() => {
                        console.log('已尝试重新注入内容脚本');
                        if (callback) callback();
                    }).catch(err => {
                        console.error('注入脚本失败:', err);
                    });
                } catch (err) {
                    console.error('尝试注入脚本时出错:', err);
                }
            }
            return true; // 表示已处理错误
        }
        return false; // 表示未处理错误
    }

    // 加载保存的配置
    function loadSavedConfig() {
        chrome.storage.sync.get('modelConfig', function(data) {
            if (data.modelConfig) {
                const config = data.modelConfig;
                
                // 恢复所有供应商的缓存配置（合并而不是替换，确保新增的提供商不丢失）
                if (config.providerConfigs) {
                    for (const key in config.providerConfigs) {
                        if (providerConfigs[key]) {
                            providerConfigs[key] = { ...providerConfigs[key], ...config.providerConfigs[key] };
                        }
                    }
                }
                
                // 设置模型提供商
                modelProviderSelect.value = config.type;
                // 初始化 previousProvider 数据属性
                modelProviderSelect.dataset.previousProvider = config.type;
                
                // 更新UI
                updateApiKeyConfig(config.type);
                
                // 加载该供应商的配置
                loadProviderConfig(config.type);
                
                if (config.type === 'ollama') {
                    // 尝试获取Ollama模型列表
                    setTimeout(fetchOllamaModels, 100);
                } else {
                    // 如果有API Key，立即尝试获取模型列表
                    if (providerConfigs[config.type].apiKey) {
                        setTimeout(() => fetchModels(config.type, providerConfigs[config.type].apiKey), 100);
                    } else {
                        // 更新模型选择
                        updateModelSelection(config.type);
                    }
                    
                    // 设置模型
                    setTimeout(() => {
                        if (modelSelectionSelect.querySelector(`option[value="${config.model}"]`)) {
                            modelSelectionSelect.value = config.model;
                        }
                    }, 300);
                }
            } else {
                // 如果没有保存的配置，默认选择Ollama并获取模型列表
                updateApiKeyConfig('ollama');
                // 初始化 previousProvider 数据属性为 ollama
                modelProviderSelect.dataset.previousProvider = 'ollama';
                setTimeout(fetchOllamaModels, 100);
            }
        });
    }

    // 模型提供商变更事件
    modelProviderSelect.addEventListener('change', function() {
        const provider = this.value;
        const previousProvider = this.dataset.previousProvider;
        
        // 保存上一个供应商的配置
        if (previousProvider) {
            saveProviderConfig(previousProvider);
        }
        
        // 更新UI
        updateApiKeyConfig(provider);
        
        // 加载该供应商的缓存配置
        loadProviderConfig(provider);
        
        // 更新模型选择
        updateModelSelection(provider);
        
        // 如果不是 OpenRouter，隐藏 Reasoning 开关
        if (provider !== 'openrouter') {
            reasoningToggleContainer.classList.add('hidden');
            reasoningEnabledCheckbox.checked = false;
        }
        
        // 记录当前供应商，用于下次切换时保存
        this.dataset.previousProvider = provider;
        
        // 保存全局配置
        saveConfig();
    });

    // 保存指定供应商的配置到缓存
    function saveProviderConfig(provider) {
        if (provider === 'ollama') {
            if (!providerConfigs.ollama) providerConfigs.ollama = { url: '', model: '' };
            providerConfigs.ollama.url = ollamaUrlInput.value;
            providerConfigs.ollama.model = modelSelectionSelect.value;
        } else if (provider === 'lmstudio') {
            if (!providerConfigs.lmstudio) providerConfigs.lmstudio = { url: '', model: '' };
            providerConfigs.lmstudio.url = ollamaUrlInput.value;
            providerConfigs.lmstudio.model = modelSelectionSelect.value;
        } else {
            if (!providerConfigs[provider]) providerConfigs[provider] = { apiKey: '', model: '' };
            providerConfigs[provider].apiKey = apiKeyInput.value;
            providerConfigs[provider].model = modelSelectionSelect.value;
        }
    }

    // 保存当前供应商的配置到缓存
    function saveCurrentProviderConfig() {
        const currentProvider = modelProviderSelect.value;
        saveProviderConfig(currentProvider);
    }

    // 从缓存加载供应商配置
    function loadProviderConfig(provider) {
        if (provider === 'ollama') {
            ollamaUrlInput.value = providerConfigs.ollama?.url || 'http://127.0.0.1:11434';
            // 清空 API Key 输入框，避免混淆
            apiKeyInput.value = '';
        } else if (provider === 'lmstudio') {
            ollamaUrlInput.value = providerConfigs.lmstudio?.url || 'http://localhost:1234';
            // 清空 API Key 输入框，避免混淆
            apiKeyInput.value = '';
        } else {
            // 确保 providerConfigs[provider] 存在
            if (!providerConfigs[provider]) {
                providerConfigs[provider] = { apiKey: '', model: '' };
            }
            // 从缓存中获取当前厂商的 API Key，如果没有则清空
            apiKeyInput.value = providerConfigs[provider].apiKey || '';
            // 清空 Ollama URL 输入框，避免混淆                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           
            ollamaUrlInput.value = '';
        }
    }

    // 模型选择变更事件
    modelSelectionSelect.addEventListener('change', function() {
        // 更新当前供应商的缓存
        const provider = modelProviderSelect.value;
        if (provider === 'ollama') {
            if (!providerConfigs.ollama) providerConfigs.ollama = { url: '', model: '' };
            providerConfigs.ollama.model = this.value;
        } else {
            if (!providerConfigs[provider]) providerConfigs[provider] = { apiKey: '', model: '' };
            providerConfigs[provider].model = this.value;
        }
        
        // 更新 Reasoning 开关
        const selectedModel = findModelByValue(this.value);
        updateReasoningToggle(selectedModel);
        
        saveConfig();
    });

    // API Key变更事件
    apiKeyInput.addEventListener('change', function() {
        const provider = modelProviderSelect.value;
        if (provider !== 'ollama') {
            // 确保 providerConfigs[provider] 存在
            if (!providerConfigs[provider]) providerConfigs[provider] = { apiKey: '', model: '' };
            // 更新当前供应商的缓存
            providerConfigs[provider].apiKey = this.value;
            
            // 当API Key变化时，尝试获取模型列表
            fetchModels(provider, this.value);
        }
        saveConfig();
    });
    
    // API Key失焦事件
    apiKeyInput.addEventListener('blur', function() {
        const provider = modelProviderSelect.value;
        if (provider !== 'ollama' && this.value.trim()) {
            // 确保 providerConfigs[provider] 存在
            if (!providerConfigs[provider]) providerConfigs[provider] = { apiKey: '', model: '' };
            // 更新当前供应商的缓存
            providerConfigs[provider].apiKey = this.value;
            
            // 当API Key失焦且有值时，尝试获取模型列表
            fetchModels(provider, this.value);
        }
    });

    // Ollama URL变更事件
    ollamaUrlInput.addEventListener('change', function() {
        // 更新Ollama的缓存
        if (!providerConfigs.ollama) providerConfigs.ollama = { url: '', model: '' };
        providerConfigs.ollama.url = this.value;
        
        fetchOllamaModels();
        saveConfig();
    });
    
    // Ollama URL失焦事件
    ollamaUrlInput.addEventListener('blur', function() {
        if (this.value.trim()) {
            // 更新Ollama的缓存
            providerConfigs.ollama.url = this.value;
            
            // 当Ollama URL失焦且有值时，尝试获取模型列表
            fetchOllamaModels();
        }
    });

    // 更新API Key配置
    function updateApiKeyConfig(provider) {
        // 定义帮助链接
        const helpLinks = {
            'ollama': 'https://ollama.com',
            'lmstudio': 'https://lmstudio.ai/',
            'bailian': 'https://bailian.console.aliyun.com/?apiKey=1',
            'zhipu': 'https://open.bigmodel.cn/usercenter/apikeys',
            'kimi': 'https://platform.moonshot.cn/console/api-keys',
            'deepseek': 'https://platform.deepseek.com/',
            'volcengine': 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey',
            'siliconflow': 'https://cloud.siliconflow.cn/i/gQhQNfpv',
            'openrouter': 'https://openrouter.ai/keys',
            'mimo': 'https://xiaomimimo.com/'
        };

        const ollamaSection = document.getElementById('ollamaSection');

        if (provider === 'ollama') {
            apiContainer.classList.add('hidden');
            ollamaContainer.classList.remove('hidden');
            ollamaSection.classList.remove('hidden'); // 显示 Ollama 配置指南
            // 更新 Ollama 地址输入框的 placeholder
            ollamaUrlInput.placeholder = 'http://localhost:11434';
        } else if (provider === 'lmstudio') {
            apiContainer.classList.add('hidden');
            ollamaContainer.classList.remove('hidden');
            ollamaSection.classList.add('hidden'); // LM Studio 不需要配置指南
            // 更新 LM Studio 地址输入框的 placeholder
            ollamaUrlInput.placeholder = 'http://localhost:1234';
            // 设置默认地址
            if (!ollamaUrlInput.value || ollamaUrlInput.value === 'http://localhost:11434') {
                ollamaUrlInput.value = 'http://localhost:1234';
            }
        } else {
            apiContainer.classList.remove('hidden');
            ollamaContainer.classList.add('hidden');
            ollamaSection.classList.add('hidden'); // 隐藏 Ollama 配置指南
            
            // 创建标签文本和帮助链接
            const labelText = modelConfigs[provider].label;
            const helpLink = helpLinks[provider] || '#';
            
            // 设置标签内容，包含超链接
            apiKeyLabel.innerHTML = `${labelText} <a href="${helpLink}" target="_blank" title="获取 ${labelText}" class="api-key-link">获取 Key</a>`;
        }
    }

    // 更新模型选择下拉框
    function updateModelSelection(provider) {
        // 清空当前选项
        modelSelectionSelect.innerHTML = '';
        
        // 重置输入框
        modelInput.value = '';
        
        if (provider === 'ollama') {
            // 检查是否有缓存的模型列表
            if (modelConfigs.ollama && modelConfigs.ollama.models && modelConfigs.ollama.models.length > 0) {
                populateModelSelection(modelConfigs.ollama.models);
                restoreSavedModel('ollama');
            } else {
                // 没有缓存，尝试获取
                const option = document.createElement('option');
                option.value = 'loading';
                option.textContent = '正在加载...';
                modelSelectionSelect.appendChild(option);
                modelInput.placeholder = '正在加载...';
                setTimeout(fetchOllamaModels, 100);
            }
        } else if (provider === 'lmstudio') {
            // 检查是否有缓存的模型列表
            if (modelConfigs.lmstudio && modelConfigs.lmstudio.models && modelConfigs.lmstudio.models.length > 0) {
                populateModelSelection(modelConfigs.lmstudio.models);
                restoreSavedModel('lmstudio');
            } else {
                // 没有缓存，尝试获取
                const option = document.createElement('option');
                option.value = 'loading';
                option.textContent = '正在加载...';
                modelSelectionSelect.appendChild(option);
                modelInput.placeholder = '正在加载...';
                setTimeout(fetchLMStudioModels, 100);
            }
        } else {
            // 检查是否有缓存的模型列表
            if (modelConfigs[provider].models.length > 0) {
                // 使用缓存的模型列表
                populateModelSelection(modelConfigs[provider].models);
                
                // 恢复之前选择的模型
                restoreSavedModel(provider);
            } else {
                // 没有缓存的模型列表
                const apiKey = apiKeyInput.value.trim();
                if (apiKey) {
                    // 有 API Key，尝试获取模型列表
                    modelInput.placeholder = '正在加载...';
                    modelSelectionSelect.innerHTML = '';
                    const option = document.createElement('option');
                    option.value = 'loading';
                    option.textContent = '正在加载...';
                    modelSelectionSelect.appendChild(option);
                    
                    setTimeout(() => fetchModels(provider, apiKey), 100);
                } else {
                    // 没有 API Key，显示提示
                    modelInput.placeholder = '请输入 API Key';
                    modelInput.value = '';
                    modelSelectionSelect.innerHTML = '';
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = '请输入 API Key';
                    modelSelectionSelect.appendChild(option);
                    currentModels = [];
                    renderModelList([]);
                }
            }
        }
    }
    
    // 恢复之前选择的模型
    function restoreSavedModel(provider) {
        // 安全检查：确保 providerConfigs[provider] 存在
        if (!providerConfigs[provider]) {
            console.warn(`providerConfigs[${provider}] 不存在`);
            return;
        }
        const savedModel = providerConfigs[provider].model;
        if (savedModel) {
            setTimeout(() => {
                const option = modelSelectionSelect.querySelector(`option[value="${savedModel}"]`);
                if (option) {
                    modelSelectionSelect.value = savedModel;
                    modelInput.value = option.textContent;
                }
            }, 50);
        }
    }

    // 填充模型选择下拉框
    function populateModelSelection(models) {
        // 更新当前模型列表
        currentModels = models;
        
        // 清空当前选项
        modelSelectionSelect.innerHTML = '';
        
        if (models.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '未找到模型';
            modelSelectionSelect.appendChild(option);
            
            // 更新输入框
            modelInput.value = '';
            modelInput.placeholder = '未找到模型';
        } else {
            // 添加模型选项到隐藏的 select
            models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.value;
                option.textContent = model.label;
                modelSelectionSelect.appendChild(option);
            });
            
            // 获取当前提供商
            const provider = modelProviderSelect.value;
            
            // 优先使用缓存的选择（加安全检查）
            const savedModel = providerConfigs[provider]?.model;
            let modelToSelect = null;
            
            if (savedModel) {
                // 尝试找到之前保存的模型
                modelToSelect = models.find(m => m.value === savedModel);
            }
            
            // 如果没有缓存的选择，尝试使用推荐模型
            if (!modelToSelect && recommendedModels[provider]) {
                const recommended = recommendedModels[provider];
                // 支持部分匹配（忽略大小写）
                modelToSelect = models.find(m => 
                    m.value.toLowerCase() === recommended.toLowerCase() ||
                    m.value.toLowerCase().includes(recommended.toLowerCase()) ||
                    m.label.toLowerCase().includes(recommended.toLowerCase())
                );
            }
            
            // 如果仍然没有找到，使用第一个
            if (!modelToSelect) {
                modelToSelect = models[0];
            }
            
            modelSelectionSelect.value = modelToSelect.value;
            modelInput.value = modelToSelect.label;
        }
        
        // 渲染下拉列表
        renderModelList(models);
        
        // 如果下拉列表是可见的，更新它
        if (modelDropdown.style.display === 'block') {
            showModelDropdown();
        }
    }

    // 获取模型列表
    async function fetchModels(provider, apiKey, retryCount = 3) {
        if (!apiKey) return;
        
        // 显示加载状态
        showToastInPage(`正在获取${modelConfigs[provider].label.split(' ')[0]}模型列表...`, 'info');
        setButtonsState(true); // 禁用按钮
        
        let attempt = 0;
        
        while (attempt < retryCount) {
            try {
                let models = [];
                
                switch (provider) {
                    case 'bailian':
                        models = await fetchBailianModels(apiKey);
                        break;
                    case 'zhipu':
                        models = await fetchZhipuModels(apiKey);
                        break;
                    case 'kimi':
                        models = await fetchKimiModels(apiKey);
                        break;
                    case 'deepseek':
                        models = await fetchDeepSeekModels(apiKey);
                        break;
                    case 'volcengine':
                        models = await fetchVolcengineModels(apiKey);
                        break;
                    case 'siliconflow':
                        models = await fetchSiliconFlowModels(apiKey);
                        break;
                    case 'openrouter':
                        models = await fetchOpenRouterModels(apiKey);
                        break;
                    case 'mimo':
                        models = await fetchMimoModels(apiKey);
                        break;
                    default:
                        // 使用默认模型列表
                        models = defaultModels[provider] || [];
                }
                
                // 更新模型配置缓存
                modelConfigs[provider].models = models;
                
                // 更新模型选择下拉框
                populateModelSelection(models);
                
                // 恢复之前选择的模型
                restoreSavedModel(provider);
                
                if (models.length > 0) {
                    showToastInPage(`成功获取到 ${models.length} 个模型`, 'success');
                } else {
                    showToastInPage(`未获取到模型，请检查 API Key`, 'warning');
                }
                setButtonsState(false);
                return models;
                
            } catch (error) {
                attempt++;
                console.error(`获取${provider}模型列表失败 (尝试 ${attempt}/${retryCount}):`, error);
                
                if (attempt < retryCount) {
                    // 指数退避重试
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                    showToastInPage(`获取模型列表失败，${delay/1000}秒后重试...`, 'warning');
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    // 最后一次尝试失败，显示空列表（不用兜底）
                    modelConfigs[provider].models = [];
                    populateModelSelection([]);
                    showToastInPage(`获取模型列表失败: ${error.message}`, 'error');
                    setButtonsState(false);
                }
            }
        }
        
        return [];
    }

    // 获取阿里云百炼模型列表
    async function fetchBailianModels(apiKey) {
        try {
            const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }
            
            const data = await response.json();
            let models = [];
            
            // 解析模型列表 - 兼容多种响应格式
            if (data.output && data.output.models) {
                // 新格式: output.models
                models = data.output.models.map(model => ({
                    value: model.model_name || model.id,
                    label: model.model_name || model.id
                }));
            } else if (data.data && Array.isArray(data.data)) {
                // 兼容旧格式: data 数组
                models = data.data
                    .filter(model => model.id && (model.id.includes('qwen') || model.id.includes('deepseek')))
                    .map(model => ({
                        value: model.id,
                        label: model.name || model.id
                    }));
            }
            
            return models;
        } catch (error) {
            console.error('获取阿里云百炼模型列表失败:', error);
            throw error; // 抛出错误让上层处理
        }
    }

    // 获取智谱模型列表
    async function fetchZhipuModels(apiKey) {
        try {
            const response = await fetch('https://open.bigmodel.cn/api/paas/v4/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }
            
            const data = await response.json();
            
            // 转换为所需格式（忽略大小写匹配 glm）
            const models = data.data
                .filter(model => model.id.toLowerCase().includes('glm'))
                .map(model => ({
                    value: model.id,
                    label: model.id
                }));
            
            return models;
        } catch (error) {
            console.error('获取智谱模型列表失败:', error);
            throw error;
        }
    }

    // 获取Kimi模型列表
    async function fetchKimiModels(apiKey) {
        try {
            const response = await fetch('https://api.moonshot.cn/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }
            
            const data = await response.json();
            
            // 转换为所需格式
            const models = data.data.map(model => ({
                value: model.id,
                label: model.id
            }));
            
            return models;
        } catch (error) {
            console.error('获取Kimi模型列表失败:', error);
            throw error;
        }
    }

    // 获取DeepSeek模型列表
    async function fetchDeepSeekModels(apiKey) {
        try {
            const response = await fetch('https://api.deepseek.com/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }
            
            const data = await response.json();
            
            // 转换为所需格式
            const models = data.data.map(model => ({
                value: model.id,
                label: model.id
            }));
            
            return models;
        } catch (error) {
            console.error('获取DeepSeek模型列表失败:', error);
            throw error;
        }
    }

    // 获取硅基流动模型列表
    async function fetchSiliconFlowModels(apiKey) {
        try {
            const response = await fetch('https://api.siliconflow.cn/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }
            
            const data = await response.json();
            
            // 转换为所需格式
            const models = data.data.map(model => ({
                value: model.id,
                label: model.id.split('/').pop() || model.id
            }));
            
            return models;
        } catch (error) {
            console.error('获取硅基流动模型列表失败:', error);
            throw error;
        }
    }

    // 获取火山引擎模型列表
    async function fetchVolcengineModels(apiKey) {
        try {
            const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }
            
            const data = await response.json();
            
            // 转换为所需格式
            if (data.data && Array.isArray(data.data)) {
                const models = data.data.map(model => ({
                    value: model.id,
                    label: model.id
                }));
                return models;
            }
            
            return [];
        } catch (error) {
            console.error('获取火山引擎模型列表失败:', error);
            throw error;
        }
    }

    // 获取OpenRouter模型列表
    async function fetchOpenRouterModels(apiKey) {
        try {
            const response = await fetch('https://openrouter.ai/api/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }
            
            const data = await response.json();
            
            // 转换为所需格式，保存 supported_parameters 用于判断是否支持 reasoning
            const models = data.data.slice(0, 100).map(model => ({
                value: model.id,
                label: model.name || model.id,
                supportedParameters: model.supported_parameters || [],
                contextLength: model.context_length,
                description: model.description
            }));
            
            return models;
        } catch (error) {
            console.error('获取OpenRouter模型列表失败:', error);
            throw error;
        }
    }

    // 获取小米Mimo模型列表
    async function fetchMimoModels(apiKey) {
        // 小米Mimo API 不支持获取模型列表，返回空让用户手动输入
        // 默认模型是 mimo-v2-flash
        return [{ value: "mimo-v2-flash", label: "mimo-v2-flash" }];
    }

    // 获取LM Studio模型列表
    async function fetchLMStudioModels(retryCount = 3) {
        const lmstudioUrl = ollamaUrlInput.value.trim() || 'http://localhost:1234';
        if (!lmstudioUrl) return;

        // 显示加载状态
        showToastInPage('正在获取LM Studio模型列表...', 'info');
        setButtonsState(true);
        
        let attempt = 0;
        
        while (attempt < retryCount) {
            try {
                const response = await fetch(`${lmstudioUrl}/v1/models`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    mode: 'cors'
                }).catch(error => {
                    console.error('Fetch错误:', error);
                    throw new Error(`无法连接到LM Studio服务: ${error.message}`);
                });
                
                if (!response.ok) {
                    throw new Error(`获取模型列表失败: ${response.status} ${response.statusText}`);
                }
                
                const data = await response.json().catch(error => {
                    console.error('解析JSON错误:', error);
                    throw new Error('解析LM Studio响应失败');
                });
                
                if (!data.data || !Array.isArray(data.data)) {
                    throw new Error('LM Studio返回了意外的响应格式');
                }
                
                // 清空当前选项
                modelSelectionSelect.innerHTML = '';
                
                // 添加模型选项
                if (data.data.length === 0) {
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = '未找到模型';
                    modelSelectionSelect.appendChild(option);
                    
                    showToastInPage('未找到LM Studio模型，请先加载模型', 'warning');
                } else {
                    // 转换模型数据格式并更新 currentModels
                    currentModels = data.data.map(model => ({
                        value: model.id,
                        label: model.id
                    }));
                    
                    data.data.forEach(model => {
                        const option = document.createElement('option');
                        option.value = model.id;
                        option.textContent = model.id;
                        modelSelectionSelect.appendChild(option);
                    });
                    
                    // 缓存模型列表
                    modelConfigs.lmstudio = modelConfigs.lmstudio || {};
                    modelConfigs.lmstudio.models = currentModels;
                    
                    // 渲染下拉列表
                    renderModelList(currentModels);
                    
                    // 恢复之前选择的模型
                    restoreSavedModel('lmstudio');
                    
                    showToastInPage(`成功获取到 ${data.data.length} 个LM Studio模型`, 'success');
                }
                
                setButtonsState(false);
                return;
                
            } catch (error) {
                attempt++;
                console.error(`获取LM Studio模型列表失败 (尝试 ${attempt}/${retryCount}):`, error);
                
                if (attempt < retryCount) {
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                    showToastInPage(`获取LM Studio模型列表失败，${delay/1000}秒后重试...`, 'warning');
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    modelSelectionSelect.innerHTML = '';
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = '获取模型失败';
                    modelSelectionSelect.appendChild(option);
                    
                    showToastInPage('获取LM Studio模型列表失败: ' + error.message, 'error');
                    setButtonsState(false);
                }
            }
        }
    }

    // 设置按钮状态的函数
    function setButtonsState(disabled) {
        fillFormButton.disabled = disabled;
        extractFormButton.disabled = disabled;
        removeHighlightsButton.disabled = disabled;
        
        // 更新加载指示器
        if (disabled) {
            loadingIndicator.classList.add('active');
        } else {
            loadingIndicator.classList.remove('active');
        }
    }
    
    // 开始AI请求
    function startAIRequest() {
        isAIRequestInProgress = true;
        setButtonsState(true);
        
        // 设置1分钟超时
        aiRequestTimeoutId = setTimeout(() => {
            if (isAIRequestInProgress) {
                endAIRequest();
                showToastInPage('AI请求超时，请重试', 'error');
            }
        }, 60000); // 60秒
    }
    
    // 结束AI请求
    function endAIRequest() {
        isAIRequestInProgress = false;
        setButtonsState(false);
        
        // 清除超时计时器
        if (aiRequestTimeoutId) {
            clearTimeout(aiRequestTimeoutId);
            aiRequestTimeoutId = null;
        }
    }

    // 在页面中显示Toast消息
    function showToastInPage(message, type = 'info', duration = 3000) {
        // 更新状态文本
        statusDiv.textContent = message;
        
        // 设置状态文本样式
        if (type === 'success') {
            statusDiv.style.color = '#52c41a';
        } else if (type === 'error') {
            statusDiv.style.color = '#ff4d4f';
        } else if (type === 'warning') {
            statusDiv.style.color = '#faad14';
        } else {
            statusDiv.style.color = '#1890ff';
        }
        
        // 自动清除状态（仅当不是在AI请求进行中时）
        if (!isAIRequestInProgress || type === 'error' || type === 'warning') {
            setTimeout(() => {
                // 只有当当前消息仍然显示时才清除
                if (statusDiv.textContent === message) {
                    statusDiv.textContent = '';
                    statusDiv.style.color = '';
                }
            }, duration);
        }
        
        // 同时在页面中显示toast
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs && tabs[0] && tabs[0].id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "showToast",
                    message: message,
                    type: type,
                    duration: duration
                }).catch(error => console.log('无法发送消息到内容脚本:', error));
            }
        });
    }

    // 填充表单按钮点击事件
    fillFormButton.addEventListener('click', function() {
        // 如果AI请求正在进行中，则不执行操作
        if (isAIRequestInProgress) {
            showToastInPage('请等待当前请求完成', 'warning');
            return;
        }
        
        let userPrompt = document.getElementById('user-prompt').value.trim();
        
        // 添加补充资料到用户提示词中
        if (currentTagId && additionalInfos[currentTagId]) {
            const additionalInfo = additionalInfos[currentTagId].content.trim();
            if (additionalInfo) {
                userPrompt = `${userPrompt}\n\n补充信息：\n${additionalInfo}`;
            }
        }
        
        if (!userPrompt) {
            showToastInPage('请输入您的要求', 'warning');
            return;
        }
        
        // 开始AI请求，禁用按钮
        startAIRequest();
        
        // 获取当前配置
        const config = getCurrentConfig();
        
        // 先识别页面表单，然后再进行填充
        showToastInPage('正在识别页面表单元素...', 'info');
        
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (!tabs || !tabs[0] || !tabs[0].id) {
                endAIRequest();
                showToastInPage('无法获取当前标签页', 'error');
                return;
            }
            
            try {
                // 先检查内容脚本是否正常响应
                chrome.tabs.sendMessage(tabs[0].id, {action: "ping"}, function(response) {
                    // 处理可能的连接错误
                    if (chrome.runtime.lastError) {
                        if (handleConnectionError(chrome.runtime.lastError, tabs[0].id, () => {
                            // 脚本重新注入后的回调，延迟执行表单识别和填充
                            setTimeout(() => {
                                executeFormRecognitionAndFill(tabs[0].id, config, userPrompt);
                            }, 1000);
                        })) {
                            endAIRequest();
                            return;
                        }
                        endAIRequest();
                        showToastInPage('连接到页面失败: ' + chrome.runtime.lastError.message, 'error');
                        return;
                    }
                    
                    if (response && response.success) {
                        // 内容脚本正常响应，继续执行表单识别和填充
                        executeFormRecognitionAndFill(tabs[0].id, config, userPrompt);
                    } else {
                        // 内容脚本未正常响应，尝试重新注入
                        injectContentScriptAndContinue(tabs[0].id, config, userPrompt);
                    }
                });
            } catch (error) {
                endAIRequest();
                handleConnectionError(error, tabs[0].id);
            }
        });
    });

    // 提取表单按钮点击事件
    extractFormButton.addEventListener('click', function() {
        showToastInPage('正在识别页面表单元素...', 'info');
        
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (!tabs || !tabs[0] || !tabs[0].id) {
                showToastInPage('无法获取当前标签页', 'error');
                return;
            }
            
            try {
                // 先尝试检查内容脚本是否正常响应
                chrome.tabs.sendMessage(tabs[0].id, {action: "ping"}, function(response) {
                    // 处理可能的连接错误
                    if (chrome.runtime.lastError) {
                        if (handleConnectionError(chrome.runtime.lastError, tabs[0].id, () => {
                            // 脚本重新注入后的回调，延迟执行表单识别
                            setTimeout(() => {
                                executeFormExtraction(tabs[0].id);
                            }, 1000);
                        })) {
                            return;
                        }
                    }
                    
                    // 如果内容脚本响应了ping，或者出现了明确的错误，继续正常流程
                    if (response && response.success) {
                        executeFormExtraction(tabs[0].id);
                    } else {
                        // 如果没有响应也没有错误，可能是内容脚本未加载，尝试注入内容脚本
                        console.log('内容脚本可能未加载，尝试重新注入...');
                        chrome.scripting.executeScript({
                            target: {tabId: tabs[0].id},
                            files: ['content.js']
                        }).then(() => {
                            console.log('内容脚本注入成功，继续识别表单');
                            // 延迟一点时间确保脚本加载完成
                            setTimeout(() => {
                                executeFormExtraction(tabs[0].id);
                            }, 500);
                        }).catch(error => {
                            console.error('注入内容脚本失败:', error);
                            showToastInPage('无法加载表单识别功能，请刷新页面后重试', 'error');
                        });
                    }
                });
            } catch (error) {
                handleConnectionError(error, tabs[0].id);
            }
        });
    });
    
    // 移除高亮按钮点击事件
    removeHighlightsButton.addEventListener('click', function() {
        // 如果正在移除高亮，则不重复执行
        if (isHighlightBeingRemoved) {
            return;
        }
        
        isHighlightBeingRemoved = true;
        showToastInPage('正在移除高亮...', 'info');
        
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (!tabs || !tabs[0] || !tabs[0].id) {
                isHighlightBeingRemoved = false;
                showToastInPage('无法获取当前标签页', 'error');
                return;
            }
            
            try {
                chrome.tabs.sendMessage(tabs[0].id, {action: "removeHighlights"}, function(response) {
                    isHighlightBeingRemoved = false;
                    
                    // 处理可能的连接错误
                    if (chrome.runtime.lastError) {
                        if (handleConnectionError(chrome.runtime.lastError, tabs[0].id)) {
                            return;
                        }
                        showToastInPage('移除高亮失败: ' + chrome.runtime.lastError.message, 'error');
                        return;
                    }
                    
                    if (response && response.success) {
                        showToastInPage('已移除所有高亮', 'success');
                        // 同时清除localStorage中的表单元素数据
                        chrome.scripting.executeScript({
                            target: {tabId: tabs[0].id},
                            func: () => localStorage.removeItem('extractedElements')
                        }).catch(error => {
                            console.error('执行脚本时出错:', error);
                        });
                    } else {
                        showToastInPage('移除高亮失败，请刷新页面后重试', 'error');
                    }
                });
            } catch (error) {
                isHighlightBeingRemoved = false;
                handleConnectionError(error, tabs[0].id);
            }
        });
    });

    // 执行表单提取
    function executeFormExtraction(tabId) {
        chrome.tabs.sendMessage(tabId, {action: "extractXPaths"}, function(response) {
            if (chrome.runtime.lastError) {
                if (handleConnectionError(chrome.runtime.lastError, tabId)) {
                    return;
                }
                console.error('发送消息时出错:', chrome.runtime.lastError);
                showToastInPage('识别表单元素失败: ' + chrome.runtime.lastError.message, 'error');
                return;
            }
            
            if (response && response.success) {
                showToastInPage(`已识别 ${response.count} 个表单元素`, 'success');
            } else {
                // 如果识别失败，尝试刷新页面内容脚本状态
                chrome.scripting.executeScript({
                    target: {tabId: tabId},
                    function: () => {
                        // 重置页面上可能的状态
                        const highlights = document.querySelectorAll('.ai-form-highlight');
                        highlights.forEach(el => el.classList.remove('ai-form-highlight'));
                        return true;
                    }
                }).then(() => {
                    // 再次尝试识别
                    setTimeout(() => {
                        chrome.tabs.sendMessage(tabId, {action: "extractXPaths"}, function(retryResponse) {
                            if (chrome.runtime.lastError) {
                                if (handleConnectionError(chrome.runtime.lastError, tabId)) {
                                    return;
                                }
                                showToastInPage('识别表单元素失败: ' + chrome.runtime.lastError.message, 'error');
                                return;
                            }
                            
                            if (retryResponse && retryResponse.success) {
                                showToastInPage(`已识别 ${retryResponse.count} 个表单元素`, 'success');
                            } else {
                                showToastInPage('识别表单元素失败，请刷新页面后重试', 'error');
                            }
                        });
                    }, 300);
                }).catch(error => {
                    console.error('执行脚本时出错:', error);
                    showToastInPage('识别表单元素失败，请刷新页面后重试', 'error');
                });
            }
        });
    }

    // 注入内容脚本并继续执行
    function injectContentScriptAndContinue(tabId, config, userPrompt) {
        console.log('尝试重新注入内容脚本...');
        chrome.scripting.executeScript({
            target: {tabId: tabId},
            files: ['content.js']
        }).then(() => {
            console.log('内容脚本注入成功，继续识别和填充表单');
            // 延迟一点时间确保脚本加载完成
            setTimeout(() => {
                executeFormRecognitionAndFill(tabId, config, userPrompt);
            }, 500);
        }).catch(error => {
            console.error('注入内容脚本失败:', error);
            endAIRequest();
            showToastInPage('无法加载表单识别功能，请刷新页面后重试', 'error');
        });
    }
    
    // 执行表单识别和填充
    function executeFormRecognitionAndFill(tabId, config, userPrompt) {
        // // 组合提示词
        // let additionalInfo = '';
        // if (currentTagId && additionalInfos[currentTagId]) {
        //     additionalInfo = additionalInfos[currentTagId].content.trim();
        // }
        // const combinedPrompt = additionalInfo ? 
        //     `${userPrompt}\n\n补充信息：\n${additionalInfo}` : 
        //     userPrompt;
        
        // 先执行表单识别
        chrome.tabs.sendMessage(tabId, {action: "extractXPaths"}, async function(response) {
            // 处理可能的错误
            if (chrome.runtime.lastError) {
                if (handleConnectionError(chrome.runtime.lastError, tabId)) {
                    endAIRequest();
                    return;
                }
                console.error('发送识别消息时出错:', chrome.runtime.lastError);
                endAIRequest();
                showToastInPage('识别表单元素失败: ' + chrome.runtime.lastError.message, 'error');
                return;
            }
            
            if (response && response.success) {
                showToastInPage(`已识别 ${response.count} 个表单元素，正在处理填充请求...`, 'success');
                
                // 从localStorage获取表单元素
                chrome.scripting.executeScript({
                    target: {tabId: tabId},
                    func: () => localStorage.getItem('extractedElements')
                }).then(async (result) => {
                    if (result && result[0] && result[0].result) {
                        try {
                            const formElements = JSON.parse(result[0].result);
                            
                            // 调用大模型API
                            showToastInPage('正在调用AI模型...', 'info');
                            
                            try {
                                const aiResponse = await callAIModel(config, userPrompt, formElements);
                                
                                // 在控制台记录AI返回的内容
                                console.log('AI模型返回的完整内容:', aiResponse);
                                
                                if (aiResponse && aiResponse.formActions) {
                                    // 发送填充表单的指令
                                    chrome.tabs.sendMessage(tabId, {
                                        action: "fillFormElements",
                                        formActions: aiResponse.formActions
                                    }, function(fillResponse) {
                                        // 处理可能的错误
                                        if (chrome.runtime.lastError) {
                                            if (handleConnectionError(chrome.runtime.lastError, tabId)) {
                                                endAIRequest();
                                                return;
                                            }
                                            console.error('发送填充消息时出错:', chrome.runtime.lastError);
                                            endAIRequest();
                                            showToastInPage('填充表单失败: ' + chrome.runtime.lastError.message, 'error');
                                            return;
                                        }
                                        
                                        // 结束AI请求，启用按钮
                                        endAIRequest();
                                        
                                        if (fillResponse && fillResponse.success) {
                                            showToastInPage(`已成功填充 ${fillResponse.count} 个表单元素`, 'success');
                                            
                                            // 自动触发清除识别
                                            setTimeout(() => {
                                                // 如果正在移除高亮，则不重复执行
                                                if (isHighlightBeingRemoved) {
                                                    return;
                                                }
                                                
                                                isHighlightBeingRemoved = true;
                                                chrome.tabs.sendMessage(tabId, {action: "removeHighlights"}, function(response) {
                                                    isHighlightBeingRemoved = false;
                                                    
                                                    // 处理可能的错误
                                                    if (chrome.runtime.lastError) {
                                                        if (handleConnectionError(chrome.runtime.lastError, tabId)) {
                                                            return;
                                                        }
                                                        console.error('发送移除高亮消息时出错:', chrome.runtime.lastError);
                                                        return;
                                                    }
                                                    
                                                    if (response && response.success) {
                                                        console.log('已自动移除所有高亮');
                                                        // 同时清除localStorage中的表单元素数据
                                                        chrome.scripting.executeScript({
                                                            target: {tabId: tabId},
                                                            func: () => localStorage.removeItem('extractedElements')
                                                        });
                                                    }
                                                });
                                            }, 500); // 延迟500毫秒执行，确保填充完成
                                        } else {
                                            showToastInPage('填充表单失败，请重试', 'error');
                                        }
                                    });
                                } else {
                                    endAIRequest();
                                    showToastInPage('AI模型未返回有效的表单操作', 'error');
                                }
                            } catch (error) {
                                endAIRequest();
                                showToastInPage('调用AI模型失败: ' + error.message, 'error');
                            }
                        } catch (error) {
                            endAIRequest();
                            showToastInPage('解析表单元素数据失败: ' + error.message, 'error');
                        }
                    } else {
                        endAIRequest();
                        showToastInPage('识别表单元素失败，请刷新页面后重试', 'error');
                    }
                }).catch(error => {
                    endAIRequest();
                    console.error('执行脚本时出错:', error);
                    showToastInPage('获取表单元素失败: ' + error.message, 'error');
                });
            } else {
                endAIRequest();
                showToastInPage('识别表单元素失败，请刷新页面后重试', 'error');
            }
        });
    }

    // 获取当前配置
    function getCurrentConfig() {
        const provider = modelProviderSelect.value;
        
        if (provider === 'ollama') {
            return {
                type: 'ollama',
                url: ollamaUrlInput.value,
                model: modelSelectionSelect.value,
                providerConfigs: providerConfigs  // 保存所有供应商的配置
            };
        } else if (provider === 'lmstudio') {
            return {
                type: 'lmstudio',
                url: ollamaUrlInput.value,
                model: modelSelectionSelect.value,
                providerConfigs: providerConfigs  // 保存所有供应商的配置
            };
        } else {
            return {
                type: provider,
                apiKey: apiKeyInput.value,
                model: modelSelectionSelect.value,
                providerConfigs: providerConfigs  // 保存所有供应商的配置
            };
        }
    }

    // 保存配置到Chrome存储
    function saveConfig() {
        const config = getCurrentConfig();
        chrome.storage.sync.set({modelConfig: config}, function() {
            console.log('配置已保存');
        });
    }

    // 调用AI模型API
    async function callAIModel(config, userPrompt, formElements) {
        try {
            if (config.type === 'ollama') {
                return await callOllamaAPI(config, userPrompt, formElements);
            } else if (config.type === 'lmstudio') {
                return await callLMStudioAPI(config, userPrompt, formElements);
            } else if (config.type === 'bailian') {
                return await callBailianAPI(config, userPrompt, formElements);
            } else if (config.type === 'zhipu') {
                return await callZhipuAPI(config, userPrompt, formElements);
            } else if (config.type === 'kimi') {
                return await callKimiAPI(config, userPrompt, formElements);
            } else if (config.type === 'deepseek') {
                return await callDeepSeekAPI(config, userPrompt, formElements);
            } else if (config.type === 'volcengine') {
                return await callVolcengineAPI(config, userPrompt, formElements);
            } else if (config.type === 'siliconflow') {
                return await callSiliconFlowAPI(config, userPrompt, formElements);
            } else if (config.type === 'openrouter') {
                return await callOpenRouterAPI(config, userPrompt, formElements);
            } else if (config.type === 'mimo') {
                return await callMimoAPI(config, userPrompt, formElements);
            }
        } catch (error) {
            console.error('调用AI模型时出错:', error);
            showToastInPage('调用AI模型时出错: ' + error.message, 'error');
            throw error;
        }
    }

    // 调用Ollama API
    async function callOllamaAPI(config, userPrompt, formElements) {
        const url = `${config.url}/api/chat`;
        
        // 获取当前日期和时间
        const now = new Date();
        const dateTimeStr = now.toLocaleString('zh-CN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        // 构建提示词
        const systemPrompt = `你是一个智能表单填充助手。根据用户的要求，帮助用户填写表单。
当前日期和时间是: ${dateTimeStr}

以下是页面上的表单元素列表：
${JSON.stringify(formElements, null, 2)}

请根据用户的要求，确定应该填写哪些表单元素以及填写什么内容。
特别注意：
1. 对于contenteditable元素（可编辑的div），需要填写文本内容
2. 对于复杂表单元素（type为complex的元素），可能需要填写其内部的输入元素
3. 如果是评论框、留言框等，请根据用户要求生成合适的内容
4. 如果需要填写日期，除非用户明确指定，否则请使用当前日期: ${dateTimeStr}

你的回答必须是一个JSON格式，包含formActions数组，每个元素包含elementId和action（填写内容或选择选项）。
例如：{"formActions":[{"elementId":"email","action":"user@example.com"},{"elementId":"age","action":"30"}]}`;

        console.log('发送给Ollama的提示词:', systemPrompt);
        console.log('用户要求:', userPrompt);
        console.log('请求URL:', url);
        console.log('使用模型:', config.model);
        
        try {
            // 通过后台脚本发送请求
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'ollamaRequest',
                    url: url,
                    data: {
                        model: config.model,  // 使用配置中的模型名称
                        messages: [
                            {
                                role: "system",
                                content: systemPrompt
                            },
                            {
                                role: "user",
                                content: userPrompt
                            }
                        ],
                        stream: false,
                        options: {
                            temperature: 0.3
                        }
                    }
                }, response => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    
                    if (!response.success) {
                        reject(new Error(response.error || '请求失败'));
                        return;
                    }
                    
                    resolve(response.data);
                });
            });
            
            console.log('Ollama API 原始响应:', response);
            
            // 解析响应中的JSON
            try {
                if (!response.message || !response.message.content) {
                    throw new Error('Ollama响应格式错误');
                }
                
                const content = response.message.content;
                console.log('Ollama响应内容:', content);
                
                // 尝试提取JSON
                const jsonMatch = content.match(/\{.*\}/s);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('无法从响应中解析JSON');
                }
            } catch (error) {
                console.error('解析Ollama响应时出错:', error);
                throw new Error('无法解析AI响应: ' + error.message);
            }
        } catch (error) {
            console.error('调用Ollama API时出错:', error);
            if (error.message.includes('Failed to fetch')) {
                throw new Error(`无法连接到Ollama服务(${url})，请确保：
1. Ollama 服务已启动
2. 服务地址正确（请使用 http://127.0.0.1:11434）
3. 使用以下命令启动 Ollama 以允许浏览器访问：
   OLLAMA_ORIGINS="*" ollama serve
4. 没有网络连接问题`);
            }
            throw error;
        }
    }

    // 调用阿里云百炼API（使用兼容OpenAI的接口）
    async function callBailianAPI(config, userPrompt, formElements) {
        const url = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
        
        // 获取当前日期和时间
        const now = new Date();
        const dateTimeStr = now.toLocaleString('zh-CN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        // 构建提示词
        const systemPrompt = `你是一个智能表单填充助手。根据用户的要求，帮助用户填写表单。
当前日期和时间是: ${dateTimeStr}

以下是页面上的表单元素列表：
${JSON.stringify(formElements, null, 2)}

请根据用户的要求，确定应该填写哪些表单元素以及填写什么内容。
特别注意：
1. 对于contenteditable元素（可编辑的div），需要填写文本内容
2. 对于复杂表单元素（type为complex的元素），可能需要填写其内部的输入元素
3. 如果是评论框、留言框等，请根据用户要求生成合适的内容
4. 如果需要填写日期，除非用户明确指定，否则请使用当前日期: ${dateTimeStr}

你的回答必须是一个JSON格式，包含formActions数组，每个元素包含elementId和action（填写内容或选择选项）。
例如：{"formActions":[{"elementId":"email","action":"user@example.com"},{"elementId":"age","action":"30"}]}`;

        console.log('发送给阿里云百炼的提示词:', systemPrompt);
        console.log('用户要求:', userPrompt);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model || 'qwen-long',
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 2000
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('阿里云百炼API错误:', errorData);
            throw new Error(`阿里云百炼 API 请求失败: ${response.status} - ${errorData.error?.message || '未知错误'}`);
        }
        
        const data = await response.json();
        console.log('阿里云百炼 API 原始响应:', data);
        
        // 解析响应中的JSON
        try {
            // 检查响应格式
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                console.error('意外的API响应格式:', data);
                throw new Error('API返回了意外的响应格式');
            }
            
            const content = data.choices[0].message.content;
            console.log('阿里云百炼响应内容:', content);
            
            // 尝试提取JSON
            const jsonMatch = content.match(/\{.*\}/s);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            } else {
                // 如果没有找到JSON格式，尝试解析整个内容
                try {
                    return JSON.parse(content);
                } catch {
                    throw new Error('无法从响应中解析JSON');
                }
            }
        } catch (error) {
            console.error('解析阿里云百炼响应时出错:', error);
            throw new Error('无法解析AI响应: ' + error.message);
        }
    }

    // 调用智谱API
    async function callZhipuAPI(config, userPrompt, formElements) {
        const url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
        
        // 获取当前日期和时间
        const now = new Date();
        const dateTimeStr = now.toLocaleString('zh-CN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        // 构建提示词
        const systemPrompt = `你是一个智能表单填充助手。根据用户的要求，帮助用户填写表单。
当前日期和时间是: ${dateTimeStr}

以下是页面上的表单元素列表：
${JSON.stringify(formElements, null, 2)}

请根据用户的要求，确定应该填写哪些表单元素以及填写什么内容。
特别注意：
1. 对于contenteditable元素（可编辑的div），需要填写文本内容
2. 对于复杂表单元素（type为complex的元素），可能需要填写其内部的输入元素
3. 如果是评论框、留言框等，请根据用户要求生成合适的内容
4. 如果需要填写日期，除非用户明确指定，否则请使用当前日期: ${dateTimeStr}

你的回答必须是一个JSON格式，包含formActions数组，每个元素包含elementId和action（填写内容或选择选项）。
例如：{"formActions":[{"elementId":"email","action":"user@example.com"},{"elementId":"age","action":"30"}]}`;

        console.log('发送给智谱的提示词:', systemPrompt);
        console.log('用户要求:', userPrompt);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                stream: false,
                temperature: 0.3
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('智谱API错误:', errorData);
            throw new Error(`智谱 API 请求失败: ${response.status} - ${errorData.message || '未知错误'}`);
        }
        
        const data = await response.json();
        console.log('智谱 API 原始响应:', data);
        
        // 解析响应中的JSON
        try {
            // 检查响应格式
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                console.error('意外的API响应格式:', data);
                throw new Error('API返回了意外的响应格式');
            }
            
            const content = data.choices[0].message.content;
            console.log('智谱响应内容:', content);
            
            // 尝试提取JSON
            const jsonMatch = content.match(/\{.*\}/s);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            } else {
                // 如果没有找到JSON格式，尝试解析整个内容
                try {
                    return JSON.parse(content);
                } catch {
                    throw new Error('无法从响应中解析JSON');
                }
            }
        } catch (error) {
            console.error('解析智谱响应时出错:', error);
            throw new Error('无法解析AI响应: ' + error.message);
        }
    }

    // 调用Kimi API
    async function callKimiAPI(config, userPrompt, formElements) {
        const url = 'https://api.moonshot.cn/v1/chat/completions';
        
        // 获取当前日期和时间
        const now = new Date();
        const dateTimeStr = now.toLocaleString('zh-CN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        // 构建提示词
        const systemPrompt = `你是一个智能表单填充助手。根据用户的要求，帮助用户填写表单。
当前日期和时间是: ${dateTimeStr}

以下是页面上的表单元素列表：
${JSON.stringify(formElements, null, 2)}

请根据用户的要求，确定应该填写哪些表单元素以及填写什么内容。
特别注意：
1. 对于contenteditable元素（可编辑的div），需要填写文本内容
2. 对于复杂表单元素（type为complex的元素），可能需要填写其内部的输入元素
3. 如果是评论框、留言框等，请根据用户要求生成合适的内容
4. 如果需要填写日期，除非用户明确指定，否则请使用当前日期: ${dateTimeStr}

你的回答必须是一个JSON格式，包含formActions数组，每个元素包含elementId和action（填写内容或选择选项）。
例如：{"formActions":[{"elementId":"email","action":"user@example.com"},{"elementId":"age","action":"30"}]}`;

        console.log('发送给Kimi的提示词:', systemPrompt);
        console.log('用户要求:', userPrompt);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
                model: config.model || 'moonshot-v1-32k',
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                temperature: 0.3
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Kimi API错误:', errorData);
            throw new Error(`Kimi API 请求失败: ${response.status} - ${errorData.error?.message || '未知错误'}`);
        }
        
        const data = await response.json();
        console.log('Kimi API 原始响应:', data);
        
        // 解析响应中的JSON
        try {
            // 检查响应格式
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                console.error('意外的API响应格式:', data);
                throw new Error('API返回了意外的响应格式');
            }
            
            const content = data.choices[0].message.content;
            console.log('Kimi响应内容:', content);
            
            // 尝试提取JSON
            const jsonMatch = content.match(/\{.*\}/s);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            } else {
                try {
                    return JSON.parse(content);
                } catch {
                    throw new Error('无法从响应中解析JSON');
                }
            }
        } catch (error) {
            console.error('解析Kimi响应时出错:', error);
            throw new Error('无法解析AI响应: ' + error.message);
        }
    }

    // 调用DeepSeek API
    async function callDeepSeekAPI(config, userPrompt, formElements) {
        const url = 'https://api.deepseek.com/v1/chat/completions';
        
        // 获取当前日期和时间
        const now = new Date();
        const dateTimeStr = now.toLocaleString('zh-CN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        // 构建提示词
        const systemPrompt = `你是一个智能表单填充助手。根据用户的要求，帮助用户填写表单。
当前日期和时间是: ${dateTimeStr}

以下是页面上的表单元素列表：
${JSON.stringify(formElements, null, 2)}

请根据用户的要求，确定应该填写哪些表单元素以及填写什么内容。
特别注意：
1. 对于contenteditable元素（可编辑的div），需要填写文本内容
2. 对于复杂表单元素（type为complex的元素），可能需要填写其内部的输入元素
3. 如果是评论框、留言框等，请根据用户要求生成合适的内容
4. 如果需要填写日期，除非用户明确指定，否则请使用当前日期: ${dateTimeStr}

你的回答必须是一个JSON格式，包含formActions数组，每个元素包含elementId和action（填写内容或选择选项）。
例如：{"formActions":[{"elementId":"email","action":"user@example.com"},{"elementId":"age","action":"30"}]}`;

        console.log('发送给DeepSeek的提示词:', systemPrompt);
        console.log('用户要求:', userPrompt);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ]
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('DeepSeek API错误:', errorData);
            throw new Error(`DeepSeek API 请求失败: ${response.status} - ${errorData.message || '未知错误'}`);
        }
        
        const data = await response.json();
        console.log('DeepSeek API 原始响应:', data);
        
        // 解析响应中的JSON
        try {
            // 检查响应格式
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                console.error('意外的API响应格式:', data);
                throw new Error('API返回了意外的响应格式');
            }
            
            const content = data.choices[0].message.content;
            console.log('DeepSeek响应内容:', content);
            
            // 尝试提取JSON
            const jsonMatch = content.match(/\{.*\}/s);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            } else {
                // 如果没有找到JSON格式，尝试解析整个内容
                try {
                    return JSON.parse(content);
                } catch {
                    throw new Error('无法从响应中解析JSON');
                }
            }
        } catch (error) {
            console.error('解析DeepSeek响应时出错:', error);
            throw new Error('无法解析AI响应: ' + error.message);
        }
    }

    // 调用SiliconFlow API
    async function callSiliconFlowAPI(config, userPrompt, formElements) {
        const url = 'https://api.siliconflow.cn/v1/chat/completions';
        
        // 获取当前日期和时间
        const now = new Date();
        const dateTimeStr = now.toLocaleString('zh-CN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        // 构建提示词
        const systemPrompt = `你是一个智能表单填充助手。根据用户的要求，帮助用户填写表单。
当前日期和时间是: ${dateTimeStr}

以下是页面上的表单元素列表：
${JSON.stringify(formElements, null, 2)}

请根据用户的要求，确定应该填写哪些表单元素以及填写什么内容。
特别注意：
1. 对于contenteditable元素（可编辑的div），需要填写文本内容
2. 对于复杂表单元素（type为complex的元素），可能需要填写其内部的输入元素
3. 如果是评论框、留言框等，请根据用户要求生成合适的内容
4. 如果需要填写日期，除非用户明确指定，否则请使用当前日期: ${dateTimeStr}

你的回答必须是一个JSON格式，包含formActions数组，每个元素包含elementId和action（填写内容或选择选项）。
例如：{"formActions":[{"elementId":"email","action":"user@example.com"},{"elementId":"age","action":"30"}]}`;

        console.log('发送给SiliconFlow的提示词:', systemPrompt);
        console.log('用户要求:', userPrompt);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ]
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('SiliconFlow API错误:', errorData);
            throw new Error(`SiliconFlow API 请求失败: ${response.status} - ${errorData.message || '未知错误'}`);
        }
        
        const data = await response.json();
        console.log('SiliconFlow API 原始响应:', data);
        
        // 解析响应中的JSON
        try {
            // 检查响应格式
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                console.error('意外的API响应格式:', data);
                throw new Error('API返回了意外的响应格式');
            }
            
            const content = data.choices[0].message.content;
            console.log('SiliconFlow响应内容:', content);
            
            // 尝试提取JSON
            const jsonMatch = content.match(/\{.*\}/s);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            } else {
                // 如果没有找到JSON格式，尝试解析整个内容
                try {
                    return JSON.parse(content);
                } catch {
                    throw new Error('无法从响应中解析JSON');
                }
            }
        } catch (error) {
            console.error('解析SiliconFlow响应时出错:', error);
            throw new Error('无法解析AI响应: ' + error.message);
        }
    }

    // 调用Volcengine API（火山引擎/豆包）
    async function callVolcengineAPI(config, userPrompt, formElements) {
        // 火山引擎使用 /api/v3/responses 端点
        const url = 'https://ark.cn-beijing.volces.com/api/v3/responses';
        
        // 获取当前日期和时间
        const now = new Date();
        const dateTimeStr = now.toLocaleString('zh-CN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        // 构建提示词（火山引擎用 input 字段，需要把 system 和 user 合并）
        const fullPrompt = `你是一个智能表单填充助手。根据用户的要求，帮助用户填写表单。
当前日期和时间是: ${dateTimeStr}

以下是页面上的表单元素列表：
${JSON.stringify(formElements, null, 2)}

请根据用户的要求，确定应该填写哪些表单元素以及填写什么内容。
特别注意：
1. 对于contenteditable元素（可编辑的div），需要填写文本内容
2. 对于复杂表单元素（type为complex的元素），可能需要填写其内部的输入元素
3. 如果是评论框、留言框等，请根据用户要求生成合适的内容
4. 如果需要填写日期，除非用户明确指定，否则请使用当前日期: ${dateTimeStr}

你的回答必须是一个JSON格式，包含formActions数组，每个元素包含elementId和action（填写内容或选择选项）。
例如：{"formActions":[{"elementId":"email","action":"user@example.com"},{"elementId":"age","action":"30"}]}

用户要求：${userPrompt}`;

        console.log('发送给Volcengine的提示词:', fullPrompt);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
                model: config.model,
                input: fullPrompt
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Volcengine API错误:', errorData);
            throw new Error(`Volcengine API 请求失败: ${response.status} - ${errorData.error?.message || errorData.message || '未知错误'}`);
        }
        
        const data = await response.json();
        console.log('Volcengine API 原始响应:', data);
        
        // 解析响应中的JSON
        try {
            // 火山引擎 responses 端点返回格式：{ output: { ... } } 或 { output_text: "..." }
            let content = '';
            if (data.output_text) {
                content = data.output_text;
            } else if (data.output && typeof data.output === 'string') {
                content = data.output;
            } else if (data.output && data.output.text) {
                content = data.output.text;
            } else if (data.choices && data.choices[0] && data.choices[0].message) {
                content = data.choices[0].message.content;
            } else {
                console.error('意外的API响应格式:', data);
                throw new Error('API返回了意外的响应格式');
            }
            
            console.log('Volcengine响应内容:', content);
            
            // 尝试提取JSON
            const jsonMatch = content.match(/\{.*\}/s);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            } else {
                // 如果没有找到JSON格式，尝试解析整个内容
                try {
                    return JSON.parse(content);
                } catch {
                    throw new Error('无法从响应中解析JSON');
                }
            }
        } catch (error) {
            console.error('解析Volcengine响应时出错:', error);
            throw new Error('无法解析AI响应: ' + error.message);
        }
    }

    // 调用OpenRouter API
    async function callOpenRouterAPI(config, userPrompt, formElements) {
        const url = 'https://openrouter.ai/api/v1/chat/completions';
        
        // 获取当前日期和时间
        const now = new Date();
        const dateTimeStr = now.toLocaleString('zh-CN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        // 构建提示词
        const systemPrompt = `你是一个智能表单填充助手。根据用户的要求，帮助用户填写表单。
当前日期和时间是: ${dateTimeStr}

以下是页面上的表单元素列表：
${JSON.stringify(formElements, null, 2)}

请根据用户的要求，确定应该填写哪些表单元素以及填写什么内容。
特别注意：
1. 对于contenteditable元素（可编辑的div），需要填写文本内容
2. 对于复杂表单元素（type为complex的元素），可能需要填写其内部的输入元素
3. 如果是评论框、留言框等，请根据用户要求生成合适的内容
4. 如果需要填写日期，除非用户明确指定，否则请使用当前日期: ${dateTimeStr}

你的回答必须是一个JSON格式，包含formActions数组，每个元素包含elementId和action（填写内容或选择选项）。
例如：{"formActions":[{"elementId":"email","action":"user@example.com"},{"elementId":"age","action":"30"}]}`;

        console.log('发送给OpenRouter的提示词:', systemPrompt);
        console.log('用户要求:', userPrompt);
        
        // 构建请求体
        const requestBody = {
            model: config.model || 'google/gemini-3-flash-preview',
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: userPrompt
                }
            ]
        };
        
        // 如果启用了 reasoning，添加 reasoning 参数
        if (reasoningEnabledCheckbox && reasoningEnabledCheckbox.checked) {
            requestBody.reasoning = {
                enabled: true
            };
            console.log('已启用 Reasoning 模式');
        }
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('OpenRouter API错误:', errorData);
            throw new Error(`OpenRouter API 请求失败: ${response.status} - ${errorData.error?.message || '未知错误'}`);
        }
        
        const data = await response.json();
        console.log('OpenRouter API 原始响应:', data);
        
        // 解析响应中的JSON
        try {
            // 检查响应格式
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                console.error('意外的API响应格式:', data);
                throw new Error('API返回了意外的响应格式');
            }
            
            const content = data.choices[0].message.content;
            console.log('OpenRouter响应内容:', content);
            
            // 尝试提取JSON
            const jsonMatch = content.match(/\{.*\}/s);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            } else {
                try {
                    return JSON.parse(content);
                } catch {
                    throw new Error('无法从响应中解析JSON');
                }
            }
        } catch (error) {
            console.error('解析OpenRouter响应时出错:', error);
            throw new Error('无法解析AI响应: ' + error.message);
        }
    }

    // 调用小米Mimo API
    async function callMimoAPI(config, userPrompt, formElements) {
        const url = 'https://api.xiaomimimo.com/v1/chat/completions';
        
        // 获取当前日期和时间
        const now = new Date();
        const dateTimeStr = now.toLocaleString('zh-CN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        // 构建提示词
        const systemPrompt = `你是一个智能表单填充助手。根据用户的要求，帮助用户填写表单。
当前日期和时间是: ${dateTimeStr}

以下是页面上的表单元素列表：
${JSON.stringify(formElements, null, 2)}

请根据用户的要求，确定应该填写哪些表单元素以及填写什么内容。
特别注意：
1. 对于contenteditable元素（可编辑的div），需要填写文本内容
2. 对于复杂表单元素（type为complex的元素），可能需要填写其内部的输入元素
3. 如果是评论框、留言框等，请根据用户要求生成合适的内容
4. 如果需要填写日期，除非用户明确指定，否则请使用当前日期: ${dateTimeStr}

你的回答必须是一个JSON格式，包含formActions数组，每个元素包含elementId和action（填写内容或选择选项）。
例如：{"formActions":[{"elementId":"email","action":"user@example.com"},{"elementId":"age","action":"30"}]}`;

        console.log('发送给小米Mimo的提示词:', systemPrompt);
        console.log('用户要求:', userPrompt);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
                model: config.model || 'mimo-v2-flash',
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                temperature: 0.3
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('小米Mimo API错误:', errorData);
            throw new Error(`小米Mimo API 请求失败: ${response.status} - ${errorData.error?.message || '未知错误'}`);
        }
        
        const data = await response.json();
        console.log('小米Mimo API 原始响应:', data);
        
        // 解析响应中的JSON
        try {
            // 检查响应格式
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                console.error('意外的API响应格式:', data);
                throw new Error('API返回了意外的响应格式');
            }
            
            const content = data.choices[0].message.content;
            console.log('小米Mimo响应内容:', content);
            
            // 尝试提取JSON
            const jsonMatch = content.match(/\{.*\}/s);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            } else {
                try {
                    return JSON.parse(content);
                } catch {
                    throw new Error('无法从响应中解析JSON');
                }
            }
        } catch (error) {
            console.error('解析小米Mimo响应时出错:', error);
            throw new Error('无法解析AI响应: ' + error.message);
        }
    }

    // 调用LM Studio API
    async function callLMStudioAPI(config, userPrompt, formElements) {
        const url = `${config.url || 'http://localhost:1234'}/v1/chat/completions`;
        
        // 获取当前日期和时间
        const now = new Date();
        const dateTimeStr = now.toLocaleString('zh-CN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        // 构建提示词
        const systemPrompt = `你是一个智能表单填充助手。根据用户的要求，帮助用户填写表单。
当前日期和时间是: ${dateTimeStr}

以下是页面上的表单元素列表：
${JSON.stringify(formElements, null, 2)}

请根据用户的要求，确定应该填写哪些表单元素以及填写什么内容。
特别注意：
1. 对于contenteditable元素（可编辑的div），需要填写文本内容
2. 对于复杂表单元素（type为complex的元素），可能需要填写其内部的输入元素
3. 如果是评论框、留言框等，请根据用户要求生成合适的内容
4. 如果需要填写日期，除非用户明确指定，否则请使用当前日期: ${dateTimeStr}

你的回答必须是一个JSON格式，包含formActions数组，每个元素包含elementId和action（填写内容或选择选项）。
例如：{"formActions":[{"elementId":"email","action":"user@example.com"},{"elementId":"age","action":"30"}]}`;

        console.log('发送给LM Studio的提示词:', systemPrompt);
        console.log('用户要求:', userPrompt);
        console.log('请求URL:', url);
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: config.model || 'local-model',
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt
                        },
                        {
                            role: 'user',
                            content: userPrompt
                        }
                    ],
                    temperature: 0.3
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('LM Studio API错误:', errorData);
                throw new Error(`LM Studio API 请求失败: ${response.status} - ${errorData.error?.message || '未知错误'}`);
            }
            
            const data = await response.json();
            console.log('LM Studio API 原始响应:', data);
            
            // 解析响应中的JSON
            try {
                // 检查响应格式
                if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                    console.error('意外的API响应格式:', data);
                    throw new Error('API返回了意外的响应格式');
                }
                
                const content = data.choices[0].message.content;
                console.log('LM Studio响应内容:', content);
                
                // 尝试提取JSON
                const jsonMatch = content.match(/\{.*\}/s);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                } else {
                    try {
                        return JSON.parse(content);
                    } catch {
                        throw new Error('无法从响应中解析JSON');
                    }
                }
            } catch (error) {
                console.error('解析LM Studio响应时出错:', error);
                throw new Error('无法解析AI响应: ' + error.message);
            }
        } catch (error) {
            console.error('调用LM Studio API时出错:', error);
            if (error.message.includes('Failed to fetch')) {
                throw new Error(`无法连接到LM Studio服务(${url})，请确保：
1. LM Studio 服务已启动
2. 服务地址正确（默认为 http://localhost:1234）
3. 已在 LM Studio 中加载模型`);
            }
            throw error;
        }
    }

    // 动态获取Ollama模型列表
    async function fetchOllamaModels(retryCount = 3) {
        const ollamaUrl = ollamaUrlInput.value.trim();
        if (!ollamaUrl) return;

        // 显示加载状态
        showToastInPage('正在获取Ollama模型列表...', 'info');
        setButtonsState(true); // 禁用按钮
        
        let attempt = 0;
        
        while (attempt < retryCount) {
            try {
                const response = await fetch(`${ollamaUrl}/api/tags`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    mode: 'cors'
                }).catch(error => {
                    console.error('Fetch错误:', error);
                    throw new Error(`无法连接到Ollama服务: ${error.message}`);
                });
                
                if (!response.ok) {
                    throw new Error(`获取模型列表失败: ${response.status} ${response.statusText}`);
                }
                
                const data = await response.json().catch(error => {
                    console.error('解析JSON错误:', error);
                    throw new Error('解析Ollama响应失败');
                });
                
                if (!data.models || !Array.isArray(data.models)) {
                    throw new Error('Ollama返回了意外的响应格式');
                }
                
                // 清空当前选项
                modelSelectionSelect.innerHTML = '';
                
                // 添加模型选项
                if (data.models.length === 0) {
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = '未找到模型';
                    modelSelectionSelect.appendChild(option);
                    
                    showToastInPage('未找到Ollama模型，请先安装模型', 'warning');
                } else {
                    // 转换模型数据格式并更新 currentModels
                    currentModels = data.models.map(model => ({
                        value: model.name,
                        label: model.name
                    }));
                    
                    data.models.forEach(model => {
                        const option = document.createElement('option');
                        option.value = model.name;
                        option.textContent = model.name;
                        modelSelectionSelect.appendChild(option);
                    });
                    
                    // 缓存模型列表
                    modelConfigs.ollama = modelConfigs.ollama || {};
                    modelConfigs.ollama.models = currentModels;
                    
                    // 渲染下拉列表
                    renderModelList(currentModels);
                    
                    // 恢复之前选择的模型
                    restoreSavedModel('ollama');
                    
                    showToastInPage(`成功获取到 ${data.models.length} 个Ollama模型`, 'success');
                }
                
                setButtonsState(false); // 启用按钮
                return;
                
            } catch (error) {
                attempt++;
                console.error(`获取Ollama模型列表失败 (尝试 ${attempt}/${retryCount}):`, error);
                
                // 检查是否是连接错误
                if (error.message && error.message.includes("Receiving end does not exist")) {
                    showToastInPage(`连接错误: 无法与页面通信，可能需要刷新页面`, 'error');
                    
                    // 添加一个默认选项
                    modelSelectionSelect.innerHTML = '';
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = '获取模型失败';
                    modelSelectionSelect.appendChild(option);
                    
                    setButtonsState(false); // 启用按钮
                    return;
                }
                
                if (attempt < retryCount) {
                    // 指数退避重试
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                    showToastInPage(`获取Ollama模型列表失败，${delay/1000}秒后重试...`, 'warning');
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    // 最后一次尝试失败
                    modelSelectionSelect.innerHTML = '';
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = '获取模型失败';
                    modelSelectionSelect.appendChild(option);
                    
                    showToastInPage('获取Ollama模型列表失败: ' + error.message, 'error');
                    setButtonsState(false); // 启用按钮
                }
            }
        }
    }

    // 初始化
    loadSavedConfig();

    // 为用户输入框添加快捷键（Ctrl + Enter）
    userPromptTextarea.addEventListener('keydown', function(e) {
        // 检查是否按下了Ctrl+Enter
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault(); // 阻止默认行为
            
            // 如果AI请求正在进行中，则不执行操作
            if (isAIRequestInProgress) {
                showToastInPage('请等待当前请求完成', 'warning');
                return;
            }
            
            fillFormButton.click(); // 触发填充按钮的点击事件
            showToastInPage('使用快捷键 Ctrl+Enter 触发填充', 'info', 1500);
        }
    });

    // 显示模型下拉列表
    function showModelDropdown() {
        if (currentModels.length > 0) {
            modelDropdown.style.display = 'block';
        }
    }
    
    // 隐藏模型下拉列表
    function hideModelDropdown() {
        modelDropdown.style.display = 'none';
    }
    
    // 过滤模型列表
    function filterModels(query) {
        if (!query) {
            renderModelList(currentModels);
            return;
        }
        
        const filteredModels = currentModels.filter(model => 
            model.label.toLowerCase().includes(query.toLowerCase()) || 
            model.value.toLowerCase().includes(query.toLowerCase())
        );
        
        renderModelList(filteredModels);
    }
    
    // 渲染模型列表
    function renderModelList(models) {
        modelList.innerHTML = '';
        
        if (models.length === 0) {
            const noResults = document.createElement('li');
            noResults.textContent = '未找到匹配的模型';
            modelList.appendChild(noResults);
            return;
        }
        
        models.forEach(model => {
            const item = document.createElement('li');
            item.textContent = model.label;
            item.dataset.value = model.value;
            item.addEventListener('click', () => {
                selectModel(model);
            });
            modelList.appendChild(item);
        });
    }
    
    // 选择模型
    function selectModel(model) {
        modelInput.value = model.label;
        modelSelectionSelect.value = model.value;
        hideModelDropdown();
        
        // 检查是否支持 reasoning 并更新开关显示
        updateReasoningToggle(model);
        
        // 触发 change 事件
        const event = new Event('change');
        modelSelectionSelect.dispatchEvent(event);
    }
    
    // 更新 Reasoning 开关显示状态
    function updateReasoningToggle(model) {
        const provider = modelProviderSelect.value;
        
        // 只有 OpenRouter 支持 reasoning 开关
        if (provider === 'openrouter' && model && model.supportedParameters) {
            const supportsReasoning = model.supportedParameters.includes('reasoning') || 
                                      model.supportedParameters.includes('include_reasoning');
            if (supportsReasoning) {
                reasoningToggleContainer.classList.remove('hidden');
                return;
            }
        }
        
        // 隐藏开关
        reasoningToggleContainer.classList.add('hidden');
        reasoningEnabledCheckbox.checked = false;
    }
    
    // 根据模型值查找模型信息
    function findModelByValue(value) {
        return currentModels.find(m => m.value === value);
    }
    
    // 刷新模型列表
    function refreshModels() {
        const provider = modelProviderSelect.value;
        if (provider === 'ollama') {
            fetchOllamaModels();
        } else if (provider === 'lmstudio') {
            fetchLMStudioModels();
        } else {
            const apiKey = apiKeyInput.value.trim();
            if (apiKey) {
                fetchModels(provider, apiKey);
            } else {
                showToastInPage('请先输入API Key', 'warning');
            }
        }
    }
    
    // 模型输入框事件
    modelInput.addEventListener('focus', showModelDropdown);
    modelInput.addEventListener('input', () => {
        showModelDropdown();
        filterModels(modelInput.value);
    });
    
    // 刷新按钮事件
    refreshModelsButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        refreshModels();
    });
    
    // 点击其他地方隐藏下拉列表
    document.addEventListener('click', (e) => {
        if (!modelInput.contains(e.target) && !modelDropdown.contains(e.target) && !refreshModelsButton.contains(e.target)) {
            hideModelDropdown();
        }
    });
    
    // 反馈按钮点击事件
    if (feedbackLink) {
        feedbackLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (feedbackModal) {
                feedbackModal.style.display = 'flex';
            }
        });
    }
    
    // 关闭模态框按钮点击事件
    if (closeModalButton) {
        closeModalButton.addEventListener('click', function() {
            if (feedbackModal) {
                feedbackModal.style.display = 'none';
            }
        });
    }
    
    // 点击模态框外部关闭模态框
    window.addEventListener('click', function(event) {
        if (event.target === feedbackModal) {
            feedbackModal.style.display = 'none';
        }
    });

    // 加载保存的补充资料
    chrome.storage.local.get('additionalInfo', function(data) {
        if (data.additionalInfo) {
            additionalInfoTextarea.value = data.additionalInfo;
            updateWordCount();
        }
    });

    // 更新字数统计
    function updateWordCount() {
        const text = additionalInfoTextarea.value;
        const count = text.length;
        let className = '';
        
        if (count > 1000) {
            className = 'error';
        } else if (count > 800) {
            className = 'warning';
        }
        
        wordCountDiv.textContent = `${count} 字`;
        wordCountDiv.className = `word-count ${className}`;
    }

    // 监听补充资料输入
    additionalInfoTextarea.addEventListener('input', function() {
        updateWordCount();
    });
}); 