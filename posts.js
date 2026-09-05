// posts.js - 文章数据（内容基于 Astraia 与 Astraia-Net 源码整理）

const postsData = [
    {
        id: 'arch',
        category: '架构设计',
        title: 'Astraia 是怎么长出来的：一个 Unity 框架的两层架构',
        excerpt: '同一个核心库，既被 Unity 客户端以 DLL 引用，又被 .NET 大厅服务器直接使用。这篇文章梳理 Astraia 与 Astraia-Net 的分工。',
        date: '2026-08-16',
        readTime: '9 分钟',
        blocks: [
            { t: 'p', x: 'Astraia 一开始并不是“Unity 插件”，而是一个希望被客户端、服务器、工具链共同复用的纯 C# 核心。随着游戏逻辑逐渐复杂，才在核心之上长出了 Unity 侧的运行时封装、网络层与编辑器工具链。' },
            { t: 'h2', x: '两个仓库，一套核心' },
            { t: 'p', x: 'Astraia-Net 是纯 C# 的 Astraia 核心运行时与大厅服务器；Astraia 是 Unity 客户端框架。核心代码不依赖 Unity，所以构建出的 `Astraia.dll` 会自动复制到 Unity 工程的 `Plugins` 目录，供框架和示例共同使用。' },
            { t: 'table', head: ['仓库', '形态', '主要内容'], rows: [['Astraia', 'Unity 工程', 'Assets/Astraia 下的运行时、网络层与 Editor 工具链'], ['Astraia-Net', 'netstandard2.1 类库 + net8.0 服务器', '事件、池、确定性类型、寻路、KCP、大厅服务器']] },
            { t: 'h2', x: '依赖方向是单向的' },
            { t: 'code', lang: 'text', text: `Astraia-Net（纯 C# 核心）
└─ Astraia.dll ──> Unity Plugins
     ├─ Astraia.Run     引擎库：资源 / UI / 数据 / 池 / 音频
     ├─ Astraia.Net     网络库：对象同步 / RPC / 场景
     └─ Editor + CodeGen 表格导入 / IL 织入
          └── 示例游戏与游戏客户端` },
            { t: 'p', x: 'Unity 侧的 `Astraia.Run`、`Astraia.Net` 依赖核心 DLL；核心 DLL 不反向引用 UnityEngine。大厅服务器也复用同一份 DLL，因此网络消息、序列化、确定性类型在两端完全一致。' },
            { t: 'h2', x: '核心库里有什么' },
            { t: 'ul', items: ['基础运行时：EventManager、HeapManager、TimeManager、Async/Tween', '通用工具：二进制序列化、压缩、Xor 加密、读写扩展', '确定性类型：Fixation 定点数、Position、Properties', '算法库：A*、FlowField、行为树、空间哈希', '网络层：KCP 传输、Transport、NetworkAuthority', '大厅协议：房间、成员与消息帧定义'] },
            { t: 'h2', x: 'Unity 侧长出什么' },
            { t: 'ul', items: ['引擎库：AssetBundle 资源、场景、UI、数据表、对象池、Json 存档', '网络层：NetworkEntity / NetworkModule、SyncVar、ServerRpc / ClientRpc / TargetRpc、观察者同步', '工具链：Excel 表格导入并生成脚本、基于 Mono.Cecil 的 IL 织入', '示例：Assets/Example 下可直接运行的 AwakeScene'] },
            { t: 'quote', x: '“核心代码不依赖 Unity，客户端、服务器与游戏热更逻辑可以复用同一套类型与协议。”——这是两个仓库最初的分工原则。' },
            { t: 'h2', x: '为什么值得记一笔' },
            { t: 'p', x: '把“游戏框架”拆成“纯 C# 核心 + Unity 适配层”，会让很多决策变得更清楚：哪些类型必须跨端，哪些只是 Editor/引擎便利，哪些会污染核心。后续几篇文章会顺着这条线，逐个拆开事件池、代码生成、对象同步与示例场景。' }
        ]
    },
    {
        id: 'runtime',
        category: '核心运行时',
        title: 'Astraia-Net 的运行时基座：事件、对象池与时间管理器',
        excerpt: '一个长线项目跑得稳不稳，往往取决于基础设施。看看 EventManager、HeapManager 与 TimeManager 如何在核心库里各司其职。',
        date: '2026-08-17',
        readTime: '8 分钟',
        blocks: [
            { t: 'p', x: '在纯 C# 核心层，Astraia-Net 先解决三件最基础的事：解耦的事件分发、可复用的对象池、统一的时间推进。它们都不依赖 Unity，因此单元测试与服务器端可以直接使用。' },
            { t: 'h2', x: 'EventManager：结构体事件 + 类型池' },
            { t: 'p', x: '事件被定义成 struct，并实现 `IEvent` 标记。每种事件类型维护一个自己的监听池，注册、移除与派发都是泛型方法：' },
            { t: 'code', lang: 'csharp', text: `public static class EventManager
{
    public static void Listen<T>(IEvent<T> data) where T : struct, IEvent;
    public static void Remove<T>(IEvent<T> data) where T : struct, IEvent;
    public static void Invoke<T>(T data) where T : struct, IEvent;
}` },
            { t: 'p', x: '游戏中事件通常就是“这个 Tick 里发生了什么”。例如 GameManager 每帧先派发 `OnPlatformUpdate`，再派发 `OnPlayerUpdate`，Player 只要实现 `IEvent<OnPlayerUpdate>` 就会收到更新，无需在场景里手动连线。' },
            { t: 'h2', x: 'HeapManager：一切短生命周期对象都走池' },
            { t: 'p', x: '协议消息、同步数据、Tween 等高频对象不直接 new，而是通过 `HeapManager.Dequeue<T>()` 取出、用完后 `Enqueue` 归还。内部按真实类型维护独立队列，可以避免不同类型挤在同一池子里。' },
            { t: 'p', x: 'MemoryWriter / MemoryReader 也遵循同一套约定：`MemoryWriter.Pop()` 取一段可写缓冲，using 结束自动 `Push` 归还，因此示例代码里常见这种写法：' },
            { t: 'code', lang: 'csharp', text: `using var writer = MemoryWriter.Pop();
writer.WriteByte((byte)Lobby.Info.创建房间成功);
writer.WriteInt32(room.Index);
writer.WriteString(room.Id);
connection.SendToClient(clientId, writer);` },
            { t: 'h2', x: 'TimeManager：三段固定槽位推进时间' },
            { t: 'p', x: 'TimeManager 把可更新对象注册进三段长度为 1024 的固定数组：Render 渲染、Physic 物理、Accept 网络接收。每帧只推进当前段的元素，移除时与末尾元素交换，避免数组搬移：' },
            { t: 'code', lang: 'csharp', text: `private const int LENGTH = 1024;
private const int RENDER = 0;
private const int PHYSIC = 1;
private const int ACCEPT = 2;

private static readonly IAsync[] items = new IAsync[LENGTH * 3];

public static void RenderUpdate(Fixation elapseTime) { ... }
public static void PhysicUpdate(Fixation elapseTime) { ... }
public static void AcceptUpdate(Fixation elapseTime) { ... }` },
            { t: 'p', x: 'Async 与 Tween 都注册到 TimeManager，因而会得到统一的 elapseTime；`Watch` 则用于测量一段逻辑的真实耗时。固定槽位 + 交换删除，让运行时在稳定负载下不会反复扩容。' },
            { t: 'h2', x: '小结' },
            { t: 'p', x: '事件、池、时间这三块其实构成了一种“约定”：能复用的不重建，能延迟的不立刻执行，能分段的不过度耦合。后续读 KCP 与大厅服务器时，会看到这些约定被一路沿用到网络层。' }
        ]
    },
    {
        id: 'algorithm',
        category: '核心运行时',
        title: '确定性工具箱：定点数、A*/FlowField、行为树与空间哈希',
        excerpt: '跨端复用最大的敌人是浮点不一致。Astraia-Net 用定点数承载坐标，并围绕它整理了寻路、行为树与空间索引。',
        date: '2026-08-18',
        readTime: '10 分钟',
        blocks: [
            { t: 'p', x: '只要服务器参与模拟，客户端与服务器就必须在同样输入下得到同样结果。Astraia-Net 的选择是：核心坐标不用 float，而用定点数 `Fixation`，并让所有游戏逻辑类型都建立在它之上。' },
            { t: 'h2', x: 'Fixation：int 上的 12 位小数' },
            { t: 'code', lang: 'csharp', text: `[Serializable]
public readonly record struct Fixation(int value)
{
    private const int BIT = 12;
    private const int FIX = 1 << BIT;

    public static explicit operator Fixation(float value)
        => new Fixation((int)(value * FIX));

    public static Fixation operator *(Fixation a, Fixation b)
        => new Fixation((int)(((long)a.value * b.value) >> BIT));
}` },
            { t: 'p', x: '内部只用一个 int，低 12 位表示小数部分，因此加减乘除、比较、取整都是整数/位移运算，不依赖 CPU 浮点单元，也就天然可复现。`Position` 则由两个 Fixation 组成，提供向量加减、点乘叉乘、Distance、Normalize 等常用方法。' },
            { t: 'h2', x: 'A* 与 FlowField' },
            { t: 'p', x: '寻路基类 `Pathfinding` 接收 width、height 与 costs 网格，障碍物把 cost 设为 INF。A* 用 gScore/fScore/parent/closed 数组缓存上次结果，只清理由 `indices` 记录过的格子，而不是每次整张表重建：' },
            { t: 'code', lang: 'csharp', text: `var path = new AStar(width, height, costs);
IList<Position> route = path.Rebuild(startX, startY, endX, endY);` },
            { t: 'p', x: 'FlowField 适合大量单位朝向同一批目标：先对目标集合做 integration pass，再根据梯度生成流场，单位每帧只查一个方向向量。两者共用二叉堆 PriorityQueue，八方向移动代价是 10 / 14。' },
            { t: 'h2', x: '行为树：async 的 Tick 模型' },
            { t: 'p', x: '行为树节点没有写成一串硬编码 if/else。每个节点 `OnTick` 返回 `Task<State>`，因此 Sequence、Selector、Parallel 可以自然地等待子节点返回 Running：' },
            { t: 'code', lang: 'csharp', text: `public readonly struct Sequence(int index, INode[] nodes) : INode
{
    public async Task<State> OnTick(int[] indices, Blackboard<int> root)
    {
        var current = indices[index];
        while (current < nodes.Length)
        {
            var state = await nodes[current].OnTick(indices, root);
            if (state == State.Running) return State.Running;
            if (state == State.Failure) { indices[index] = 0; return State.Failure; }
            current++;
            indices[index] = current;
        }
        indices[index] = 0;
        return State.Success;
    }
}` },
            { t: 'p', x: '组合节点之外，还提供 Randomer、Repeater、Inverter、Success/Failure 等修饰节点；`Blackboard<T>` 按值类型分组存放共享数据，供整棵树读写。' },
            { t: 'h2', x: '空间哈希：分桶坐标' },
            { t: 'p', x: 'SpatialHash 把 Position 压成 `(x << 16) | (y & 0xFFFF)` 的格子键，对象移动换桶时只做一次移除/插入。适合邻居查询、AOI 这类“只关心局部”的逻辑。' },
            { t: 'h2', x: '小结' },
            { t: 'p', x: '定点数、寻路、行为树与空间哈希的共同点是：输入确定，输出就确定。它们为后续“示例里 60 FPS 逻辑如何在 30 Hz 网络节拍下保持一致”打下了基础。' }
        ]
    },
    {
        id: 'engine',
        category: '框架基建',
        title: 'Unity 侧的工程化：从资源热更、UI 面板到表格生成',
        excerpt: 'Astraia.Run 把日常游戏开发里最重复的部分收敛成约定：资源按版本走 Bundle，UI 面板自动绑定，Excel 表格直接生成数据类。',
        date: '2026-08-20',
        readTime: '9 分钟',
        blocks: [
            { t: 'p', x: 'Unity 框架侧的任务不是“多写几个 Manager”，而是把资源加载、界面管理、数据配置这些横切逻辑做成统一约定，让游戏代码只关心玩法。' },
            { t: 'h2', x: 'AssetManager：一份清单，三种来源' },
            { t: 'p', x: '启动时 AssetManager 会比较 StreamingAssets、PersistentData 与远端三份 AssetBundle manifest，选择版本最高且完整的一份。编辑器里 `UseSimulate` 开启时直接本地加载资源，跳过打包流程；关闭后走真实 Bundle，远端地址来自 GlobalSetting。' },
            { t: 'p', x: '场景、预制体、音频都通过约定路径加载，例如 `Scenes/{0}`、`Prefabs/{0}`、`Audios/{0}`。BatchManager 则负责下载队列与版本校验，进度通过事件抛给加载界面。' },
            { t: 'h2', x: 'Export：把组件引用与 UI 事件变成字段' },
            { t: 'p', x: 'ExportManager 会在 Awake 时按名字查找子物体并填充字段，同时尝试把 Button、Toggle、Slider、InputField 事件绑到同名方法。于是常见的手写 GetComponent + AddListener 被压缩成一行声明：' },
            { t: 'code', lang: 'csharp', text: `[Serializable]
public class Player : NetworkModule, IEvent<OnPlayerUpdate>, IStartAuthority
{
    [Export] public PlayerAction Action;
    [Export] public PlayerModule Module;
    [Export] public PlayerFeature Feature;
    [Export] public PlayerMachine Machine;
}` },
            { t: 'h2', x: 'UI 面板：按层管理' },
            { t: 'p', x: 'UIManager 为每个面板维护状态与栈。类上的 `UIPath`、`UIMask`、`UIRect` 特性描述面板路径、遮罩状态与网格布局；通用列表面板 `UIPanel<T, TGrid>` 内置滚动复用逻辑，避免每个列表都重新实现一套。' },
            { t: 'h2', x: '数据表：Excel 即配置' },
            { t: 'p', x: 'Editor 的表格工具直接读取 .xlsx 压缩包内的 XML，解析工作表与共享字符串。表格类按约定的 `IDataTable` 接口生成 ScriptableObject；字段上标记 `PrimaryAttribute` 的属性会成为主键索引，运行时通过 `DataManager.Get<T>(key)` 查询：' },
            { t: 'code', lang: 'csharp', text: `// 表格导入后生成的数据类，主键属性标 [Primary]
var row = DataManager.Get<ItemData>(10001);` },
            { t: 'h2', x: '池、存档与音频' },
            { t: 'ul', items: ['PoolManager.Show<T>(path) 从对象池取预制体，Hide 归还，特效代码无需管理销毁时机', 'JsonManager.Save/Load 负责本地存档，并支持加密写入', 'SoundManager 持有 BGM 与音效列表，音量变化会立刻持久化', 'Singleton<T> 与 IDontDestroy 组合实现跨场景单例'] },
            { t: 'quote', x: '这些约定的最终目的，是让玩法脚本看起来像“声明想做什么”，而不是“每一步怎么做”。' }
        ]
    },
    {
        id: 'codegen',
        category: '工具链',
        title: 'IL 织入：让 [ServerRpc] 与 [SyncVar] 真正跑起来',
        excerpt: 'RPC 与同步变量最怕手写样板。Astraia 在编译期用 ILPostProcessor 织入代码，把特性变成真实的序列化与分发逻辑。',
        date: '2026-08-26',
        readTime: '11 分钟',
        blocks: [
            { t: 'p', x: '网络模块里最常见的写法是：给字段加 `[SyncVar]`，给方法加 `[ServerRpc]` / `[ClientRpc]` / `[TargetRpc]`。真正让这些特性生效的，不是运行时反射扫描，而是 Unity 编译管线里的 ILPostProcessor。' },
            { t: 'h2', x: '编译期织入的入口' },
            { t: 'p', x: 'NetworkProcessor 实现 Unity 的 ILPostProcessor，用 Mono.Cecil 读取编译产物：引用 Astraia 的程序集才会被处理，`Astraia.Run`、`Astraia.Editor` 与 Unity 自身程序集会被跳过：' },
            { t: 'code', lang: 'csharp', text: `internal sealed class NetworkProcessor : ILPostProcessor
{
    private static readonly HashSet<string> IgnoreAssemblies = new()
    {
        "Astraia.Run", "Astraia.Editor",
        "Assembly-CSharp-firstpass", "Assembly-CSharp-Editor"
    };

    public override bool WillProcess(ICompiledAssembly compiledAssembly)
    {
        if (compiledAssembly.Name == Weaver.WEAVER) return true;
        if (compiledAssembly.Name.StartsWith("Unity")) return false;
        if (IgnoreAssemblies.Contains(compiledAssembly.Name)) return false;
        return compiledAssembly.References.Any(r => ...);
    }
}` },
            { t: 'h2', x: '给 NetworkModule 补上序列化' },
            { t: 'p', x: 'Weaver 遍历程序集里所有 `NetworkModule` 子类，为每个类生成 `SerializeSyncVars` 与 `DeserializeSyncVars`。运行时 NetworkModule.Serialize 会先写内容长度，再调用这个生成方法，避免反射逐字段读取：' },
            { t: 'code', lang: 'csharp', text: `protected override void SerializeSyncVars(MemoryWriter writer, bool isInit)
{
    // 由织入器生成：每个 [SyncVar] 字段在这里按固定顺序写入
    writer.WriteColor32(color);
}

protected override void DeserializeSyncVars(MemoryReader reader, bool isInit)
{
    color = reader.ReadColor32();
}` },
            { t: 'p', x: '`[SyncVar(nameof(OnValueChanged))]` 还会生成 setter 包装：字段变化时置脏位，并在反序列化成功后触发同名 hook，让表现层能响应变化。' },
            { t: 'h2', x: 'RPC 消息表与冲突检测' },
            { t: 'p', x: '远程调用方法名会被散列成 ushort 消息 id。NetworkAttribute 在织入阶段注册一张静态表：id 到模块类型、通道与委托。如果两个 RPC 撞了 hash，日志会直接报“远程调用冲突”，把问题暴露在编译/启动期。' },
            { t: 'code', lang: 'csharp', text: `[ServerRpc]
public void SyncColorServerRpc(Color32 color)
{
    this.color = color;
}

[ClientRpc(Pass.KCP | Pass.ANY)]
private void SetDirectionClientRpc(int direction)
{
    transform.localScale = new Vector3(direction, 1, 1);
}` },
            { t: 'h2', x: '同一个管线还做了什么' },
            { t: 'p', x: 'EntityGenerator 会为 `Export` 派生类补齐自动绑定，NetworkModuleGen 处理模块自身的成员。也就是说：Export 字段填充、SyncVar、RPC 分发都是在同一次 IL 织入里完成的。' },
            { t: 'quote', x: '“手写一次网络样板，不如让编译期替你写一百次。”生成代码可能不好读，但它稳定、可复用，而且不会忘记反序列化某个字段。' }
        ]
    },
    {
        id: 'network',
        category: '网络同步',
        title: '对象同步设计：NetworkEntity、模块与观察者',
        excerpt: '同步的对象不是 MonoBehaviour，而是挂载一组 NetworkModule 的实体。从 spawn 快照到 dirty 位，看 Astraia 如何组织网络对象。',
        date: '2026-08-30',
        readTime: '12 分钟',
        blocks: [
            { t: 'p', x: '把“一个玩家”抽象成 NetworkEntity，把“玩家身上的每块可同步数据”拆成 NetworkModule，是 Astraia 对象同步的基本思路。实体负责生命周期与观察者列表，模块负责具体字段的序列化。' },
            { t: 'h2', x: '实体与模块的绑定' },
            { t: 'p', x: 'NetworkEntity 在 Awake 时收集自身所有 NetworkModule，并按顺序给它们分配 moduleId。之后协议里只要用 `(objectId, moduleId, methodId)` 三元组，就能定位到具体对象上的具体方法：' },
            { t: 'code', lang: 'csharp', text: `internal readonly struct ServerRpcMessage : IMessage
{
    public readonly uint objectId;
    public readonly byte moduleId;
    public readonly ushort methodId;
    public readonly ArraySegment<byte> segment;
}` },
            { t: 'h2', x: 'isServer / isClient / isOwner / isHost' },
            { t: 'p', x: 'NetworkEntity 用一组 bit 表示自己在当前会话里的角色。模块可以用这些属性判断该执行哪份逻辑：' },
            { t: 'code', lang: 'csharp', text: `public bool isHost => isServer && isClient;
public bool isOwner => (state & State.Owner) != 0;
public bool isServer => (state & State.Server) != 0 && NetworkManager.isServer;
public bool isClient => (state & State.Client) != 0 && NetworkManager.isClient;` },
            { t: 'p', x: '示例里 Player 的 Execute 就依赖这套判断：只有 owner 处理输入与状态机，其他端只做插值表现。' },
            { t: 'h2', x: '观察者与兴趣管理' },
            { t: 'p', x: '每个实体维护 observers 列表。观察者第一次加入时，服务器发送一次完整快照（isInit），之后只发送按模块 dirty 位筛选的增量；离开时发送 Despawn 并从列表移除。' },
            { t: 'code', lang: 'csharp', text: `public static void Add(NetworkEntity entity, NetworkClient client)
{
    var observers = entity.observers;
    if (!observers.Contains(client))
    {
        observers.Add(client);
        client.entities.Add(entity);
        // 首次进入观察者列表：发送完整初始化快照
        entity.modules.ServerSend(owner, other, true);
        client.Send(new SpawnMessage(...));
    }
}` },
            { t: 'h2', x: '同步模式与通道' },
            { t: 'p', x: 'NetworkModule 有 SyncMode（服务器/客户端）与 syncRate 节流。服务器只把“服务器模式”模块的变化写给 owner；客户端也只在拥有权下提交“客户端模式”模块。模块级 dirty 位用 ulong 表示，串行化时以位掩码开头，接收端据此跳过未变化模块。' },
            { t: 'p', x: '发送通道来自 `Pass`：`KCP = 1 << 0`、`UDP = 1 << 1`、`ANY = 1 << 2`。特性可以组合，让可靠与不可靠消息走不同路径。' },
            { t: 'h2', x: '接入 Unity PlayerLoop' },
            { t: 'p', x: 'NetworkSystem 把 EarlyUpdate 挂到 PlayerLoop 的 EarlyUpdate、把 AfterUpdate 挂到 PreLateUpdate，统一驱动 NetworkManager 的收发与脏数据发送，不依赖某个 MonoBehaviour 是否存活。' },
            { t: 'h2', x: '从协议回看框架' },
            { t: 'p', x: 'Spawn、Despawn、RPC、SyncVar 这几种消息都能在 Astraia-Net 的核心消息定义里找到。Unity 网络层只负责把这些消息翻译成对象操作——核心不懂 GameObject，但它知道如何搬运一个网络对象。' }
        ]
    },
    {
        id: 'lobby',
        category: '服务器',
        title: 'Astraia.Lobby：在线大厅与房间中继是怎么工作的',
        excerpt: '一个能跑在大厅里的最小服务器：身份验证、房间创建/加入/离开、主机与成员消息中继，以及一个供客户端拉取的房间列表接口。',
        date: '2026-08-31',
        readTime: '9 分钟',
        blocks: [
            { t: 'p', x: 'Astraia.Lobby 是 net8.0 上的大厅服务器。启动后它加载 Astraia.dll，开启 KCP 服务与一个内嵌 HTTP 端点；客户端先在此拿房间列表，再走自定义二进制协议创建或加入房间。' },
            { t: 'h2', x: '启动与主循环' },
            { t: 'p', x: 'Program 读取 setting.json（服务器密钥与端口），随后注册 onConnect / onReceive / onDisconnect 回调，主循环每 10ms 推进一次 ServerEarlyUpdate / ServerAfterUpdate：' },
            { t: 'code', lang: 'csharp', text: `connection.server.onConnect = Connect;
connection.server.onReceive = Receive;
connection.server.onDisconnect = Disconnect;

while (true)
{
    connection.ServerEarlyUpdate();
    connection.ServerAfterUpdate();
    await Task.Delay(10);
}` },
            { t: 'h2', x: '身份验证与房间列表' },
            { t: 'p', x: '连接建立后客户端会发送“请求进入大厅”，携带服务器密钥。验证通过才进入大厅状态。HTTP 端点 `/api/compressed/servers` 用核心的 MemoryWriter 把房间列表压缩后返回，客户端可以用同一套读写器解析。' },
            { t: 'h2', x: '房间生命周期' },
            { t: 'ul', items: ['创建房间：生成六位房间码（Seed.Next 0xAAAAAA~0xFFFFFF），房主记录在 room.Host', '加入房间：按房间码查找并检查人数上限，成功后向房主通知新成员', '更新房间：房主可以修改名称、扩展数据、人数与房间模式', '离开/踢人：成员断开通知房主；房主断开则通知所有成员并销毁房间', '索引复用：被销毁房间的 index 放入队列，供下一个房间复用'] },
            { t: 'code', lang: 'csharp', text: `var room = new Lobby
{
    Id = id,
    Host = clientId,
    Name = reader.ReadString(),
    Data = reader.ReadString(),
    Count = reader.ReadInt32(),
    Type = (Lobby.Room)reader.ReadInt32(),
    Index = indices.Count > 0 ? indices.Dequeue() : ++counter,
};` },
            { t: 'h2', x: '消息中继' },
            { t: 'p', x: '游戏数据通过“同步网络数据”转发：成员发给房主，房主再定向发给目标成员。帧长超过通道上限会断开连接，避免恶意超长消息打穿缓冲。' },
            { t: 'h2', x: '小结' },
            { t: 'p', x: '大厅服务器本身逻辑不多，但它验证了一个重要设计：房间协议、二进制读写、KCP 传输全部来自纯 C# 核心。Unity 客户端和服务器没有各自维护一套消息格式，这是两端能直接互通的前提。' }
        ]
    },
    {
        id: 'example',
        category: '示例解析',
        title: 'AwakeScene 拆解：一个固定步长下同步的平台跳跃示例',
        excerpt: '从状态机到 SyncManager，看示例场景如何让本地操作手感顺畅，同时让所有玩家看到一致的平台跳跃结果。',
        date: '2026-09-04',
        readTime: '13 分钟',
        blocks: [
            { t: 'p', x: 'Astraia 仓库里的 AwakeScene 不是一段静态演示，而是一个可双端运行的平台跳跃游戏：玩家可以移动、跳跃、冲刺、抓墙，并通过 Astraia.Net 把这些输入与结果同步给其他客户端。' },
            { t: 'h2', x: '一个玩家，四个模块' },
            { t: 'p', x: 'Player 本身是 NetworkModule，身上再挂 Action（输入）、Module（碰撞进出）、Feature（数值与状态）、Machine（状态机）四个 Export 模块。输入只在 owner 上 Tick，非 owner 则直接同步 Transform：' },
            { t: 'code', lang: 'csharp', text: `public void Execute(OnPlayerUpdate message)
{
    Module.Tick();
    if (isOwner)
    {
        Action?.Tick();
        Machine.Tick();
    }
    else
    {
        Machine.SyncTransform();
    }
}` },
            { t: 'h2', x: '状态机与动画状态一一对应' },
            { t: 'p', x: 'PlayerMachine 用核心的 StateMachine 管理状态，并把动画名映射成状态值：Idle、Wait、Walk、Jump、Fall、Grab、Hold、Dash、Rush、Shuttle。状态切换通过 `machine.Switch(value)` 完成，进入状态时可以发送 RPC 改变颜色或播放特效：' },
            { t: 'code', lang: 'csharp', text: `protected override void OnEnter()
{
    Feature.RushCount = 0;
    owner.SyncColorServerRpc(Color.green);
}

protected override void OnUpdate()
{
    InputX(GameManager.MoveX);
    InputY();
    Apply();
}` },
            { t: 'h2', x: '为什么数值都是 Fixation' },
            { t: 'p', x: 'PlayerFeature 里的 MoveSpeed、DashSpeed、JumpForce 等都用 Fixation 表示，并写成“每帧位移”的形式，例如 `MoveSpeed = 5F / 60`、`FallLimit = 15F / 60`。模拟代码按固定时间片推进，而不是直接依赖 Unity 的物理步长。' },
            { t: 'h2', x: 'SyncManager：30 Hz 的服务器权威同步' },
            { t: 'p', x: '示例里服务器以约 30 Hz 的节拍收集玩家坐标并广播。owner 在 FixedUpdate 里把最新坐标放进 clientPosition，服务器接收 SetPositionServerRpc，攒够一拍后通过一个 ClientRpc 批量下发：' },
            { t: 'code', lang: 'csharp', text: `[ClientRpc]
private void SendPositionClientRpc(Fixation syncTime, List<SyncData> syncs)
{
    foreach (var sync in syncs)
    {
        var player = sync.Id;
        if (player)
        {
            if (!player.isOwner)
                player.Machine.position = sync.Position;
            player.Machine.syncPosition = sync.Position;
            serverPosition[sync.Id] = sync.Position;
        }
    }
}` },
            { t: 'h2', x: '手感与一致性之间的取舍' },
            { t: 'p', x: 'owner 输入后立即改变本地 Transform，同时把坐标上报服务器；非 owner 则用服务器坐标作为基准，只做插值表现。GameManager 在所有玩家准备好、syncTime 非零后才推进 OnPlayerUpdate，保证每个客户端都在同一份时间基准上模拟。' },
            { t: 'quote', x: '一个示例的价值，不只是演示“能连上”，而是验证：确定性逻辑、RPC、SyncVar、对象池这些零件拼在一起时，玩起来仍然像是一个正常的平台跳跃游戏。' }
        ]
    }
];
