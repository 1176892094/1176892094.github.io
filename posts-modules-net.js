// posts-modules-net.js - Astraia-Net 核心类逐一拆解
window.moduleMeta = window.moduleMeta || [];

window.moduleMeta.push(
{
    id: 'm-event-manager',
    category: '核心运行时',
    title: 'EventManager：核心事件分发器',
    excerpt: '结构体事件 + 按类型分池的监听列表，是框架内解耦的第一站。',
    source: 'Astraia-Net/Astraia/A.管理类/EventManager.cs',
    decl: 'public static class EventManager',
    intro: 'EventManager 用 struct 作为事件载荷，每种事件类型维护一个独立的监听池。派发时把值类型结构体直接广播给所有监听者，避免字符串键与全局 Event 字典。',
    duties: ['按事件类型延迟创建监听池，池内以 Action<T> 形式保存监听者', 'Listen / Remove / Invoke 三方法分别负责注册、移除与派发', '统计 Acquire、Release、Dequeue、Enqueue 等池指标，便于观察订阅是否泄漏'],
    note: '框架内的事件定义只是 `readonly record struct` + `IEvent` 标记，例如 OnEarlyUpdate、OnAfterUpdate 都走这一套派发。',
    apis: `public static void Listen<T>(IEvent<T> data) where T : struct, IEvent
public static void Remove<T>(IEvent<T> data) where T : struct, IEvent
public static void Invoke<T>(T data) where T : struct, IEvent`,
    with: ['`IEvent` / `IEvent<T>`：事件载荷的标记接口', '`HeapManager`：同类池化思想的另一实现', '`NetworkSystem`：在 PlayerLoop 的 Early/After 阶段派发全局事件']
},
{
    id: 'm-heap-manager',
    category: '核心运行时',
    title: 'HeapManager：统一对象池管理器',
    excerpt: '所有短生命周期对象都从池中取、用完归还，是降低分配抖动的基础设施。',
    source: 'Astraia-Net/Astraia/A.管理类/HeapManager.cs',
    decl: 'public static class HeapManager',
    intro: 'HeapManager 维护一组按真实类型划分的对象池。Dequeue 时优先复用队列里的实例，没有可用实例时才用 Activator 创建；Enqueue 后实例回到池中等待下次使用。',
    duties: ['按 Type 建立独立 Pool<T>，避免不同类型的对象混池', 'Dequeue 支持带构造参数的创建与复用', '统计 Acquire/Release/Dequeue/Enqueue，便于观察池命中情况', 'Dispose 时清空所有池'],
    apis: `public static T Dequeue<T>(params object[] args)
public static T Dequeue<T>(Type type, params object[] args)
public static void Enqueue<T>(T item)
public static void Enqueue<T>(T item, Type type)`,
    with: ['`EventManager`：为事件监听池复用同一套计数约定', '`Async`/`Tween`/`Watch`：异步与补间实例通常由池创建', '`MemoryWriter`/`MemoryReader`：二进制缓冲同样走 Pop/Push']
},
{
    id: 'm-time-manager',
    category: '核心运行时',
    title: 'TimeManager：固定槽位的时间推进器',
    excerpt: 'Render、Physic、Accept 三段固定数组承载可更新对象，移除时用交换删除避免搬移。',
    source: 'Astraia-Net/Astraia/A.管理类/TimeManager.cs',
    decl: 'public static class TimeManager',
    intro: 'TimeManager 把时间推进分成渲染、物理、网络接收三段，每段可注册最多 1024 个 IAsync。每帧只更新当前段，注册对象被保存在连续数组中。',
    duties: ['Render/Physic/Accept 三段更新，接收方按各自时间来源调用', '固定数组 + 槽位交换删除，避免 List.Remove 式搬移', '暴露 renderTime、physicTime、acceptTime 供业务读取'],
    apis: `public static void RenderUpdate(Fixation elapseTime)
public static void PhysicUpdate(Fixation elapseTime)
public static void AcceptUpdate(Fixation elapseTime)`,
    with: ['`Async`、`Tween`、`Watch`：都实现 IAsync 并注册到 TimeManager', '`GlobalManager`：Unity 侧把 Update/FixedUpdate 桥接进来', '`NetworkSystem`：网络接收更新由 Accept 段驱动']
},
{
    id: 'm-async',
    category: '核心运行时',
    title: 'Async：可等待的异步状态基类',
    excerpt: '把“等待一段时间/一个状态”封装成可 await 的异步对象，并支持 Interrupt 中断。',
    source: 'Astraia-Net/Astraia/B.定时器/Async.cs',
    decl: 'public abstract class Async : IAsync, INotifyCompletion',
    intro: 'Async 是框架异步模型的基类：实现 INotifyCompletion，让业务可以 await 一个自定义异步过程；内部维护 Running/Success/Failure 状态，并注册到 TimeManager 由固定节拍推进。',
    duties: ['提供 Success/Failure 预置 Task 结果', 'IsCompleted 依据当前状态判断', 'Interrupt 可主动把等待置为失败', 'OnComplete 注册完成回调，GetResult 返回终态'],
    apis: `public static readonly Task<State> Success;
public static readonly Task<State> Failure;
public bool IsCompleted { get; }
public void Interrupt(State value = State.Failure)
public Async GetAwaiter()
public State GetResult()`,
    with: ['`TimeManager`：异步更新被时间管理器驱动', '`Tween`/`Watch`：都继承 Async', '`State` 枚举：Running/Success/Failure 三态流转']
},
{
    id: 'm-tween',
    category: '核心运行时',
    title: 'Tween：补间动画对象',
    excerpt: '围绕 Async 实现的自定义补间：OnUpdate 拿到插值进度，支持 Ease 曲线。',
    source: 'Astraia-Net/Astraia/B.定时器/Tween.cs',
    decl: 'public sealed class Tween : Async',
    intro: 'Tween 是一次性补间对象：创建时记录时长，之后每帧按进度调用 OnUpdate。Ease 常量类提供 Linear、InQuad、OutQuad、InOutQuad、SmoothStep、PingPong 等曲线。',
    duties: ['按 duration 推进并暴露当前进度', 'OnUpdate 让调用方接收每一帧的插值结果', 'Ease 选择不同的缓动曲线', '完成后自动回到池/触发 OnComplete'],
    apis: `internal static Tween Create(object owner, float duration)
public Tween OnUpdate(Action<float> update)
public Tween Ease(int ease = Astraia.Ease.Linear)
public static class Ease {
    public const int Linear = 0; public const int InQuad = 1;
    public const int OutQuad = 2; public const int InOutQuad = 3;
    public const int SmoothStep = 4; public const int PingPong = 5;
}`,
    with: ['`Async`：Tween 的等待与中断语义来自基类', '`TimeManager`：注册到 Render/Physic 段推进', '`AsyncExtensions`：用 Render()/Physic()/Accept() 选择更新段']
},
{
    id: 'm-watch',
    category: '核心运行时',
    title: 'Watch：定时等待器',
    excerpt: '适合做倒计时与循环等待：Set/Add 控制间隔，Loops 控制循环次数。',
    source: 'Astraia-Net/Astraia/B.定时器/Watch.cs',
    decl: 'public sealed class Watch : Async',
    intro: 'Watch 是比 Tween 更朴素的定时器：不关心插值进度，只负责“过了多久再继续”。单位默认按所在 TimeManager 段推进，支持单次或循环。',
    duties: ['按固定 interval 推进等待', 'OnUpdate 在每个更新拍执行回调', 'Set/Add 修改剩余时间', 'Loops 设置循环次数'],
    apis: `internal static Watch Create(object owner, float duration)
public Watch OnUpdate(Action update)
public Watch Set(float interval)
public Watch Add(float interval)
public Watch Loops(int count = 0)`,
    with: ['`Async`：Watch 的状态流转来自基类', '`TimeManager`：选择 Render/Physic/Accept 之一推进', '`AsyncExtensions`：Render()/Physic()/Accept() 扩展']
},
{
    id: 'm-fixation',
    category: '核心运行时',
    title: 'Fixation：int 上的定点数',
    excerpt: '低 12 位表示小数，跨端确定性由此而来。',
    source: 'Astraia-Net/Astraia/F.结构体/Fixation.cs',
    decl: 'public readonly record struct Fixation(int value)',
    intro: 'Fixation 用一个 int 保存数值：低 12 位是小数部分。乘法用 long 中间量再位移，除法先放大再除，比较与取整全部走整数运算，不依赖浮点单元。',
    duties: ['提供加减乘除与比较运算符', 'Floor/Ceil/Round 转整数', '与 float 之间做显式/隐式转换', '暴露 One/Zero/MaxValue/MinValue 常量'],
    apis: `private const int BIT = 12; private const int FIX = 1 << BIT;
public static explicit operator Fixation(float value)
public static Fixation operator *(Fixation a, Fixation b)
public int FloorToInt() / CeilToInt() / RoundToInt()`,
    with: ['`Position`：由两个 Fixation 组成坐标', '`AStar`/`FlowField`：网格坐标按定点数取整', '`Properties`：属性表以定点数读写']
},
{
    id: 'm-position',
    category: '核心运行时',
    title: 'Position：确定性二维坐标',
    excerpt: '两个 Fixation 构成的向量类型，封装距离、点乘、叉乘与归一化。',
    source: 'Astraia-Net/Astraia/F.结构体/Position.cs',
    decl: 'public readonly record struct Position(Fixation x, Fixation y)',
    intro: 'Position 是网络与逻辑层共享的坐标类型。它只由定点数组成，因此在不同平台、客户端与服务器之间计算结果一致。',
    duties: ['提供向量加减、数乘、除法运算', '计算 sqrMagnitude/magnitude/Distance', 'Dot/Cross/Normalize 等几何操作', 'MoveTowards 向目标平滑移动'],
    apis: `public static readonly Position Zero;
public static Position Distance(Position a, Position b)
public static Position Normalize(Position value)
public static Position MoveTowards(Position current, Position target, Fixation maxDistanceDelta)`,
    with: ['`Fixation`：内部数值类型', '`SpatialHash`：以 Position 计算空间桶', '`PlayerState`：示例中的移动同步单位']
},
{
    id: 'm-properties',
    category: '核心运行时',
    title: 'Properties：枚举索引的数值属性表',
    excerpt: '用 Fixation[] 存属性，用枚举做键，适合实体数值面板。',
    source: 'Astraia-Net/Astraia/F.结构体/Properties.cs',
    decl: 'public readonly record struct Properties<T>(Fixation[] properties) where T : unmanaged, Enum',
    intro: 'Properties 用一块连续 Fixation 数组保存数值属性，T 枚举只是键。这样同一套数值可以在同步时作为数组整体传输，而不是维护一堆字段。',
    duties: ['Get/Set 按枚举键读写属性', 'Add/Sub 提供增量修改', 'Clear 一次性清零', 'Create 根据枚举长度分配数组'],
    apis: `public static Properties<T> Create()
public float Get(T key)
public void Set(T key, float value)
public void Add(T key, float value)
public void Sub(T key, float value)`,
    with: ['`Fixation`：数组元素类型', '`PlayerFeature`：示例中角色数值的组织思想', '序列化层：数组可整体写入网络包']
},
{
    id: 'm-state-machine',
    category: '核心运行时',
    title: 'StateMachine：整数键状态机',
    excerpt: '把状态映射为 int 值，创建、切换、更新都由状态机统一驱动。',
    source: 'Astraia-Net/Astraia/E.封装类/StateMachine.cs',
    decl: 'public sealed class StateMachine',
    intro: 'StateMachine 用 Dictionary<int, IState> 管理状态，Switch 时执行旧状态 OnExit 与新状态 OnEnter；Update 驱动当前状态，也可直接按动画/状态值更新指定状态。',
    duties: ['Create<TState>(owner, value) 创建并绑定状态实例', 'Switch(value) 执行标准 Enter/Update/Exit 生命周期', 'Update(int value) 支持外部直接切换动画状态', 'Clear 释放所有状态'],
    apis: `public void Create<TState>(object owner, int value)
public void Switch(int value)
public void Update()
public void Update(int value)
public void Clear()`,
    with: ['`State<T>`：状态基类提供 owner', '`PlayerMachine`：示例里为每个动画注册一个状态', '`BTNode` 的 Running 机制与状态机不同，用于行为树']
},
{
    id: 'm-state',
    category: '核心运行时',
    title: 'State：状态基类',
    excerpt: '泛型状态基类，通过接口把 owner、生命周期与子类模板方法解耦。',
    source: 'Astraia-Net/Astraia/E.封装类/State.cs',
    decl: 'public abstract class State<T> : IState',
    intro: 'State<T> 是状态机里的具体状态基类。IState 负责 Acquire/Release/OnEnter/OnUpdate/OnExit 生命周期，State<T> 把它转成带 owner 的受保护模板方法，子类只需重写逻辑。',
    duties: ['Acquire/Release 管理 owner 引用', '把接口方法映射到可继承的 OnEnter/OnUpdate/OnExit', '让状态直接访问强类型 owner'],
    apis: `public T owner { get; private set; }
protected virtual void OnEnter()
protected virtual void OnUpdate()
protected virtual void OnExit()`,
    with: ['`StateMachine`：创建与切换状态', '`PlayerState`：平台跳跃示例的派生状态', 'IState：框架内部接口']
},
{
    id: 'm-blackboard',
    category: '核心运行时',
    title: 'Blackboard：类型分组黑板',
    excerpt: '行为树共享内存：按值类型分组存储，避免一个字典里做装箱转换。',
    source: 'Astraia-Net/Astraia/E.封装类/Blackboard.cs',
    decl: 'public class Blackboard<T>',
    intro: 'Blackboard<T> 的键类型由泛型 T 决定，值则先按 TValue 分组到独立 Dictionary，再在组内读写。Set/Get 都走泛型路径，减少类型转换噪声。',
    duties: ['Set<TValue>(key, value) 写入', 'Get<TValue>(key) 读取并返回默认值', 'Clear 清空所有分组', '按值类型惰性创建字典'],
    apis: `public void Set<TValue>(T key, TValue value)
public TValue Get<TValue>(T key)
public void Clear()`,
    with: ['`BTNode`：行为树 OnTick 共享同一 Blackboard', '`Nodes`：节点构建时传入根黑板', 'SpatialHash：同属可复用容器']
},
{
    id: 'm-spatial-hash',
    category: '核心运行时',
    title: 'SpatialHash：空间哈希容器',
    excerpt: '把坐标压成格子键做分桶，对象跨桶时只移动一次。',
    source: 'Astraia-Net/Astraia/E.封装类/SpatialHash.cs',
    decl: 'public sealed class SpatialHash<T>',
    intro: 'SpatialHash 将 Position 压缩为 `(x << 16) | (y & 0xFFFF)` 的格子键，用字典把对象分桶。Update 发现旧桶与目标桶不同时，只执行一次 Remove/Insert。',
    duties: ['Insert 把对象放入坐标所在桶', 'Update 检测换桶并按需迁移', 'Remove 从所在桶移除', '面向 AOI/邻居查询场景'],
    apis: `public void Insert(T item, Position center)
public void Update(T item, Position center)
public void Remove(T item)`,
    with: ['`Position`：格子坐标来源', '`FlowField`：网格空间索引思路一致', '`NetworkObserver`：需要兴趣管理时可参考']
},
{
    id: 'm-a-star',
    category: '核心运行时',
    title: 'AStar：A* 寻路算法',
    excerpt: '复用数组 + 增量清理，让多次寻路不反复分配整张表。',
    source: 'Astraia-Net/Astraia/G.寻路类/AStar.cs',
    decl: 'public sealed class AStar : Pathfinding',
    intro: 'AStar 用 gScore/fScore/parent/closed 数组保存搜索状态，并用 indices 记录本次访问过的格子，重建路径时只清理这些位置，避免每帧 new 一遍整张网格。',
    duties: ['以 cost 网格为输入搜索最短路径', '八方向移动，直走 10、斜走 14', '复用数组与 PriorityQueue', 'Rebuild 返回 IList<Position> 路径'],
    apis: `public AStar(int width, int height, int[] costs)
public IList<Position> Rebuild(int sx, int sy, int ex, int ey)`,
    with: ['`Pathfinding`：网格与代价管理基类', '`PriorityQueue`：二叉堆开节点', '`Neighbors`：八方向位移表']
},
{
    id: 'm-flow-field',
    category: '核心运行时',
    title: 'FlowField：流场寻路',
    excerpt: '先对多目标做积分场，再生成流向场，适合大量单位共用路径。',
    source: 'Astraia-Net/Astraia/G.寻路类/FlowField.cs',
    decl: 'public sealed class FlowField : Pathfinding',
    intro: 'FlowField 两阶段计算：先以一组目标点做 integration pass，生成到目标的距离场；再根据相邻格子的代价差生成 flow direction，单位每帧直接查询方向即可。',
    duties: ['接收目标点集合而非单个终点', 'BuildIntegration 生成积分场', 'BuildFlowField 生成流场方向', '复用 nodes/steps 数组减少分配'],
    apis: `public FlowField(int width, int height, int[] costs)
public void Rebuild(IList<Position> points)`,
    with: ['`Pathfinding`：基类网格方法', '`AStar`：单目标寻路时的兄弟实现', '`Position`：目标点坐标']
},
{
    id: 'm-memory-writer',
    category: '核心运行时',
    title: 'MemoryWriter：二进制写入器',
    excerpt: '带池化与 unmanaged 泛型写入的字节缓冲，协议序列化统一从这里出发。',
    source: 'Astraia-Net/Astraia/K.序列化/MemoryWriter.cs',
    decl: 'public class MemoryWriter : IDisposable',
    intro: 'MemoryWriter 维护一段可增长字节缓冲与写入位置。Write<T> 支持任意 unmanaged 结构体直接写入，扩展方法再叠加字符串、数组、房间信息等复杂类型。',
    duties: ['Pop/Push 从对象池取还缓冲', 'Write<T> 泛型写入非托管类型', 'WriteNullable 处理可空结构', 'Invoke<T> 调用注册的写入委托', 'position 记录已写长度'],
    apis: `public static MemoryWriter Pop()
public static void Push(MemoryWriter writer)
public unsafe void Write<T>(T value) where T : unmanaged
public void Reset() / Resize(int count) / WriteBytes(...)
public static implicit operator ArraySegment<byte>(MemoryWriter writer)`,
    with: ['`MemoryReader`：读取侧镜像', '`Writer<T>`：注册类型写入委托', '`NetworkMessage`：消息包直接写进缓冲']
},
{
    id: 'm-memory-reader',
    category: '核心运行时',
    title: 'MemoryReader：二进制读取器',
    excerpt: '读取 ArraySegment 字节流，与 MemoryWriter 一写一读。',
    source: 'Astraia-Net/Astraia/K.序列化/MemoryReader.cs',
    decl: 'public class MemoryReader : IDisposable',
    intro: 'MemoryReader 包装一段 ArraySegment<byte>，按写入顺序读取 unmanaged 类型与复杂扩展类型。Pop 从池取实例，Reset 绑定新的报文段，使用完 Push 归还。',
    duties: ['Pop(segment) 从池取读取器并绑定数据', 'Read<T> 泛型读取非托管类型', 'ReadNullable 读取可空结构', 'Invoke<T> 调用已注册的读取委托', 'ReadBytes/ReadArraySegment 读取原始字节'],
    apis: `public static MemoryReader Pop(ArraySegment<byte> segment)
public static void Push(MemoryReader reader)
public unsafe T Read<T>() where T : unmanaged
public void Reset(ArraySegment<byte> segment)`,
    with: ['`MemoryWriter`：写入侧镜像', '`Reader<T>`：注册类型读取委托', '`Connection`：Receive 后从池读取解析']
},
{
    id: 'm-xor32',
    category: '核心运行时',
    title: 'Xor32：32 位异或混淆值',
    excerpt: '保存 origin 与 buffer，通过异或偏移量防止数值被直接改内存。',
    source: 'Astraia-Net/Astraia/D.加密类/Xor32.cs',
    decl: 'public struct Xor32 : IEquatable<Xor32>',
    intro: 'Xor32 内部同时保存原始值与一个随机偏移后的缓冲值。Value 每次读取都把 buffer 与 offset 异或还原；修改时同时更新两边，让关键 int 不再以明文连续存放。',
    duties: ['隐式转换 int 与 Xor32', '按位 GetBit/SetBit 操作', '提供 Equals/GetHashCode', 'Value 还原真实值'],
    apis: `public int Value { get; }
public static implicit operator int(Xor32 data)
public static implicit operator Xor32(int data)
public int GetBit(int shift, int bits)
public void SetBit(int shift, int bits, int value)`,
    with: ['`Xor64`：long 版本', '`XorEx`：byte[] 版本', '反外挂/内存保护：与 Xor 加密思想一致']
},
{
    id: 'm-xor64',
    category: '核心运行时',
    title: 'Xor64：64 位异或混淆值',
    excerpt: '与 Xor32 相同思路的 long 版本，适合更大数值范围。',
    source: 'Astraia-Net/Astraia/D.加密类/Xor64.cs',
    decl: 'public struct Xor64 : IEquatable<Xor64>',
    intro: 'Xor64 用 long 保存 origin 与 buffer，读取时把 buffer 与 offset 异或还原。对关键 long 数值(如时间戳、id)增加一层内存混淆。',
    duties: ['long 与 Xor64 隐式互转', '按位 GetBit/SetBit', '提供 Equals/GetHashCode', 'Value 还原真实值'],
    apis: `public long Value { get; }
public static implicit operator long(Xor64 data)
public static implicit operator Xor64(long data)
public int GetBit(int shift, int bits)
public void SetBit(int shift, int bits, int value)`,
    with: ['`Xor32`：int 版本', '`XorEx`：byte[] 版本', '`Zip`：压缩/混淆工具']
},
{
    id: 'm-xor-ex',
    category: '核心运行时',
    title: 'XorEx：字节数组异或混淆值',
    excerpt: '为字节数组提供同套保护，隐藏原始内容在堆中的分布。',
    source: 'Astraia-Net/Astraia/D.加密类/XorEx.cs',
    decl: 'public struct XorEx : IEquatable<XorEx>',
    intro: 'XorEx 持有原始 byte[] 与偏移字段。Value 读取时把每个字节按偏移异或还原，适合保护字符串密钥、敏感配置等较长的关键数据。',
    duties: ['byte[] 与 XorEx 隐式互转', 'Value 每次读取时还原数据', '支持按位读写', '提供 Equals/GetHashCode'],
    apis: `public byte[] Value { get; }
public static implicit operator byte[](XorEx variable)
public static implicit operator XorEx(byte[] value)
public int GetBit(int shift, int bits)
public void SetBit(int shift, int bits, int value)`,
    with: ['`Xor32`/`Xor64`：整数版本', '`Zip.Xor`：字节流的另一种混淆入口']
},
{
    id: 'm-zip',
    category: '核心运行时',
    title: 'Zip：压缩与摘要工具',
    excerpt: '字符串/字节压缩、解压、Xor 混淆与哈希，静态工具集中在同一个类。',
    source: 'Astraia-Net/Astraia/C.静态类/Zip.cs',
    decl: 'public static class Zip',
    intro: 'Zip 提供 Compress/Decompress(字符串与字节两种重载)、ComputeHash 以及字节 Xor 混淆。GlobalManager 启动敏感词表时就是先 Decompress 再交给 Bad。',
    duties: ['字节数组按状态位 Xor 混淆', 'ComputeHash 生成摘要', '字符串与 byte[] 的压缩/解压'],
    apis: `public static byte[] Xor(this byte[] bytes, uint state = 1176892094)
public static string ComputeHash(string reason)
public static string Compress(string data) / Decompress(string data)
public static byte[] Compress(byte[] bytes) / Decompress(byte[] bytes)`,
    with: ['`Text`：字符串与字节编码辅助', '`Bad`：敏感词表加载', '`XorEx`：混淆值类型']
},
{
    id: 'm-seed',
    category: '核心运行时',
    title: 'Seed：统一随机源',
    excerpt: 'int、float、Fixation、枚举与数组取随机项，全部收口到一个随机源。',
    source: 'Astraia-Net/Astraia/C.静态类/Seed.cs',
    decl: 'public static class Seed',
    intro: 'Seed 封装 Random，提供随机整数、随机 Fixation、正负号、随机枚举与从集合取随机元素等入口。Lobby 的房间码也用它生成。',
    duties: ['Next/Next(min,max)/NextSign 随机整数', 'Next 随机 Fixation', 'Next<T>() 随机枚举', '从数组/IList 取随机元素', 'NextBytes 填充字节'],
    apis: `public static int Next() / Next(int max) / Next(int min, int max)
public static Fixation Next(Fixation max) / Next(Fixation min, Fixation max)
public static T Next<T>(IList<T> source)
public static T Next<T>() where T : unmanaged, Enum`,
    with: ['`Lobby`：房间码生成', '`Fixation`：定点随机', '`Randomer`：行为树随机节点']
},
{
    id: 'm-log',
    category: '核心运行时',
    title: 'Log：可插拔日志出口',
    excerpt: '框架不直接耦合 Console/Unity，Setup 把输出委托给宿主。',
    source: 'Astraia-Net/Astraia/C.静态类/Log.cs',
    decl: 'public static class Log',
    intro: 'Log 在纯 C# 核心只定义 Info/Warn/Error 三个入口。Unity 端 Setup 到 Debug.Log 系列，大厅服务器 Setup 到带颜色的 Console 输出。',
    duties: ['Setup 注入三个输出委托', 'Info/Warn/Error 统一转发', '让核心库不依赖具体日志实现'],
    apis: `public static void Setup(Action<string> onInfo, Action<string> onWarn, Action<string> onError)
public static void Info(object message)
public static void Warn(object message)
public static void Error(object message)`,
    with: ['`GlobalManager`：Unity 启动时注入 Debug', '`Program`：大厅服务器注入 Console', '`NetworkAttribute`：冲突检测时输出错误']
},
{
    id: 'm-host',
    category: '核心运行时',
    title: 'Host：HTTP 宿主工具',
    excerpt: '把 HttpListener 启动、本机 IP 与共享 HttpClient 收进一个静态工具。',
    source: 'Astraia-Net/Astraia/C.静态类/Host.cs',
    decl: 'public static class Host',
    intro: 'Host 是服务器侧的 HTTP 辅助：Ip() 获取本机地址，Start 用 HttpListener 在指定前缀上启动异步请求处理。Lobby 用它暴露 `/api/compressed/servers`。',
    duties: ['提供共享 HttpClient', '获取本机 IPv4 地址', '启动 HttpListener 异步服务'],
    apis: `public static readonly HttpClient Http = new();
public static string Ip()
public static void Start(string address, Func<HttpListenerRequest, HttpListenerResponse, Task> request)`,
    with: ['`Program`：大厅服务器 HTTP 端点', '`MemoryWriter`：压缩房间列表写入响应', '`Log`：输出错误']
},
{
    id: 'm-search',
    category: '核心运行时',
    title: 'Search：程序集与类型查找',
    excerpt: '统一 BindingFlags 与按程序集名/类型名解析，供反射与生成代码使用。',
    source: 'Astraia-Net/Astraia/C.静态类/Search.cs',
    decl: 'public static class Search',
    intro: 'Search 集中定义 Static/Instance 两组 BindingFlags，并提供 GetAssembly/GetType。ExportManager 与 DataManager 都靠它按名字找类型与方法。',
    duties: ['定义统一反射 BindingFlags', '按程序集名解析 Assembly', '按类型名查找 Type', '暴露类型加载事件'],
    apis: `public static readonly BindingFlags Static;
public static readonly BindingFlags Instance;
public static Assembly GetAssembly(string name)
public static Type GetType(string name)`,
    with: ['`ExportManager`：绑定组件方法', '`DataManager`：查找 IDataTable', '`NetworkAttribute`：类型检查']
}
);
