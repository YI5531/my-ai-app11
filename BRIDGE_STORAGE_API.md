# Nexus Bridge Storage API

导入的 Web 应用可以使用宿主提供的 `window.NexusStorage` API 来持久化数据到原生文件系统，避免 WebView 缓存清理导致数据丢失。

## API 说明

### `NexusStorage.set(key, value)`
存储数据到原生文件系统。
- **参数**:
  - `key` (string): 存储键名
  - `value` (any): 任意可 JSON 序列化的值
- **返回**: `Promise<void>`

```javascript
await window.NexusStorage.set('playerScore', { score: 1000, level: 5 });
```

### `NexusStorage.get(key)`
读取存储的数据。
- **参数**:
  - `key` (string): 存储键名
- **返回**: `Promise<any>` - 返回存储的值，不存在时返回 `null`

```javascript
const data = await window.NexusStorage.get('playerScore');
console.log(data); // { score: 1000, level: 5 }
```

### `NexusStorage.remove(key)`
删除指定键的数据。
- **参数**:
  - `key` (string): 存储键名
- **返回**: `Promise<void>`

```javascript
await window.NexusStorage.remove('playerScore');
```

### `NexusStorage.clear()`
清空当前应用的所有存储数据。
- **返回**: `Promise<void>`

```javascript
await window.NexusStorage.clear();
```

### `NexusStorage.keys()`
获取当前应用所有存储键名。
- **返回**: `Promise<string[]>`

```javascript
const keys = await window.NexusStorage.keys();
console.log(keys); // ['playerScore', 'settings', ...]
```

## 使用示例

### 游戏存档
```javascript
// 保存游戏进度
async function saveGame(gameState) {
  try {
    await window.NexusStorage.set('saveData', {
      level: gameState.level,
      health: gameState.health,
      inventory: gameState.inventory,
      timestamp: Date.now()
    });
    console.log('游戏已保存');
  } catch (e) {
    console.error('保存失败', e);
  }
}

// 加载游戏进度
async function loadGame() {
  try {
    const saveData = await window.NexusStorage.get('saveData');
    if (saveData) {
      return saveData;
    } else {
      return createNewGame();
    }
  } catch (e) {
    console.error('加载失败', e);
    return createNewGame();
  }
}
```

### 应用设置
```javascript
// 保存用户设置
await window.NexusStorage.set('settings', {
  volume: 0.8,
  difficulty: 'hard',
  theme: 'dark'
});

// 读取设置
const settings = await window.NexusStorage.get('settings') || {
  volume: 1.0,
  difficulty: 'normal',
  theme: 'light'
};
```

### 列表数据
```javascript
// 保存任务列表
await window.NexusStorage.set('todos', [
  { id: 1, text: '学习 Nexus API', done: true },
  { id: 2, text: '完成项目', done: false }
]);

// 读取并更新
const todos = await window.NexusStorage.get('todos') || [];
todos.push({ id: 3, text: '新任务', done: false });
await window.NexusStorage.set('todos', todos);
```

## 注意事项

1. **仅限 JSON 数据**：存储的值必须可被 `JSON.stringify` 序列化，不能存储函数、循环引用等。
2. **异步操作**：所有 API 都返回 Promise，需使用 `await` 或 `.then()`。
3. **键名唯一**：同名 key 会覆盖之前的值。
4. **数据隔离**：每个导入的应用拥有独立的存储空间，互不干扰。
5. **持久化保证**：数据存储在原生文件系统，即使 WebView 缓存清理也不会丢失；仅在卸载 APK 时删除。

## 兼容性

如果在浏览器环境（非 APK）中运行，可以提供降级方案：

```javascript
// 检测 NexusStorage 是否可用
if (window.NexusStorage) {
  // 使用原生存储
  await window.NexusStorage.set('key', 'value');
} else {
  // 降级到 localStorage
  localStorage.setItem('key', JSON.stringify('value'));
}
```
