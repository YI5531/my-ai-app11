# 📦 Nexus Runner Mobile - 构建指南

## 前提条件

### 必需软件
- **Node.js** 18+ 和 npm
- **Android Studio** (最新稳定版)
- **JDK** 17 或更高版本
- **Capacitor CLI** 7.x

### Android 环境配置
1. 安装 [Android Studio](https://developer.android.com/studio)
2. 配置环境变量:
   ```bash
   ANDROID_HOME=C:\Users\你的用户名\AppData\Local\Android\Sdk
   JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
   ```
3. 在 Android Studio 中安装:
   - Android SDK Platform 34
   - Android SDK Build-Tools 34.0.0
   - Android Emulator (可选，用于测试)

---

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 同步 Capacitor (首次运行)
```bash
npx cap sync android
```
这会：
- 复制 Web 资源到 Android 项目
- 同步原生插件
- 更新配置

### 3. 在浏览器中测试 (可选)
```bash
npm run dev
```
访问 `http://localhost:3000` 查看 Web 版本

---

## 📱 构建 Android APK

### 方法 1: 使用 Android Studio (推荐)
```bash
# 打开 Android Studio
npx cap open android
```
然后在 Android Studio 中:
1. 等待 Gradle 同步完成
2. 点击 **Build > Build Bundle(s) / APK(s) > Build APK(s)**
3. APK 生成位置: `android/app/build/outputs/apk/debug/app-debug.apk`

### 方法 2: 命令行构建
```bash
cd android
./gradlew assembleDebug
```
APK 输出: `android/app/build/outputs/apk/debug/app-debug.apk`

### 构建发布版 (签名 APK)
```bash
cd android
./gradlew assembleRelease
```
⚠️ 需要先配置签名密钥 (见下文)

---

## 🔐 配置 APK 签名 (发布版)

### 1. 生成密钥库
```bash
keytool -genkey -v -keystore nexus-release.keystore -alias nexus -keyalg RSA -keysize 2048 -validity 10000
```

### 2. 配置 Gradle
在 `android/app/build.gradle` 中添加:
```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file("nexus-release.keystore")
            storePassword "你的密码"
            keyAlias "nexus"
            keyPassword "你的密码"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 3. 构建签名 APK
```bash
cd android
./gradlew assembleRelease
```

---

## 🧪 在设备/模拟器上运行

### 使用 Android Studio
1. 连接设备或启动模拟器
2. 点击绿色 ▶️ 按钮运行

### 使用命令行
```bash
npx cap run android
```

---

## 🔄 开发流程

### 修改代码后同步
```bash
# 1. 构建 Web 资源
npm run build

# 2. 同步到 Android
npx cap sync android

# 3. (可选) 仅复制 Web 资源
npx cap copy android
```

### 实时预览 (Web)
```bash
npm run dev
```
在浏览器中开发，完成后再打包到 Android

---

## 📂 项目结构

```
nexus-runner-mobile/
├── android/                    # Android 原生项目
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml
│   │   │   ├── java/com/nexus/runner/
│   │   │   │   ├── MainActivity.java
│   │   │   │   └── plugins/
│   │   │   │       └── PinnedShortcutsPlugin.java
│   │   │   └── res/
│   │   └── build.gradle
│   └── build.gradle
├── components/                 # React 组件
├── services/                   # 业务逻辑
├── App.tsx                     # 主应用
├── capacitor.config.ts         # Capacitor 配置
└── package.json
```

---

## 🐛 常见问题

### 1. Gradle 同步失败
```bash
cd android
./gradlew clean
```
然后在 Android Studio 中点击 **File > Invalidate Caches / Restart**

### 2. 依赖版本冲突
确保 `android/variables.gradle` 中的版本号与项目兼容

### 3. 插件未注册
检查 `MainActivity.java` 中是否调用了 `registerPlugin(PinnedShortcutsPlugin.class)`

### 4. Deep Link 不工作
- 确认 `AndroidManifest.xml` 中配置了 `<intent-filter>`
- 测试命令: `adb shell am start -a android.intent.action.VIEW -d "nexus://run?id=test123" com.nexus.runner`

### 5. 存储权限问题
Android 13+ 使用了新的权限模型，已在 `AndroidManifest.xml` 中配置

---

## 📦 构建优化

### 缩小 APK 体积
在 `android/app/build.gradle` 中启用:
```gradle
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
    }
}
```

### 多架构支持
默认支持: `armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64`

仅构建 ARM64 (减小体积):
```gradle
defaultConfig {
    ndk {
        abiFilters 'arm64-v8a'
    }
}
```

---

## 🔧 自定义配置

### 修改应用名称
编辑 `android/app/src/main/res/values/strings.xml`:
```xml
<string name="app_name">你的应用名</string>
```

### 修改包名
1. 编辑 `capacitor.config.ts`:
   ```typescript
   appId: 'com.yourcompany.yourapp'
   ```
2. 运行: `npx cap sync`

### 修改主题色
编辑 `android/app/src/main/res/values/colors.xml`

---

## 📚 相关文档

- [Capacitor 官方文档](https://capacitorjs.com/docs)
- [Android 开发者指南](https://developer.android.com/guide)
- [Gradle 构建配置](https://developer.android.com/studio/build)

---

## 💡 提示

- 首次构建需要下载依赖，可能需要 5-10 分钟
- 推荐使用真机测试完整功能 (Deep Link、Pinned Shortcuts)
- 使用 `adb logcat` 查看运行时日志
- 发布前务必测试所有导入方式 (ZIP、URL、单文件)

---

**构建成功后，APK 可以直接安装到 Android 设备上使用！🎉**
