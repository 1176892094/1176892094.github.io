// posts-modules-extras.js - 补充拆解：寻路基类/序列化注册/通道与行为树
window.moduleMeta = window.moduleMeta || [];

window.moduleMeta.push(
{
    id: 'm-pathfinding',
    category: '核心运行时',
    title: 'Pathfinding：寻路基类',
    excerpt: '把 width/height/costs 网格、阻挡与代价接口抽成所有寻路算法的公共基类。',
    source: 'Astraia-Net/Astraia/G.寻路类/Pathfinding.cs',
    decl: 'public abstract class Pathfinding(int width, int height, int[] costs)',
    intro: 'Pathfinding 管理一张一维 cost 数组：Index(x,y) 计算下标，CanMove 检查边界与斜向拐角，SetCost/SetObstacle 在运行时修改寻路代价。A* 与 FlowField 共用这套网格语义。',
    duties: ['用一维数组保存二维网格代价', '检查越界与斜向移动', '设置/清除阻挡', '暴露 INF 常量表示不可通行'],
    apis: `protected const int INF = int.MaxValue;
protected int Index(int x, int y)
protected bool CanMove(int x, int y, Neighbors d)
public void SetCost(int x, int y, int cost)
public void SetObstacle(int x, int y, bool walkable)`,
    with: ['`AStar`：单目标寻路实现', '`FlowField`：多目标流场实现', '`Neighbors`：八方向位移表']
},
{
    id: 'm-neighbors',
    category: '核心运行时',
    title: 'Neighbors：八方向位移表',
    excerpt: '静态数组定义八个方向的坐标增量与移动代价，寻路按它遍历邻居。',
    source: 'Astraia-Net/Astraia/G.寻路类/Neighbors.cs',
    decl: 'public readonly record struct Neighbors(int x, int y, int cost)',
    intro: 'Neighbors 用一条静态数组预定义八个移动方向：上下左右代价 10，四个斜向代价 14。A* 每次弹出节点后都遍历 Data 找候选格子。',
    duties: ['保存单步 x/y 位移', '直走代价 10、斜走代价 14', 'Data 静态数组集中管理邻居方向'],
    apis: `public static readonly Neighbors[] Data;
// Data[0..7] = (+0,+1,10) (+1,+1,14) (-1,+1,14)
//             (+0,-1,10) (+1,-1,14) (-1,-1,14)
//             (+1,+0,10) (-1,+0,10)`,
    with: ['`Pathfinding.CanMove`：使用位移判断', '`AStar`/`FlowField`：遍历邻居']
},
{
    id: 'm-writer-t',
    category: '核心运行时',
    title: 'Writer<T>：类型写入注册表',
    excerpt: '为自定义类型注册序列化委托，让 MemoryWriter.Invoke 知道怎么写它。',
    source: 'Astraia-Net/Astraia/K.序列化/MemoryWriter.cs',
    decl: 'public static class Writer<T>',
    intro: 'Writer<T> 只保存一个静态字段：从 MemoryWriter 写 T 的委托。框架扩展方法(如 WriteLobby、WritePosition)会把写入逻辑注册进来，业务用 Write/Invoke 时无需关心底层字节布局。',
    duties: ['为每种 T 保存唯一写入委托', '供 MemoryWriter 按类型调用', '由序列化扩展在加载时注册'],
    apis: `public static Action<MemoryWriter, T> writer;
public void Invoke<T>(T value)   // MemoryWriter 内调用 writer`,
    with: ['`MemoryWriter`：宿主写入器', '`WriterExtensions`：具体类型注册', '`MemoryReader`/`Reader<T>`：读取侧镜像']
},
{
    id: 'm-reader-t',
    category: '核心运行时',
    title: 'Reader<T>：类型读取注册表',
    excerpt: '与 Writer<T> 对应的读取委托表，决定 MemoryReader 如何还原 T。',
    source: 'Astraia-Net/Astraia/K.序列化/MemoryReader.cs',
    decl: 'public static class Reader<T>',
    intro: 'Reader<T> 持有 Func<MemoryReader, T> 读取委托。MemoryReader.Invoke<T>() 从表中取委托还原对象，与服务端序列化的顺序一一对应。',
    duties: ['为每种 T 保存唯一读取委托', '供 MemoryReader 还原复杂类型', '保持与 Writer<T> 相同的类型映射'],
    apis: `public static Func<MemoryReader, T> reader;
public T Invoke<T>()   // MemoryReader 内调用 reader`,
    with: ['`MemoryReader`：宿主读取器', '`ReaderExtensions`：具体类型注册', '`MemoryWriter`/`Writer<T>`：写入侧镜像']
},
{
    id: 'm-ease',
    category: '核心运行时',
    title: 'Ease：缓动曲线常量表',
    excerpt: '用 int 常量描述补间曲线，Tween 只需传入一个编号。',
    source: 'Astraia-Net/Astraia/B.定时器/Tween.cs',
    decl: 'public static class Ease',
    intro: 'Ease 把缓动曲线定义成一组 int 常量：Linear 匀速、In/Out 系列用于首尾加减速、PingPong 做往返。这样曲线可存进配置或网络包，避免到处传函数引用。',
    duties: ['提供六种常用缓动曲线编号', 'In/Out/InOut 覆盖加速与减速', 'PingPong 用于往复动画'],
    apis: `public const int Linear = 0; public const int InQuad = 1;
public const int OutQuad = 2; public const int InOutQuad = 3;
public const int SmoothStep = 4; public const int PingPong = 5;`,
    with: ['`Tween`：按编号套用曲线', '动画系统：淡入淡出/位移/缩放', '`Ease` 定义与 Tween.cs 同文件']
},
{
    id: 'm-pass',
    category: '核心运行时',
    title: 'Pass：消息通道常量',
    excerpt: '用位标记定义 KCP/UDP/ANY 三条发送路径，RPC 可按可靠性选路。',
    source: 'Astraia-Net/Astraia/J.传输类/Common.cs',
    decl: 'public static class Pass',
    intro: 'Pass 是通道标记：KCP 走可靠传输，UDP 走原始不可靠通道，ANY 表示任意可达通道。网络特性上可组合使用，例如 `[ClientRpc(Pass.KCP | Pass.ANY)]`。',
    duties: ['定义 KCP/UDP/ANY 三个位', '支持按位组合选路', '服务器与客户端共享同一常量'],
    apis: `public const byte KCP = 1 << 0;
public const byte UDP = 1 << 1;
public const byte ANY = 1 << 2;`,
    with: ['`ClientRpcAttribute`/`ServerRpcAttribute`：传入通道', '`NetworkTransport`：按 pass 分发', 'KCP 传输实现']
},
{
    id: 'm-lobby-record',
    category: '服务器',
    title: 'Lobby：房间数据模型',
    excerpt: 'Host/Members/房间码与模式集中在一个 record，服务器用字典保存所有房间。',
    source: 'Astraia-Net/Astraia/M.网络类/NetworkAuthority.cs',
    decl: 'public record struct Lobby',
    intro: 'Lobby 是服务器端与大厅客户端共享的房间数据：Host 房主连接 id、Members 成员列表、Count 人数上限、Type 公开/私有/锁定，加上房间码与展示字段。Info 枚举定义完整的大厅 opcode。',
    duties: ['保存房主、成员、人数与模式', '携带 Id/Name/Data 展示数据', 'Info 枚举定义身份验证到同步数据的协议编号', 'Room 枚举区分公开/私有/锁定'],
    apis: `public int Host; public int Count; public int Index;
public Room Type; public string Id; public string Name;
public List<int> Members;
public enum Room : byte { 公开, 私有, 锁定 }
internal enum Info : byte { 请求创建房间 = 4, 创建房间成功 = 5, ... }`,
    with: ['`Program`：大厅服务器维护 rooms 字典', '`NetworkAuthority`：大厅状态机', '`Connection`：房间消息读写']
},
{
    id: 'm-bt-node',
    category: '核心运行时',
    title: 'Node：行为树文本节点',
    excerpt: '用文本描述行为树结构：名字、参数与子节点先解析成 Node 树，再构建可执行节点。',
    source: 'Astraia-Net/Astraia/H.行为树/BTNodes.cs',
    decl: 'public readonly struct Node',
    intro: 'Node 是“设计态”的树节点：从 `Sequence(A, B)` 这类文本解析出来，保存 Index、Name、Data 与子 Node 列表；Build 再通过注册表把设计节点转成真实运行的 INode。',
    duties: ['保存节点名与参数 Data', '保存子节点 List<Node>', 'Build 把节点转换为运行时 INode', '支持中文/英文括号与逗号解析'],
    apis: `public readonly int Index; public readonly string Name;
public readonly string Data; public readonly List<Node> Nodes;
public INode Build(Func<Node, Type> func)`,
    with: ['`Nodes`：文本 Load 与注册表', '`BTNode.cs` 的组合节点：运行时 INode', '`Blackboard<int>`：共享内存']
},
{
    id: 'm-bt-nodes',
    category: '核心运行时',
    title: 'Nodes：行为树节点注册与文本加载',
    excerpt: '从字符串递归构建 Node 树，再按类型工厂生成组合/修饰/叶子节点。',
    source: 'Astraia-Net/Astraia/H.行为树/BTNodes.cs',
    decl: 'public static class Nodes',
    intro: 'Nodes 维护一张 类型→工厂 的注册表，Load 把行为树文本解析成 Node 列表，Node.Build 再调用工厂创建 Sequence、Selector、Repeater 等真实节点。',
    duties: ['注册内置组合与修饰节点工厂', 'Load 递归解析带括号的文本树', '支持自定义节点类型的运行时创建'],
    apis: `public static INode Sequence(Node node, Func<Node, Type> func)
public static Node Load(string reason, List<Node> nodes)
private static List<string> LoadNode(string reason)`,
    with: ['`Node`：文本节点结构', '`BTNode.cs`：Sequence/Selector/Parallel 等运行时节点', '`Blackboard<int>`：节点共享数据']
},
{
    id: 'm-bt-combinators',
    category: '核心运行时',
    title: '行为树组合节点：Sequence/Selector/Parallel 等',
    excerpt: '一组紧凑的异步节点结构体，用 Running/Success/Failure 表达控制流。',
    source: 'Astraia-Net/Astraia/H.行为树/BTNode.cs',
    decl: 'Sequence / Selector / Parallel / Randomer / Repeater / Inverter / Success / Failure',
    intro: '这些节点都实现 INode，用 `Task<State> OnTick` 驱动。组合节点不持有状态字段，而是把当前位置写进共享 indices，因此同一个节点实例可以被多棵树安全执行。',
    duties: ['Sequence：顺序执行子节点，失败即返回 Failure', 'Selector：按顺序尝试，成功即返回 Success', 'Parallel：Any/All 两种汇聚语义', 'Randomer/Repeater/Inverter 控制随机、循环与取反', 'Success/Failure 强制返回终态'],
    note: '节点只依赖传入的 indices 与 Blackboard，因此结构体本身是只读的，适合纯 C# 跨端复用。',
    apis: `public readonly struct Sequence(int index, INode[] nodes) : INode
public readonly struct Selector(int index, INode[] nodes) : INode
public readonly struct Parallel(bool isAny, INode[] nodes) : INode
public async Task<State> OnTick(int[] indices, Blackboard<int> root)`,
    with: ['`INode`：行为树统一接口', '`Nodes`：从文本注册表创建', '`Blackboard<int>`：共享状态']
}
);
