// script.js - 蓝绿渐变风格
document.addEventListener('DOMContentLoaded', function ()
{
    // ===== 文章数据 =====
    const postsData = [
        {
            id: 1,
            category: 'JavaScript',
            title: '深入理解闭包：从词法作用域到实际应用',
            excerpt: '探索JavaScript闭包的工作原理，通过实际案例理解这一核心概念，掌握闭包在模块化和数据封装中的应用。',
            date: '2025-05-29',
            readTime: '8 分钟'
        },
        {
            id: 2,
            category: 'CSS',
            title: 'CSS 渐变完全指南：创造令人惊叹的视觉效果',
            excerpt: '从线性渐变到锥形渐变，全面掌握CSS渐变的所有技巧，学习如何创建流畅的背景和视觉特效。',
            date: '2025-05-27',
            readTime: '6 分钟'
        },
        {
            id: 3,
            category: 'React',
            title: 'React Server Components 深度解析',
            excerpt: '理解RSC的工作原理，学习如何在项目中正确使用服务端组件，优化应用性能与用户体验。',
            date: '2025-05-25',
            readTime: '10 分钟'
        },
        {
            id: 4,
            category: 'Node.js',
            title: '构建高性能 RESTful API 的最佳实践',
            excerpt: '学习Express.js框架的最佳实践，包括路由设计、中间件使用、错误处理和性能优化策略。',
            date: '2025-05-23',
            readTime: '12 分钟'
        },
        {
            id: 5,
            category: 'TypeScript',
            title: 'TypeScript 高级类型体操：泛型与条件类型',
            excerpt: '掌握TypeScript的高级类型系统，学习泛型约束、条件类型和映射类型的实际应用场景。',
            date: '2025-05-21',
            readTime: '9 分钟'
        },
        {
            id: 6,
            category: 'JavaScript',
            title: 'Web Workers 多线程编程实战指南',
            excerpt: '利用Web Workers实现浏览器端多线程处理，优化CPU密集型任务，提升应用响应速度。',
            date: '2025-05-19',
            readTime: '7 分钟'
        }
    ];

    let filteredPosts = [...postsData];
    let currentFilter = 'all';

    // ===== 渲染文章列表 =====
    function renderPosts(posts)
    {
        const grid = document.getElementById('postsGrid');
        grid.innerHTML = '';

        posts.forEach(post =>
        {
            const card = document.createElement('article');
            card.className = 'post-card';
            card.innerHTML = `
                <span class="card-category">${post.category}</span>
                <h3 class="card-title">${post.title}</h3>
                <p class="card-excerpt">${post.excerpt}</p>
                <div class="card-footer">
                    <span class="card-date">${post.date}</span>
                    <span class="card-read">阅读更多 →</span>
                </div>
            `;

            card.addEventListener('click', () => openPost(post));
            grid.appendChild(card);
        });
    }

    // ===== 打开文章 =====
    function openPost(post)
    {
        showToast(`📖 正在阅读: ${post.title}`);
    }

    // ===== Toast 通知 =====
    function showToast(message)
    {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 2rem;
            left: 50%;
            transform: translateX(-50%);
            background: var(--bg-card);
            backdrop-filter: blur(20px);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            padding: 1rem 2rem;
            border-radius: 50px;
            z-index: 1000;
            box-shadow: var(--shadow-lg);
            font-weight: 500;
            animation: toastIn 0.3s ease, toastOut 0.3s ease 2.7s forwards;
            font-family: 'Inter', sans-serif;
        `;

        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // ===== 分类筛选 =====
    document.querySelectorAll('.filter-tab').forEach(tab =>
    {
        tab.addEventListener('click', function ()
        {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            currentFilter = this.dataset.filter;

            if (currentFilter === 'all')
            {
                filteredPosts = [...postsData];
            } else
            {
                filteredPosts = postsData.filter(post =>
                    post.category.toLowerCase() === currentFilter
                );
            }

            renderPosts(filteredPosts);
        });
    });

    // ===== 数字递增动画 =====
    function animateNumbers()
    {
        document.querySelectorAll('.stat-number').forEach(stat =>
        {
            const target = stat.dataset.count;
            const isK = target.includes('k');
            const num = parseInt(target);
            const duration = 2000;
            const start = 0;
            const increment = num / (duration / 16);
            let current = start;

            const timer = setInterval(() =>
            {
                current += increment;
                if (current >= num)
                {
                    current = num;
                    clearInterval(timer);
                }
                stat.textContent = Math.floor(current) + (isK ? 'k' : '');
            }, 16);
        });
    }

// ===== 系统颜色主题切换（完整版） =====
    const themeToggle = document.getElementById('themeToggle');
    const sunPath = 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z';
    const moonPath = 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z';

// 获取系统颜色偏好
    function getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

// 获取当前主题（优先手动设置，其次系统）
    function getCurrentTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            return savedTheme; // 'dark' 或 'light'
        }
        return 'auto'; // 跟随系统
    }

// 应用主题
    function applyTheme(theme) {
        const html = document.documentElement;
        const iconPath = themeToggle.querySelector('path');

        if (theme === 'auto') {
            // 移除手动设置，跟随系统
            html.removeAttribute('data-theme');
            const systemTheme = getSystemTheme();
            iconPath.setAttribute('d', systemTheme === 'dark' ? sunPath : moonPath);
            localStorage.removeItem('theme');
        } else {
            // 手动设置主题
            html.setAttribute('data-theme', theme);
            iconPath.setAttribute('d', theme === 'dark' ? sunPath : moonPath);
            localStorage.setItem('theme', theme);
        }
    }

// 初始化主题
    function initTheme() {
        const currentTheme = getCurrentTheme();
        applyTheme(currentTheme);

        // 如果是自动模式，更新图标
        if (currentTheme === 'auto') {
            const systemTheme = getSystemTheme();
            const iconPath = themeToggle.querySelector('path');
            iconPath.setAttribute('d', systemTheme === 'dark' ? sunPath : moonPath);
        }
    }

// 主题切换按钮（三态切换：自动 → 暗色 → 亮色 → 自动）
    themeToggle.addEventListener('click', () => {
        const currentTheme = getCurrentTheme();

        if (currentTheme === 'auto') {
            applyTheme('dark');
            showToast('🌙 已切换为暗色模式');
        } else if (currentTheme === 'dark') {
            applyTheme('light');
            showToast('☀️ 已切换为亮色模式');
        } else {
            applyTheme('auto');
            const systemTheme = getSystemTheme();
            showToast(`🔄 已切换为自动模式（当前为${systemTheme === 'dark' ? '暗色' : '亮色'}）`);
        }
    });

// 监听系统颜色变化（当用户切换系统主题时自动响应）
    const systemThemeMedia = window.matchMedia('(prefers-color-scheme: dark)');
    systemThemeMedia.addEventListener('change', (e) => {
        const currentTheme = getCurrentTheme();
        // 仅在自动模式下响应系统变化
        if (currentTheme === 'auto') {
            const iconPath = themeToggle.querySelector('path');
            iconPath.setAttribute('d', e.matches ? sunPath : moonPath);
            showToast(`🔄 系统主题已切换为${e.matches ? '暗色' : '亮色'}模式`);
        }
    });

// 初始化
    initTheme();

    // ===== 滚动进度条 =====
    window.addEventListener('scroll', () =>
    {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = (scrollTop / docHeight) * 100;
        document.getElementById('scrollProgress').style.width = progress + '%';

        // 回到顶部按钮
        const backToTop = document.getElementById('backToTop');
        if (scrollTop > 500)
        {
            backToTop.classList.add('visible');
        } else
        {
            backToTop.classList.remove('visible');
        }
    });

    // ===== 回到顶部 =====
    document.getElementById('backToTop').addEventListener('click', () =>
    {
        window.scrollTo({top: 0, behavior: 'smooth'});
    });

    // ===== 移动端菜单 =====
    const menuToggle = document.getElementById('menuToggle');
    const navList = document.querySelector('.nav-list');

    menuToggle.addEventListener('click', function ()
    {
        this.classList.toggle('active');
        navList.classList.toggle('active');
    });

    // ===== 导航链接 =====
    document.querySelectorAll('.nav-link').forEach(link =>
    {
        link.addEventListener('click', function (e)
        {
            e.preventDefault();
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            if (window.innerWidth <= 768)
            {
                navList.classList.remove('active');
                menuToggle.classList.remove('active');
            }
        });
    });

    // ===== CTA 按钮 =====
    document.getElementById('ctaPrimary').addEventListener('click', () =>
    {
        showToast('🚀 开始你的阅读之旅！');
        document.querySelector('.posts').scrollIntoView({behavior: 'smooth'});
    });

    document.getElementById('ctaSecondary').addEventListener('click', () =>
    {
        showToast('💡 了解更多关于 Aqua Blog 的信息');
    });

    // ===== 订阅表单 =====
    document.getElementById('newsletterForm').addEventListener('submit', function (e)
    {
        e.preventDefault();
        const email = this.querySelector('input').value;
        if (email)
        {
            showToast('✨ 订阅成功！欢迎加入我们的社区。');
            this.querySelector('input').value = '';
        }
    });

    // ===== 气泡动画 =====
    function createBubbles()
    {
        const container = document.getElementById('bubbles');
        const count = 12;

        for (let i = 0; i < count; i++)
        {
            const bubble = document.createElement('div');
            bubble.className = 'bubble';
            const size = Math.random() * 40 + 20;
            bubble.style.width = size + 'px';
            bubble.style.height = size + 'px';
            bubble.style.left = Math.random() * 100 + '%';
            bubble.style.animationDuration = (Math.random() * 15 + 10) + 's';
            bubble.style.animationDelay = Math.random() * 15 + 's';
            container.appendChild(bubble);
        }
    }

    // ===== 初始化 =====
    function init()
    {
        renderPosts(postsData);
        animateNumbers();
        createBubbles();

        // Toast动画样式注入
        const style = document.createElement('style');
        style.textContent = `
            @keyframes toastIn {
                from { opacity: 0; transform: translateX(-50%) translateY(20px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
            @keyframes toastOut {
                from { opacity: 1; transform: translateX(-50%) translateY(0); }
                to { opacity: 0; transform: translateX(-50%) translateY(20px); }
            }
        `;
        document.head.appendChild(style);

        console.log('%c🌊 Aqua Blog %c已就绪 %c💧',
            'color: #00d4ff; font-size: 20px; font-weight: bold;',
            'color: #4caf50; font-size: 14px;',
            'color: #00bcd4; font-size: 16px;');
    }

    init();
});