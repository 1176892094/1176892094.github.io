// posts-extra.js - 架构设计与工具链专题文章
window.extraPosts = [
    {
        id: 'arch-pure-csharp',
        category: '架构设计',
        title: '把核心做成纯 C#：边界、复用与验证',
        excerpt: '不是“喜欢类库”，而是让服务器、客户端与工具链能复用同一份代码的三个现实理由。',
        date: '2026-09-05',
        readTime: '8 分钟',
        blocks: [
            { t: 'p', x: 'Astraia 在立项时面临一个选择：把网络与算法代码直接写在 Unity 工程里，还是单独抽成纯 C# 类库。最后选择了后者，核心原因不是架构洁癖，而是它改变了整个开发方式。' },
            { t: 'h2', x: '边界：什么能进核心，什么不能' },
            { t: 'ul', items: ['核心只处理“与引擎无关”的逻辑：事件、池、序列化、寻路、KCP、确定性类型', 'Unity 侧只处理引擎能力：MonoBehaviour、资源、UI、PlayerLoop、物理', '协议与网络包在核心定义，Unity 只负责翻译成对象操作'] },
            { t: 'code', lang: 'text', text: `Astraia-Net / Astraia.dll（无 UnityEngine 引用）
    ├── 逻辑类型：Fixation · Position · StateMachine
    ├── 算法：AStar · FlowField · 行为树
    ├── 网络：KCP · MemoryWriter · 房间协议
    └── 使用方
         ├── Astraia(Unity)     => Plugins/Astraia.dll
         └── Astraia.Lobby(.NET)=> 直接引用同一 DLL` },
            { t: 'h2', x: '三个实际收益' },
            { t: 'ul', items: ['**服务器零成本复用**：Astraia.Lobby 不是重新实现协议，而是加载核心库后直接读写同一套消息。', '**可以被非 Unity 工具消费**：表格生成、CI 脚本、压测程序不必进入 Unity 编辑器。', '**类型就是文档**：哪些类型跨端、哪些只是编辑器便利，从命名空间与文件位置一眼可辨。'] },
            { t: 'quote', x: '真正把代码分层的不是文件夹结构，而是“它到底知不知道 UnityEngine 存在”。' },
            { t: 'h2', x: '代价也要说清楚' },
            { t: 'p', x: '代价是每次核心改动都要先构建 DLL 再让 Unity 重新导入，编辑器内迭代不如直接在脚本里改方便。因此 Astraia 把编译产物复制进 Plugins，并且让核心的改动尽量发生在早期设计阶段，避免“先写进 Unity 再抽出去”的重构。' }
        ]
    },
    {
        id: 'arch-determinism',
        category: '架构设计',
        title: '确定性：为什么网络游戏不能直接用 float',
        excerpt: '客户端各自算、服务器权威算，两端却要对同一个坐标给出相同答案，这就是确定性要解决的问题。',
        date: '2026-09-04',
        readTime: '7 分钟',
        blocks: [
            { t: 'p', x: '在本地游戏里，float 的微小差异几乎不会被察觉；一旦逻辑进入网络，同一个输入在不同机器上可能产生不同结果。Astraia 的选择是把模拟层换成确定性的定点数，而不是在同步层反复“补救”。' },
            { t: 'h2', x: '问题出在浮点本身' },
            { t: 'p', x: '加法结果依赖舍入顺序、不同编译器/CPU 的中间精度也可能不同。当这些误差进入状态机分支与碰撞判定后，一次跳跃是否触发、一次冲刺是否卡墙都会分叉。' },
            { t: 'h2', x: '定点数把问题消掉' },
            { t: 'code', lang: 'csharp', text: `// Fixation：int 上保存数值，低 12 位为小数
private const int BIT = 12;
private const int FIX = 1 << BIT;

public static Fixation operator *(Fixation a, Fixation b)
    => new Fixation((int)(((long)a.value * b.value) >> BIT));` },
            { t: 'p', x: '整数加减、位移、比较在不同平台上结果一致，因此 Fixation、Position 以及基于它们的移动逻辑天然可复现。示例中角色速度也写成“每帧多少格”，例如 `5F / 60`，进一步避免 Time.deltaTime 造成的帧率依赖。' },
            { t: 'h2', x: '模拟节拍与网络节拍分开' },
            { t: 'ul', items: ['本地以固定步长模拟，保证输入手感稳定', '网络以 30Hz 节拍收集与广播坐标', '只有“权威结果”跨网络，插值只是表现层'] },
            { t: 'quote', x: '确定性不是为了炫耀精度，而是为了让服务器能成为裁判，而不是事后补丁。' }
        ]
    },
    {
        id: 'arch-timing',
        category: '架构设计',
        title: '框架时序：事件、对象池与 PlayerLoop 如何串成一条主线',
        excerpt: '一个框架好不好用，常取决于“谁先跑、谁后跑”这件事有没有被统一管住。',
        date: '2026-09-03',
        readTime: '7 分钟',
        blocks: [
            { t: 'p', x: 'MonoBehaviour 的 Awake/Update 顺序在没有约束时非常不可控。Astraia 的做法不是取消 MonoBehaviour，而是把“会被很多人依赖”的时序收进三条明确的主线：事件、池、PlayerLoop。' },
            { t: 'h2', x: '生命周期统一为可继承模板' },
            { t: 'p', x: '所有业务组件继承 Export，Awake/OnEnable/OnDisable/OnDestroy 变成 virtual 方法；Entity 进一步在 Awake 正序执行 IDequeue、OnDestroy 倒序执行 IEnqueue，让对象的“借出与归还”有了确定顺序。' },
            { t: 'h2', x: '时间由管理者驱动' },
            { t: 'code', lang: 'csharp', text: `// GlobalManager 桥接 Unity 时间
private void Update()      => TimeManager.RenderUpdate(Time.time);
private void FixedUpdate() => TimeManager.PhysicUpdate(Time.fixedTime);

// NetworkSystem 直接注入 PlayerLoop
AddLoopSystem(EarlyUpdate, ref playerLoop, typeof(EarlyUpdate));
AddLoopSystem(AfterUpdate, ref playerLoop, typeof(PreLateUpdate));` },
            { t: 'p', x: 'Tween、Watch 等注册进 TimeManager 的 Render/Physic/Accept 三段；网络收发挂进 PlayerLoop 的 Early/After 阶段。任何模块都不需要依赖“另一个组件恰好先 Update”。' },
            { t: 'h2', x: '事件只描述发生了什么' },
            { t: 'p', x: 'GameManager 不直接调用每个玩家，而是派发 OnPlayerUpdate；谁监听、什么时候监听由业务自己决定。框架只保证事件按固定时间点发出。' },
            { t: 'quote', x: '时序可控之后，组件之间的“偶合”才敢换成“约定”。' }
        ]
    },
    {
        id: 'arch-authority',
        category: '架构设计',
        title: '联机权威模型：谁来决定这个角色该怎么动',
        excerpt: 'Host、Server、Client、Owner 这些词背后是一套关于“谁说了算”的约定。',
        date: '2026-09-02',
        readTime: '9 分钟',
        blocks: [
            { t: 'p', x: 'Astraia 的对象同步并不强制“所有数值都服务器权威”，而是让每个 NetworkModule 声明自己是服务器模式还是客户端模式，再由实体上的 Owner/Server/Client 状态决定谁能提交、谁能接收。' },
            { t: 'h2', x: '四态身份' },
            { t: 'code', lang: 'csharp', text: `public bool isHost => isServer && isClient;
public bool isOwner => (state & State.Owner) != 0;
public bool isServer => (state & State.Server) != 0 && NetworkManager.isServer;
public bool isClient => (state & State.Client) != 0 && NetworkManager.isClient;` },
            { t: 'ul', items: ['**Owner**：本端持有该对象操作权，输入与“客户端模式”数据由它提交', '**Server**：校验、广播与“服务器模式”数据由它决定', '**Host**：既是服务器又是客户端，通常保留完全本地输入手感', '**Observer**：只看到结果，负责渲染远端状态'] },
            { t: 'h2', x: '模块模式与消息通道' },
            { t: 'p', x: 'NetworkModule 的 SyncMode 决定变化由谁产生；Pass.KCP / Pass.UDP / Pass.ANY 决定消息走哪条通道。RPC 只描述“调用方向”，真正限制调用边界的仍是 isOwner/isServer。' },
            { t: 'h2', x: '示例里的取舍' },
            { t: 'p', x: 'AwakeScene 中 owner 输入后立即更新本地 Transform，同时把坐标上报服务器；服务器按 30Hz 节拍集合后广播，非 owner 只做插值。手感由本地即时响应保证，一致性由服务器最终结果保证。' },
            { t: 'quote', x: '权威模型不是为了“谁都能作弊”，而是让每一行逻辑都知道自己在为哪个身份工作。' }
        ]
    },
    {
        id: 'arch-editor-boundary',
        category: '架构设计',
        title: '框架的编辑器边界：工具链为什么值得和框架一起交付',
        excerpt: '代码生成、表格导入、Bundle 构建这些能力并不属于运行时，却决定了框架好不好用。',
        date: '2026-09-01',
        readTime: '6 分钟',
        blocks: [
            { t: 'p', x: '一个框架如果只发布运行时，使用者仍要自己搭 Excel 导入、AssetBundle 分组与 RPC 模板代码。Astraia 把 Editor 工具链放进同一个包，让“框架约定”从编辑器一直延伸到运行时。' },
            { t: 'h2', x: '编辑器能力是框架约定的一部分' },
            { t: 'ul', items: ['表格导入按约定生成代码与数据表，配置结构不用靠文档口口相传', 'AssetPostprocessor 自动给 Bundle 目录分配 assetBundleName，目录即规则', 'IL 织入在编译期改写 SyncVar/RPC，业务不用手写网络样板', 'Project/Hierarchy/Inspector 增强让日常操作更贴近框架结构'] },
            { t: 'h2', x: '三条边界' },
            { t: 'code', lang: 'text', text: `Astraia.Run      运行时能力：框架代码只能在游戏运行时使用
Astraia.Net      网络运行时：同步、RPC、对象生命周期
Astraia.Editor   编辑器与 CodeGen：导入、构建、织入（不进玩家包）` },
            { t: 'p', x: 'Editor 程序集通过 asmdef 与编译指令隔离，玩家构建时不会携带。CodeGen 织入发生在编译期，产物是普通 IL，运行时无需再持有 Mono.Cecil。' },
            { t: 'quote', x: '工具链不是框架的赠品，而是框架约定的编译器。' }
        ]
    },
    {
        id: 'tool-excel',
        category: '工具链',
        title: 'Excel 表格导入：一份表如何变成代码、数据与运行时查询',
        excerpt: '从 xlsx 解包、读 XML 到生成枚举/结构体/DataTable，整条流水线都在编辑器里自动完成。',
        date: '2026-09-05',
        readTime: '9 分钟',
        blocks: [
            { t: 'p', x: 'Astraia 的表格导入入口是 `Tools/Astraia/表格数据导入`。选择 Excel 文件夹后，FormManager 会扫描所有 xlsx，把每张表解析成二维数据，再决定这次改动是否需要生成脚本。' },
            { t: 'h2', x: 'xlsx 其实就是 zip' },
            { t: 'code', lang: 'csharp', text: `// Form.cs：直接读压缩包内的 XML
using var archive = ZipFile.OpenRead(fileCopy);
var sheetNames = ReadSheetNames(archive);        // workbook.xml
var sharedStrings = ReadSharedStrings(archive);  // sharedStrings.xml

for (var i = 0; i < sheetNames.Count; i++)
{
    using var stream = archive.GetEntry($"xl/worksheets/sheet{i + 1}.xml").Open();
    Form.Add(ReadSheet(stream, sheetNames[i], sharedStrings));
}` },
            { t: 'h2', x: '表头的三行约定' },
            { t: 'ul', items: ['第 1 行 NAME_LINE：字段名', '第 2 行 TYPE_LINE：类型（int/string/enum/数组/结构体）', '第 3 行 DATA_LINE 起：具体数据行'] },
            { t: 'p', x: '类型识别区分基础类型、数组、`:enum` 与 `{}` 结构体，不认识的类型会被报错而不是静默转成 string。' },
            { t: 'h2', x: '脚本与资源分别生成' },
            { t: 'p', x: 'FormParseScripts 生成枚举、结构体、DataTable 脚本与程序集定义；FormParseAssets 把同一份表格写成运行时加载的 ScriptableObject。两步完成后 DataManager 重新加载，游戏里就能用 `Get<T>(key)` 查询。' },
            { t: 'quote', x: '配置的最终形态不是 Excel，也不是 ScriptableObject，而是“编辑器能验证、运行时能查询、两端能复用”的代码。' }
        ]
    },
    {
        id: 'tool-asset-bundle',
        category: '工具链',
        title: 'AssetBundle 工具链：目录结构决定资源分组',
        excerpt: '不用手工维护 bundle 名，把资源放进约定目录，导入器自动完成分组与清理。',
        date: '2026-09-04',
        readTime: '7 分钟',
        blocks: [
            { t: 'p', x: 'Astraia 的 Bundle 约定从目录开始：`Assets/AssetBundles/{平台}/{目录}/...`。EditorImporter 监听资源导入，自动给路径推导 `assetBundleName`，把“资源属于哪个包”变成目录事实。' },
            { t: 'h2', x: '导入即分组' },
            { t: 'code', lang: 'csharp', text: `// EditorImporter : AssetPostprocessor
private static void OnPostprocessAllAssets(...)
{
    foreach (var path in importedAssets) ImportAsset(path);
    // 移出 Bundle 目录时清除 assetBundleName
    AssetDatabase.RemoveUnusedAssetBundleNames();
}` },
            { t: 'p', x: 'ignoreAssets 列表可以排除不该进包的对象；移动或删除后，导入器会清理失效的 Bundle 名，避免残留引用。' },
            { t: 'h2', x: '版本由 manifest 决定' },
            { t: 'ul', items: ['构建时产出各平台 Bundle 与 AssetBundle.json 版本信息', '运行时 BatchManager 比较 StreamingAssets、PersistentData 与远端三份 manifest', 'UseSimulate 开启时跳过真实 Bundle，直接用工程资源迭代'] },
            { t: 'quote', x: 'Bundle 名一旦由目录自动生成，项目就少了一类“资源更新了但忘记改包名”的问题。' }
        ]
    },
    {
        id: 'tool-editor-flow',
        category: '工具链',
        title: 'Editor 工作流：Astraia 如何增强 Project、Hierarchy、Inspector 与 Toolbar',
        excerpt: '编辑器增强不是装饰，而是让“按框架组织工程”这件事变得更顺手。',
        date: '2026-09-03',
        readTime: '6 分钟',
        blocks: [
            { t: 'p', x: 'EditorManager 在编辑器加载时把 Folder、Hierarchy、Inspector、Toolbar 的绘制与快捷键挂进 Unity 的 EditorApplication 事件。所有功能都集中在 Astraia.Editor 程序集，不影响运行时。' },
            { t: 'h2', x: 'Project 面板：目录即图标' },
            { t: 'p', x: 'Folder 会按 Assets 下的约定目录(Scenes、Prefabs、Scripts、DataTable 等)绘制统一图标，并缓存目录内容；展开/收起与组合操作通过 FolderShortcut 挂在项目窗口快捷键上。' },
            { t: 'h2', x: 'Hierarchy：把组件状态画在行上' },
            { t: 'p', x: 'Hierarchy 在每个 GameObject 行右侧绘制与其网络/实体状态相关的控件，同时提供快速展开/收起场景树的快捷键，减少在大场景里逐层点开的操作。' },
            { t: 'h2', x: 'Inspector 与 Toolbar' },
            { t: 'p', x: 'Inspector 监听 Selection 变化并初始化自定义布局；Toolbar 通过 MainToolbarElement 增加设置、构建、框架窗口与 TimeScale 入口。EditorSetting 则把 Excel 导入、Bundle 构建、设置窗口收进同一个菜单。' },
            { t: 'quote', x: 'Editor 工具的目标是让“正确做法”成为最省力的做法。' }
        ]
    },
    {
        id: 'tool-weaver-stages',
        category: '工具链',
        title: 'IL 织入器的内部步骤：收集、改写、生成',
        excerpt: '从 ILPostProcessor 入口到 SyncVar 字段改写，看看一次编译期间网络代码是怎么被拼出来的。',
        date: '2026-09-02',
        readTime: '10 分钟',
        blocks: [
            { t: 'p', x: '上一篇《IL 织入:让 [ServerRpc] 与 [SyncVar] 真正跑起来》讲的是“为什么”，这篇补上“顺序”：NetworkProcessor 只负责接入编译管线，真正的改造由 Weaver 分派给多个 Generator。' },
            { t: 'h2', x: '入口与分派' },
            { t: 'code', lang: 'csharp', text: `NetworkProcessor : ILPostProcessor   // Unity 编译管线入口
    └─ Weaver.Weave(assembly, ...)
         ├─ NetworkMemberGen  属性/消息的读写委托注册
         ├─ NetworkModuleGen  逐个处理 NetworkModule 子类
         ├─ NetworkSyncVarGen 改写 SyncVar 字段访问
         ├─ NetworkMethodGen  生成 ServerRpc/ClientRpc/TargetRpc 包装
         └─ EntityGenerator   Export 派生类自动绑定` },
            { t: 'h2', x: '三步执行' },
            { t: 'ul', items: ['**收集**：找出所有继承 NetworkModule / Export 的类型，以及带 RPC 特性的方法', '**分析**：为每个 SyncVar 建立字段索引，确认支持的类型与参数', '**生成**：补出 SerializeSyncVars、DeserializeSyncVars、RPC 发送/接收包装与消息注册'] },
            { t: 'h2', x: '访问改写是最后的关键一步' },
            { t: 'p', x: '字段被声明为 `[SyncVar]` 后，普通代码仍在直接读写该字段。NetworkSyncVarGen 遍历方法 IL，把字段访问替换成带脏位标记的访问器，这样“写字段”和“告诉同步层我改了”永远不会脱节。' },
            { t: 'quote', x: '代码生成最难的部分不是生成新方法，而是让已有代码无感地走上新路径。' }
        ]
    }
];
