// posts-modules-unity-net.js - Astraia(Unity 网络库)核心类逐一拆解
window.moduleMeta = window.moduleMeta || [];

window.moduleMeta.push(
{
    id: 'm-network-entity',
    category: '网络同步',
    title: 'NetworkEntity：网络实体',
    excerpt: '把网络身份、观察者与对象生命周期收进一个实体，是同步的基本单位。',
    source: 'Astraia/Assets/Astraia/Runtime/网络库/实体类/NetworkEntity.cs',
    decl: 'public sealed class NetworkEntity : Entity',
    intro: 'NetworkEntity 在 Awake 收集自身所有 NetworkModule 并分配 moduleId，在 OnDestroy 时通知服务器销毁或从 spawns 移除。它用一组 bit 表达当前会话中的 Owner/Server/Client/Host 身份。',
    duties: ['Awake 收集模块并绑定 owner', '维护 observers 观察者列表', '暴露 isHost/isOwner/isServer/isClient 判断', 'Destroy 时向服务器发起销毁/回收', 'Reset 清空网络状态'],
    apis: `public bool isHost / isOwner / isServer / isClient
public NetworkServer connection
public void Reset()
protected override void Awake() / OnDestroy()`,
    with: ['`Entity`：对象池化基类', '`NetworkModule`：实体上的同步模块', '`NetworkSpawner`：观察者增删']
},
{
    id: 'm-network-module',
    category: '网络同步',
    title: 'NetworkModule：网络模块',
    excerpt: '挂在实体上的同步单元：SyncVar 脏位、序列化与 RPC 都由模块级路由。',
    source: 'Astraia/Assets/Astraia/Runtime/网络库/实体类/NetworkModule.cs',
    decl: 'public abstract class NetworkModule : Export',
    intro: 'NetworkModule 是具体网络组件的基类。它保存 syncMode 与 syncRate，用 ulong 脏位记录哪些同步变量变化，Serialize/Deserialize 时先写内容长度再调用 IL 织入生成的 SyncVars 方法。',
    duties: ['维护 SyncVar 脏位与节流时间', '序列化时先写长度再写内容', 'GetSyncVarHook/SetSyncVarHook 管理变化回调', 'IsDirty 按 syncRate 决定是否可发送'],
    apis: `public uint objectId => owner.objectId
public bool isOwner / isServer / isClient
public bool isVerify { get; }
public void ClearDirty()
internal void Serialize(MemoryWriter writer, bool isInit)`,
    with: ['`NetworkEntity`：owner 实体', '`NetworkSyncVar`：模块数组批量收发', '`NetworkTransform`/`Player`：具体模块实现']
},
{
    id: 'm-network-singleton',
    category: '网络同步',
    title: 'NetworkSingleton：网络单例模块',
    excerpt: '跨客户端只有一份的网络模块，常用于 SyncManager 这类全局同步服务。',
    source: 'Astraia/Assets/Astraia/Runtime/网络库/实体类/NetworkSingleton.cs',
    decl: 'public class NetworkSingleton<T> : NetworkModule where T : NetworkSingleton<T>',
    intro: 'NetworkSingleton 在 NetworkModule 上叠加单例语义：Instance 只指向唯一实例，Awake 发现重复时销毁多余对象。示例中的 SyncManager 继承它，确保场景里只有一个同步中枢。',
    duties: ['缓存唯一 Instance', '销毁重复实例', '在 OnDestroy 时清空实例引用'],
    apis: `public static T Instance { get; }
protected override void Awake() / OnDestroy()`,
    with: ['`NetworkModule`：基类', '`SyncManager`：示例中的网络单例', '`NetworkEntity`：宿主对象']
},
{
    id: 'm-network-manager',
    category: '网络同步',
    title: 'NetworkManager：联机入口与房间状态',
    excerpt: 'Host/Server/Client/在线大厅四态切换，内部以 Server/Client 两个静态分部组织收发。',
    source: 'Astraia/Assets/Astraia/Runtime/网络库/管理类/NetworkManager.cs',
    decl: 'public sealed partial class NetworkManager : Singleton<NetworkManager>, IDontDestroy',
    intro: 'NetworkManager 是联机模式的统一入口：StartServer/StartClient/StartHost/StartSaloon 切换运行态，RoomName/RoomGuid/RoomMode 描述当前大厅房间；消息收发分别放在 Server 与 Client 两个静态 partial class 中。',
    duties: ['管理 sendRate/maxPlayer/房间字段', '静态暴露 isHost/isServer/isClient/isRunner', '提供 Server/Client/Host/在线大厅 四态启停', '服务器负责 Spawn/Destroy 与对象列表'],
    apis: `public static bool isHost => isServer && isClient
public static void StartServer() / StopServer()
public static void StartClient() / StopClient()
public static void StartHost() / StopHost()
public static void StartSaloon() / StopSaloon()
public static void CreateRoom() / JoinRoom(string address)`,
    with: ['`NetworkSystem`：PlayerLoop 驱动', '`NetworkEntity`：spawns 字典对象', '`NetworkAuthority`：在线大厅传输实现']
},
{
    id: 'm-network-system',
    category: '网络同步',
    title: 'NetworkSystem：网络主循环与节拍',
    excerpt: '把 EarlyUpdate/AfterUpdate 注入 PlayerLoop，网络收发不依赖单个 MonoBehaviour。',
    source: 'Astraia/Assets/Astraia/Runtime/网络库/工具类/NetworkSystem.cs',
    decl: 'public static class NetworkSystem',
    intro: 'NetworkSystem 在 BeforeSceneLoad 时向 Unity PlayerLoop 注册两个回调：EarlyUpdate 驱动服务器/客户端接收，AfterUpdate 处理脏数据与发送；Tick 用 syncStep(1/30) 决定是否到发送节拍。',
    duties: ['运行时修改 PlayerLoop 注册网络阶段', 'Early/After 阶段派发 OnEarlyUpdate/OnAfterUpdate', '以 30Hz 默认节拍计算发送时间', '提供 syncTime/syncStep 供脏数据节流'],
    apis: `internal static double syncStep = 1 / 30F;
internal static double syncTime;
public static bool Tick(ref double sendTime)`,
    with: ['`NetworkManager`：Early/After 更新目标', '`EventManager`：发布全局事件', '`NetworkModule`：syncRate 节流']
},
{
    id: 'm-network-spawner',
    category: '网络同步',
    title: 'NetworkSpawner：网络对象生成与观察者',
    excerpt: '把实体加入/移出客户端观察者列表，首次加入发送完整快照。',
    source: 'Astraia/Assets/Astraia/Runtime/网络库/工具类/NetworkSpawner.cs',
    decl: 'public static class NetworkSpawner',
    intro: 'NetworkSpawner 负责对象级观察者管理：Add 时把实体与客户端双向登记并发送 SpawnMessage(首次 isInit 快照)，Remove 时发送 Despawn 并清理；Clear 处理实体销毁或客户端断开。',
    duties: ['Add：登记观察者并发送生成消息', 'Remove：移除观察者并发送销毁', 'Clear：清理实体全部观察者', '首次加入按 owner/other 选择完整快照'],
    apis: `public static void Add(NetworkEntity entity, NetworkClient client)
public static void Remove(NetworkEntity entity, NetworkClient client)
public static void Clear(NetworkEntity entity)
public static void Clear(NetworkClient client)`,
    with: ['`NetworkEntity`：观察者列表宿主', '`NetworkModule`：ServerSend 快照', '`NetworkManager.Server`：Spawn/Destroy 调用入口']
},
{
    id: 'm-network-transform',
    category: '网络同步',
    title: 'NetworkTransform：网络 Transform 同步',
    excerpt: '把位置/旋转/缩放作为一个 NetworkModule 序列化，并处理插值同步。',
    source: 'Astraia/Assets/Astraia/Runtime/网络库/组件类/NetworkTransform.cs',
    decl: 'public class NetworkTransform : NetworkModule',
    intro: 'NetworkTransform 是通用同步组件：本地端记录自己的 Transform，远端通过 SyncTransform 把服务器/权威端位置写入本地，并做平滑表现。OnSerialize/OnDeserialize 在基类序列化流程中被调用。',
    duties: ['在同步节拍读取/写入 Transform', '区分本机与远端更新路径', 'SyncTransform 提供显式同步入口', '支持位置、旋转与缩放的组合'],
    apis: `public void SyncTransform(Vector3? position, Quaternion? rotation = null, Vector3? mutation = null)
protected override void OnSerialize(MemoryWriter writer, bool isInit)
protected override void OnDeserialize(MemoryReader reader, bool isInit)`,
    with: ['`NetworkModule`：基类', '`PlayerMachine`：示例中使用 SyncTransform', '`NetworkObserver`：可见时同步']
},
{
    id: 'm-network-observer',
    category: '网络同步',
    title: 'NetworkObserver：观察者区域管理',
    excerpt: '以单例维护实体与客户端的位置关系，按 Tick 动态增删观察者。',
    source: 'Astraia/Assets/Astraia/Runtime/网络库/组件类/NetworkObserver.cs',
    decl: 'public class NetworkObserver : Singleton<NetworkObserver>',
    intro: 'NetworkObserver 提供空间上的兴趣管理：实体注册后，每次 Tick 依据自身位置与各客户端位置判断可见集合，调用 NetworkSpawner 让实体只在需要的客户端上生成。',
    duties: ['Register 实体进入区域系统', 'Tick 检测实体与客户端可见性', 'UnRegister 客户端离开时清理', 'Clear 释放全部空间数据'],
    apis: `public void Register(NetworkEntity entity)
public void UnRegister(NetworkClient client)
public void Tick(NetworkEntity entity)
public void Clear()`,
    with: ['`NetworkSpawner`：按结果增删观察者', '`NetworkEntity`：被观察对象', '`Singleton<T>`：区域管理器单例']
},
{
    id: 'm-network-client',
    category: '网络同步',
    title: 'NetworkClient：客户端连接对象',
    excerpt: '服务器视角里“一个连接的客户端”，实体列表与就绪状态都挂在它身上。',
    source: 'Astraia/Assets/Astraia/Runtime/网络库/模块类/NetworkClient.cs',
    decl: 'public sealed class NetworkClient : Connection',
    intro: 'NetworkClient 是服务器端保存的远端客户端：包含 clientId、isReady 与可见实体列表。收到消息后通过 OnData/OnReceive 回调路由给服务器逻辑。',
    duties: ['保存 clientId 与就绪标记', '记录该客户端可见的 NetworkEntity', '实现 Connection 的发送/数据回调', '提供与 int 的隐式转换'],
    apis: `internal int clientId; internal bool isReady;
internal List<NetworkEntity> entities;
public override void Disconnect()
public static implicit operator int(NetworkClient client)`,
    with: ['`Connection`：连接基类', '`NetworkManager.Server`：客户端字典', '`NetworkSpawner`：实体登记']
},
{
    id: 'm-network-server',
    category: '网络同步',
    title: 'NetworkServer：服务器连接对象',
    excerpt: '客户端视角的服务器连接，负责把本端消息发往服务器。',
    source: 'Astraia/Assets/Astraia/Runtime/网络库/模块类/NetworkServer.cs',
    decl: 'public sealed class NetworkServer : Connection',
    intro: 'NetworkServer 是客户端维护的“到服务器的连接”：serverId 标识当前连接，消息经由 SendInternal/DataInternal 发到传输层；NetworkEntity.connection 返回的正是它。',
    duties: ['保存 serverId 与就绪标记', '实现到服务器的发送与接收回调', '连接断开时通知上层'],
    apis: `internal int serverId; internal bool isReady;
public override void Disconnect()
public static implicit operator int(NetworkServer server)`,
    with: ['`Connection`：连接基类', '`NetworkEntity.connection`', '`NetworkManager.Client`：接收服务器消息']
},
{
    id: 'm-network-attribute',
    category: '网络同步',
    title: 'NetworkAttribute：RPC 运行时注册表',
    excerpt: '编译期把方法名散列成消息 id，运行时按 id 查找并校验模块与通道。',
    source: 'Astraia/Assets/Astraia/Runtime/网络库/工具类/NetworkAttribute.cs',
    decl: 'public static class NetworkAttribute',
    intro: 'NetworkAttribute 保存 RPC 方法表：RegisterServerRpc/RegisterClientRpc 把模块类型、通道、方法与散列 id 绑定。Invoke 时先校验 mode 与模块类型，再调用真正的方法，并检测方法名撞 id。',
    duties: ['注册服务器/客户端 RPC 委托', '按 ushort id 查找消息', '校验 mode 与 NetworkModule 类型', '检测并报告消息 id 冲突'],
    apis: `public static void RegisterServerRpc(Type module, int pass, string name, SyncFunc func)
public static void RegisterClientRpc(Type module, int pass, string name, SyncFunc func)
internal static bool Invoke(ushort id, SyncMode mode, NetworkClient client, MemoryReader reader, NetworkModule component)`,
    with: ['`NetworkWeaver`：编译期注册来源', '`Pass`：KCP/UDP/ANY 通道', '`NetworkModule`：RPC 宿主模块']
},
{
    id: 'm-network-syncvar',
    category: '网络同步',
    title: 'NetworkSyncVar：模块批量序列化工具',
    excerpt: '用一个 ulong mask 标记哪些模块需要同步，owner/other 分别写不同集合。',
    source: 'Astraia/Assets/Astraia/Runtime/网络库/工具类/NetworkSyncVar.cs',
    decl: 'internal static class NetworkSyncVar',
    intro: 'NetworkSyncVar 定义模块数组的批量收发：服务器端把“只给 owner”的模块与“所有人可见”的模块分别写进 owner/other 两个 writer；客户端按收到的 mask 反序列化对应模块。',
    duties: ['ServerSend 按 mask 批量序列化', 'ClientReceive 按 mask 批量反序列化', 'ClientSend 只提交 owner 的客户端模式模块', 'ServerReceive 校验模块模式'],
    apis: `public static void ServerSend(this NetworkModule[] modules, MemoryWriter owner, MemoryWriter other, bool isInit = false)
public static void ClientReceive(this NetworkModule[] modules, MemoryReader reader, bool isInit = false)
public static void ClientSend(this NetworkModule[] modules, MemoryWriter writer, bool isOwner)`,
    with: ['`NetworkModule`：模块数组', '`MemoryWriter`/`MemoryReader`：字节流', '`NetworkSpawner`：首次同步调用 ServerSend(isInit)']
},
{
    id: 'm-network-discovery',
    category: '网络同步',
    title: 'NetworkDiscovery：局域网发现',
    excerpt: '单例封装 UDP 广播发现，让客户端能在局域网里找到可加入的服务器。',
    source: 'Astraia/Assets/Astraia/Runtime/网络库/组件类/NetworkDiscovery.cs',
    decl: 'public class NetworkDiscovery : Singleton<NetworkDiscovery>',
    intro: 'NetworkDiscovery 提供 StartDiscovery/StopDiscovery 入口，在局域网内广播服务器信息并监听回应，适合测试或小型联机场景快速建主。',
    duties: ['启动/停止局域网发现', '广播与监听服务器响应', '作为单例常驻场景'],
    apis: `public void StartDiscovery()
public void StopDiscovery()`,
    with: ['`Singleton<T>`：单例', '`NetworkManager`：发现后发起连接']
}
);
