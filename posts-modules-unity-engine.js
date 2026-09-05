// posts-modules-unity-engine.js - Astraia(Unity 引擎库)核心类逐一拆解
window.moduleMeta = window.moduleMeta || [];

window.moduleMeta.push(
{
    id: 'm-singleton',
    category: '框架基建',
    title: 'Singleton：泛型单例基类',
    excerpt: 'Export + 静态 Instance，支持 IDontDestroy 跨场景存活。',
    source: 'Astraia/Assets/Astraia/Runtime/引擎库/模块类/Singleton.cs',
    decl: 'public abstract class Singleton<T> : Export where T : Singleton<T>',
    intro: 'Singleton 让每个管理器以 Export 形式挂在场景里，同时通过 Instance 访问。Awake 时处理重复实例并销毁多余对象，实现 IDontDestroy 则挂到 DontDestroyOnLoad。',
    duties: ['缓存并暴露静态 Instance', '销毁重复实例', 'IDontDestroy 时跨场景保留', 'OnDestroy 清空实例引用'],
    apis: `public static T Instance { get; }
protected override void Awake()
protected override void OnDestroy()`,
    with: ['`Export`：生命周期基类', '`IDontDestroy`：跨场景标记', '`UIManager`/`PoolManager`/`SoundManager` 等管理器都继承它']
},
{
    id: 'm-export',
    category: '框架基建',
    title: 'Export：MonoBehaviour 生命周期基类',
    excerpt: '把 Awake/OnEnable/OnDisable/OnDestroy 变成可继承模板，让代码生成器有统一织入点。',
    source: 'Astraia/Assets/Astraia/Runtime/引擎库/模块类/Entity.cs',
    decl: 'public abstract class Export : MonoBehaviour',
    intro: 'Export 是 Astraia 游戏脚本的统一基类：它把四个常用生命周期声明为 protected virtual。IL 织入的 EntityGenerator 会为所有 Export 派生类补齐 Export 字段与事件绑定。',
    duties: ['统一 Awake/OnEnable/OnDisable/OnDestroy 生命周期', '为 ExportManager 的自动绑定提供入口', '让代码生成器识别“需要织入的组件”'],
    apis: `protected virtual void Awake()
protected virtual void OnEnable()
protected virtual void OnDisable()
protected virtual void OnDestroy()`,
    with: ['`Entity`：Export 的实体扩展', '`Singleton<T>`：单例管理器基类', '`UIPanel`：UI 面板基类']
},
{
    id: 'm-entity',
    category: '框架基建',
    title: 'Entity：模块化实体',
    excerpt: '组件启动/销毁时按顺序执行 IDequeue/IEnqueue，统一对象出入池时机。',
    source: 'Astraia/Assets/Astraia/Runtime/引擎库/模块类/Entity.cs',
    decl: 'public class Entity : Export',
    intro: 'Entity 在 Awake 时正向遍历组件执行 IDequeue，OnDestroy 时反向执行 IEnqueue。这让对象池的取出/归还顺序与组件挂载顺序一致，避免模块互相依赖时的时序问题。',
    duties: ['Awake 收集 IDequeue 模块并依次 Dequeue', 'OnDestroy 倒序 Enqueue 所有模块', '作为网络实体的基类'],
    apis: `public class Entity : Export {
    protected override void Awake()   // 正序执行 IDequeue
    protected override void OnDestroy() // 倒序执行 IEnqueue
}`,
    with: ['`Export`：基类', '`IDequeue`/`IEnqueue`：池化接口', '`NetworkEntity`：网络端实体继承 Entity']
},
{
    id: 'm-ui-panel',
    category: '框架基建',
    title: 'UIPanel：UI 面板基类',
    excerpt: '普通面板与泛型列表面板：虚方法控制显隐，泛型版内置滚动复用。',
    source: 'Astraia/Assets/Astraia/Runtime/引擎库/模块类/UIPanel.cs',
    decl: 'public abstract class UIPanel : Export',
    intro: 'UIPanel 是界面单位的基类：ShowInternal/HideInternal 触发 OnShow/OnHide。泛型版本 UIPanel<T, TGrid> 面向列表，内部用 IGrid 网格与滚动容器管理数据的复用与位移。',
    duties: ['为每个面板提供 Show/Hide 状态入口', '泛型版管理 T 数据与 TGrid 格子一一绑定', '支持网格布局下的旋转、选中与移动', '与 ExportManager 配合自动绑定 ScrollRect'],
    apis: `public abstract class UIPanel : Export { public int state; }
public abstract class UIPanel<T, TGrid> : UIPanel, IMove {
    public void SetItem(params T[] item)
    public void SetItem(IList<T> item)
    public void Move(int index, MoveDirection move)
}`,
    with: ['`UIManager`：按层与栈管理面板', '`ExportManager`：绑定 Button/ScrollRect 等控件', '`IGrid<T>`/`IMove`：列表格子接口']
},
{
    id: 'm-ui-manager',
    category: '框架基建',
    title: 'UIManager：UI 面板管理器',
    excerpt: '按状态分层、以栈保存显示历史，Show/Find/Hide 都走泛型入口。',
    source: 'Astraia/Assets/Astraia/Runtime/引擎库/管理类/UIManager.cs',
    decl: 'public class UIManager : Singleton<UIManager>, IDontDestroy',
    intro: 'UIManager 在 Awake 时扫描层下所有 UIPanel，把面板按 state 组织成 UIStack。Show 会处理同状态面板的推栈与遮罩，Hide 返回上一层。',
    duties: ['为每个 state 维护独立 UIStack', 'Show/Find/Hide 支持泛型与 Type 两种入口', 'Modified 处理遮罩、显隐与层级顺序', 'Hide(int value) 可整层关闭'],
    apis: `public static T Show<T>() where T : UIPanel
public static T Find<T>() where T : UIPanel
public static void Hide<T>() where T : UIPanel
public static void Hide(int value)`,
    with: ['`UIPanel`：被管理对象', '`Singleton<T>`：单例实现', '`UIMaskAttribute`：遮罩状态配置']
},
{
    id: 'm-asset-manager',
    category: '框架基建',
    title: 'AssetManager：资源加载与版本管理',
    excerpt: '统一 Assets/Scenes/Prefabs 约定路径与 AssetBundle 版本，支持模拟加载与真实远端更新。',
    source: 'Astraia/Assets/Astraia/Runtime/引擎库/管理类/AssetManager.cs',
    decl: 'public static partial class AssetManager',
    intro: 'AssetManager 管理 AssetBundle 清单、场景切换与资源缓存。BatchManager 是它的另一 partial 部分，负责启动时比较 StreamingAssets、PersistentData 与远端三份 manifest。',
    duties: ['按约定路径加载资源并缓存 AssetData', 'LoadScene 统一走场景加载流程并派发事件', '通过 AssetBundleManifest 做版本校验', 'UseSimulate 时跳过 Bundle 直接读工程资源'],
    apis: `public static T Load<T>(string path) where T : Object
public static void Update()                 // BatchManager partial
public static event Action<int> OnLoadAsset;
public static event Action<string> OnLoadScene;`,
    with: ['`GlobalSetting`：路径/版本/远端配置', '`BatchManager`：资源批更新 partial', '`PoolManager`：池内 Prefab 从这里装载']
},
{
    id: 'm-pool-manager',
    category: '框架基建',
    title: 'PoolManager：预制体对象池',
    excerpt: 'Show<T> 按路径取出并激活，Hide 归还，effect/弹窗类对象不用手动销毁。',
    source: 'Astraia/Assets/Astraia/Runtime/引擎库/管理类/PoolManager.cs',
    decl: 'public class PoolManager : Singleton<PoolManager>, IDontDestroy',
    intro: 'PoolManager 按 Prefab 路径建立独立池。Show 时会先装载预制体再取实例，支持设置父节点、位置、朝向与自动回收 cooldown；Hide 把对象放回池而不是 Destroy。',
    duties: ['为每个 path 维护独立 Pool', 'Show<T>/Hide<T> 提供泛型组件访问', 'cooldown 参数让对象到期自动回收', '记录池对象 Type/Path 与进出计数'],
    apis: `public static T Show<T>(string path) where T : Component
public static T Show<T>(string path, Vector3 position)
public static void Hide<T>(T item) where T : Component
public static GameObject Show(string path, float cooldown)`,
    with: ['`AssetManager`：加载池资源', '`Player`：示例里特效通过 PoolManager.Show', '`Tween`：等待动画结束再 Hide']
},
{
    id: 'm-json-manager',
    category: '框架基建',
    title: 'JsonManager：存档读写与加密',
    excerpt: '统一的 Save/Load 入口，并支持 Encrypt/Decrypt 写加密存档。',
    source: 'Astraia/Assets/Astraia/Runtime/引擎库/管理类/JsonManager.cs',
    decl: 'public static class JsonManager',
    intro: 'JsonManager 把对象序列化到本地文件。Load 在文件不存在时先创建默认存档，Encrypt/Decrypt 则处理加密版本；SoundManager 的音量就是用它持久化的。',
    duties: ['Save<T>/Load<T> 通用泛型存取', 'Load 不存在时写入默认值', 'Encrypt/Decrypt 保存与读取加密存档', 'LoadPath 统一文件存放目录'],
    apis: `public static void Save<T>(T data, string name)
public static void Load<T>(T data, string name)
public static T Load<T>(string name, T data = default)
public static void Encrypt<T>(T data, string name)
public static T Decrypt<T>(string name, T data = default)`,
    with: ['`SoundManager`：音量持久化', '存档/设置类业务', 'UnityEngine.JsonUtility 之上的封装']
},
{
    id: 'm-sound-manager',
    category: '框架基建',
    title: 'SoundManager：音频管理器',
    excerpt: '音乐与音效双通道，音量持久化，按约定路径播放音频。',
    source: 'Astraia/Assets/Astraia/Runtime/引擎库/管理类/SoundManager.cs',
    decl: 'public class SoundManager : Singleton<SoundManager>, IDontDestroy',
    intro: 'SoundManager 把音频分成 BGM 与音效两个通道：音量修改立即作用到所有源并保存到本地，Play/Pause/Stop 提供全局控制。',
    duties: ['MusicVolume/AudioVolume 属性自动持久化', 'Play/Pause/Stop 控制单个或全部音频', 'Load/Loop 按约定路径加载 AudioSource'],
    apis: `public int MusicVolume { get; set; }
public int AudioVolume { get; set; }
public static void Play(string name)
public static AudioSource Load(string name)
public static AudioSource Loop(string name)
public static void PlayAll() / StopAll()`,
    with: ['`Singleton<T>`：单例基类', '`JsonManager`：音量存档', '`AudioSource` 对象池中的复用']
},
{
    id: 'm-export-manager',
    category: '框架基建',
    title: 'ExportManager：字段与方法自动绑定',
    excerpt: '按子物体名字填充组件字段，并把 Button/Toggle/Slider/InputField 事件绑到同名方法。',
    source: 'Astraia/Assets/Astraia/Runtime/引擎库/管理类/ExportManager.cs',
    decl: 'public static class ExportManager',
    intro: 'ExportManager 的 Export<T>(owner, name) 会按名字查找子物体组件，并通过反射找到 owner 上的同名方法。发现 Button 就 AddListener、Toggle/Slider/InputField 也按各自事件签名绑定。',
    duties: ['按名字定位子物体组件', '把方法名与 Button/Toggle/Slider/InputField 事件连接', '面板 enabled 时才响应 UI 事件', '避免手动连线与大量 GetComponent 样板'],
    apis: `public static T Export<T>(Component owner, string name) where T : Component
private static bool Button<T>(Component obj, T component, MethodInfo method)
private static bool Toggle<T>(...)
private static bool Slider<T>(...)
private static void InputField<T>(...)`,
    with: ['`Export` 字段声明：[Export] public PlayerAction Action;', '`UIPanel`：面板自动绑定控件', '`Search`：方法反射查找']
},
{
    id: 'm-data-manager',
    category: '框架基建',
    title: 'DataManager：数据表运行时查询',
    excerpt: '按主键索引 IData 表，主键类型支持 int/Enum/string。',
    source: 'Astraia/Assets/Astraia/Runtime/引擎库/管理类/DataManager.cs',
    decl: 'public static class DataManager',
    intro: 'DataManager 在 LoadDataTable 时找出所有 IDataTable，读取 [Primary] 属性建索引；运行时 Get<T>(key) 按主键返回对应 IData 结构体，GetTable<T> 返回整张表。',
    duties: ['加载并缓存每张数据表', 'int/Enum/string 三种主键查询', 'GetTable 返回整表列表', 'Dispose 清理数据库'],
    apis: `public static void LoadDataTable()
public static T Get<T>(int key) where T : struct, IData
public static T Get<T>(Enum key) where T : struct, IData
public static T Get<T>(string key) where T : struct, IData
public static List<T> GetTable<T>() where T : struct, IData`,
    with: ['`IDataTable`：表格实现接口', '`PrimaryAttribute`：主键标记', '`AssetManager`：ScriptableObject 装载']
},
{
    id: 'm-global-manager',
    category: '框架基建',
    title: 'GlobalManager：全局生命周期入口',
    excerpt: '默认执行序 -100，把 Unity 的 Update/FixedUpdate 桥接到核心 TimeManager。',
    source: 'Astraia/Assets/Astraia/Runtime/引擎库/全局类/GlobalManager.cs',
    decl: 'public class GlobalManager : Singleton<GlobalManager>, IDontDestroy',
    intro: 'GlobalManager 在场景加载前初始化日志与敏感词表，Start 触发资源更新，之后每帧把 Unity 的渲染/物理时间转发给 TimeManager；销毁时统一释放堆池、事件池与资源。',
    duties: ['RuntimeInitializeOnLoad 预初始化 Log 与 Bad', 'Start 启动 AssetManager 更新', 'Update/FixedUpdate 驱动 TimeManager', 'OnDestroy 统一 Dispose 核心管理器'],
    apis: `[DefaultExecutionOrder(-100)] public class GlobalManager : Singleton<GlobalManager>, IDontDestroy {
    private void Start()      // AssetManager.Update()
    private void Update()     // TimeManager.RenderUpdate(Time.time)
    private void FixedUpdate()// TimeManager.PhysicUpdate(Time.fixedTime)
}`,
    with: ['`Singleton<T>`：单例', '`TimeManager`：时间桥接', '`AssetManager`：资源更新', '`Log`/`Bad`：启动初始化']
}
);
