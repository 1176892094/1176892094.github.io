// script.js - 云谷千羽的博客 · Astraia 工程笔记
document.addEventListener('DOMContentLoaded', function ()
{
    // 将“类拆解”元数据转换成标准文章
    function buildModulePost(meta, index)
    {
        const pad = n => String(n).padStart(2, '0');
        const base = new Date(Date.UTC(2026, 7, 1));
        const days = Math.floor(index * 0.7);
        const dateObj = new Date(base.getTime() + days * 86400000);
        const date = `${dateObj.getUTCFullYear()}-${pad(dateObj.getUTCMonth() + 1)}-${pad(dateObj.getUTCDate())}`;
        const blocks = [
            { t: 'p', x: meta.intro },
            { t: 'table', head: ['源码位置', '声明'], rows: [[meta.source, '`' + meta.decl + '`']] },
            { t: 'h2', x: `这个类负责什么` },
            { t: 'ul', items: meta.duties }
        ];
        if (meta.note)
        {
            blocks.push({ t: 'quote', x: meta.note });
        }
        blocks.push({ t: 'h2', x: '核心 API 速览' });
        blocks.push({ t: 'code', lang: 'csharp', text: meta.apis });
        blocks.push({ t: 'h2', x: '与谁协作' });
        blocks.push({ t: 'ul', items: meta.with });
        return {
            id: meta.id,
            category: meta.category,
            title: meta.title,
            excerpt: meta.excerpt,
            date,
            readTime: '5 分钟',
            blocks
        };
    }

    const moduleMeta = window.moduleMeta || [];
    const modulePosts = moduleMeta.map((meta, index) => buildModulePost(meta, index));
    // 已被逐类拆解覆盖的多模块综述，不再展示
    const mergedIds = ['runtime', 'algorithm', 'engine', 'network'];
    const posts = [...modulePosts, ...postsData.filter(post => !mergedIds.includes(post.id))];
    let filteredPosts = [...posts];
    let currentFilter = 'all';
    let currentIndex = 0;

    // ===== 文章阅读器 =====
    const reader = document.getElementById('reader');
    const readerContent = document.getElementById('readerContent');

    // 简单行内格式：`代码` 与 **加粗**
    function textToHtml(text)
    {
        return text
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    }

    function renderBlock(block)
    {
        const element = document.createElement('div');
        switch (block.t)
        {
            case 'p':
                element.className = 'reader-p';
                element.innerHTML = textToHtml(block.x);
                break;
            case 'h2':
                element.className = 'reader-h2';
                element.innerHTML = textToHtml(block.x);
                break;
            case 'h3':
                element.className = 'reader-h3';
                element.innerHTML = textToHtml(block.x);
                break;
            case 'quote':
                element.className = 'reader-quote';
                element.innerHTML = textToHtml(block.x);
                break;
            case 'ul':
                element.className = 'reader-list';
                const list = document.createElement('ul');
                block.items.forEach(item =>
                {
                    const li = document.createElement('li');
                    li.innerHTML = textToHtml(item);
                    list.appendChild(li);
                });
                element.appendChild(list);
                break;
            case 'code':
                element.className = 'reader-code';
                const pre = document.createElement('pre');
                const code = document.createElement('code');
                if (block.lang)
                {
                    code.className = 'lang-' + block.lang;
                }
                code.textContent = block.text;
                pre.appendChild(code);
                element.appendChild(pre);
                break;
            case 'table':
                element.className = 'reader-table';
                const wrap = document.createElement('div');
                wrap.className = 'table-wrap';
                const table = document.createElement('table');
                const thead = document.createElement('thead');
                const headRow = document.createElement('tr');
                block.head.forEach(cell =>
                {
                    const th = document.createElement('th');
                    th.textContent = cell;
                    headRow.appendChild(th);
                });
                thead.appendChild(headRow);
                table.appendChild(thead);
                const tbody = document.createElement('tbody');
                block.rows.forEach(row =>
                {
                    const tr = document.createElement('tr');
                    row.forEach(cell =>
                    {
                        const td = document.createElement('td');
                        td.innerHTML = textToHtml(cell);
                        tr.appendChild(td);
                    });
                    tbody.appendChild(tr);
                });
                table.appendChild(tbody);
                wrap.appendChild(table);
                element.appendChild(wrap);
                break;
            default:
                element.className = 'reader-p';
                element.textContent = block.x || '';
        }
        return element;
    }

    function openPost(post)
    {
        const index = posts.findIndex(item => item.id === post.id);
        currentIndex = index >= 0 ? index : 0;

        document.getElementById('readerCategory').textContent = post.category;
        document.getElementById('readerDate').textContent = post.date;
        document.getElementById('readerTime').textContent = post.readTime + ' 阅读';
        document.getElementById('readerTitle').textContent = post.title;
        document.getElementById('readerExcerpt').textContent = post.excerpt;

        readerContent.innerHTML = '';
        post.blocks.forEach(block => readerContent.appendChild(renderBlock(block)));

        updateReaderNav();
        reader.classList.add('open');
        reader.setAttribute('aria-hidden', 'false');
        document.body.classList.add('reader-open');
        reader.querySelector('.reader-panel').scrollTop = 0;
    }

    function closeReader()
    {
        reader.classList.remove('open');
        reader.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('reader-open');
    }

    function updateReaderNav()
    {
        const prev = document.getElementById('readerPrev');
        const next = document.getElementById('readerNext');
        prev.disabled = currentIndex <= 0;
        next.disabled = currentIndex >= posts.length - 1;
    }

    document.getElementById('readerClose').addEventListener('click', closeReader);
    document.getElementById('readerBack').addEventListener('click', closeReader);
    reader.querySelector('.reader-backdrop').addEventListener('click', closeReader);
    document.getElementById('readerPrev').addEventListener('click', () =>
    {
        if (currentIndex > 0) openPost(posts[currentIndex - 1]);
    });
    document.getElementById('readerNext').addEventListener('click', () =>
    {
        if (currentIndex < posts.length - 1) openPost(posts[currentIndex + 1]);
    });
    document.addEventListener('keydown', e =>
    {
        if (!reader.classList.contains('open')) return;
        if (e.key === 'Escape') closeReader();
        if (e.key === 'ArrowLeft' && currentIndex > 0) openPost(posts[currentIndex - 1]);
        if (e.key === 'ArrowRight' && currentIndex < posts.length - 1) openPost(posts[currentIndex + 1]);
    });

    // ===== 渲染文章卡片 =====
    function renderPosts(list)
    {
        const grid = document.getElementById('postsGrid');
        grid.innerHTML = '';

        list.forEach(post =>
        {
            const card = document.createElement('article');
            card.className = 'post-card';
            card.dataset.post = post.id;
            card.innerHTML = `
                <span class="card-category">${post.category}</span>
                <h3 class="card-title">${post.title}</h3>
                <p class="card-excerpt">${post.excerpt}</p>
                <div class="card-footer">
                    <span class="card-date">${post.date}</span>
                    <span class="card-read">阅读全文 →</span>
                </div>
            `;
            card.addEventListener('click', () => openPost(post));
            grid.appendChild(card);
        });

        const note = document.getElementById('postsNote');
        note.textContent = list.length === posts.length
            ? `共 ${posts.length} 篇,包含源码类逐一拆解`
            : `“${currentFilter}”分类下共 ${list.length} 篇`;
    }

    // ===== 分类筛选 =====
    const filterTabs = document.querySelectorAll('.filter-tab');
    filterTabs.forEach(tab =>
    {
        tab.addEventListener('click', () =>
        {
            setFilter(tab.dataset.filter);
        });
    });

    function setFilter(filter)
    {
        currentFilter = filter;
        filterTabs.forEach(tab =>
        {
            tab.classList.toggle('active', tab.dataset.filter === filter);
        });

        filteredPosts = filter === 'all'
            ? [...posts]
            : posts.filter(post => post.category === filter);
        renderPosts(filteredPosts);
    }

    // 页脚分类与项目卡片里的“相关文章”
    document.querySelectorAll('[data-category]').forEach(link =>
    {
        link.addEventListener('click', e =>
        {
            const target = link.dataset.category;
            if (!target) return;
            e.preventDefault();
            setFilter(target);
            document.getElementById('posts').scrollIntoView({behavior: 'smooth'});
        });
    });

    // ===== 精选卡片 =====
    document.querySelectorAll('.featured-card').forEach(card =>
    {
        card.addEventListener('click', () =>
        {
            const post = posts.find(item => item.id === card.dataset.post);
            if (post) openPost(post);
        });
    });

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

    // ===== 系统颜色主题切换 =====
    const themeToggle = document.getElementById('themeToggle');
    const sunPath = 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z';
    const moonPath = 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z';
    const autoIcon = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="9"/>
            <text x="12" y="16" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor" stroke="none">A</text>
        </svg>
    `;

    function getSystemTheme()
    {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function getCurrentTheme()
    {
        const savedTheme = localStorage.getItem('theme');
        return savedTheme || 'auto';
    }

    function setThemeIcon(theme)
    {
        if (theme === 'auto')
        {
            themeToggle.innerHTML = autoIcon;
            themeToggle.setAttribute('aria-label', '主题模式：自动（跟随系统）');
            themeToggle.title = '主题模式：自动（跟随系统）';
            return;
        }

        const path = theme === 'dark' ? moonPath : sunPath;
        themeToggle.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="${path}"/>
            </svg>
        `;
        themeToggle.setAttribute('aria-label', theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式');
        themeToggle.title = theme === 'dark' ? '主题模式：暗色' : '主题模式：亮色';
    }

    function applyTheme(theme)
    {
        const html = document.documentElement;

        if (theme === 'auto')
        {
            html.removeAttribute('data-theme');
            localStorage.removeItem('theme');
        }
        else
        {
            html.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
        }

        setThemeIcon(theme);
    }

    function initTheme()
    {
        const currentTheme = getCurrentTheme();
        applyTheme(currentTheme);
    }

    themeToggle.addEventListener('click', () =>
    {
        const currentTheme = getCurrentTheme();
        if (currentTheme === 'auto')
        {
            applyTheme('dark');
            showToast('🌙 已切换为暗色模式');
        }
        else if (currentTheme === 'dark')
        {
            applyTheme('light');
            showToast('☀️ 已切换为亮色模式');
        }
        else
        {
            applyTheme('auto');
            showToast(`🔄 已切换为自动模式（当前为${getSystemTheme() === 'dark' ? '暗色' : '亮色'}）`);
        }
    });

    const systemThemeMedia = window.matchMedia('(prefers-color-scheme: dark)');
    systemThemeMedia.addEventListener('change', e =>
    {
        if (getCurrentTheme() === 'auto')
        {
            setThemeIcon('auto');
            showToast(`🔄 系统主题已切换为${e.matches ? '暗色' : '亮色'}模式`);
        }
    });

    initTheme();

    // ===== 滚动进度条与回到顶部 =====
    const backToTop = document.getElementById('backToTop');
    window.addEventListener('scroll', () =>
    {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = (scrollTop / docHeight) * 100;
        document.getElementById('scrollProgress').style.width = progress + '%';

        backToTop.classList.toggle('visible', scrollTop > 500);
        updateActiveNav();
    }, {passive: true});

    backToTop.addEventListener('click', () =>
    {
        window.scrollTo({top: 0, behavior: 'smooth'});
    });

    // ===== 导航 =====
    const menuToggle = document.getElementById('menuToggle');
    const navList = document.querySelector('.nav-list');

    menuToggle.addEventListener('click', function ()
    {
        this.classList.toggle('active');
        navList.classList.toggle('active');
    });

    function closeMobileNav()
    {
        navList.classList.remove('active');
        menuToggle.classList.remove('active');
    }

    document.querySelectorAll('.nav-link').forEach(link =>
    {
        link.addEventListener('click', e =>
        {
            const anchor = link.dataset.anchor;
            if (anchor)
            {
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            }
            if (window.innerWidth <= 768)
            {
                closeMobileNav();
            }
        });
    });

    function updateActiveNav()
    {
        const sections = ['home', 'posts', 'projects', 'about'];
        const scrollPos = window.scrollY + 140;
        let active = 'home';
        sections.forEach(id =>
        {
            const el = document.getElementById(id);
            if (el && el.offsetTop <= scrollPos)
            {
                active = id;
            }
        });
        if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 10)
        {
            active = 'about';
        }
        document.querySelectorAll('.nav-link').forEach(link =>
        {
            link.classList.toggle('active', link.dataset.anchor === active);
        });
    }

    // ===== CTA 按钮 =====
    document.getElementById('ctaPrimary').addEventListener('click', () =>
    {
        document.getElementById('posts').scrollIntoView({behavior: 'smooth'});
    });

    document.getElementById('ctaSecondary').addEventListener('click', () =>
    {
        document.getElementById('projects').scrollIntoView({behavior: 'smooth'});
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
        const articleStat = document.querySelector('.stat-number[data-count="8"]');
        if (articleStat)
        {
            articleStat.dataset.count = String(posts.length);
        }
        renderPosts(posts);
        animateNumbers();
        createBubbles();
        updateActiveNav();

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
    }

    init();
});
