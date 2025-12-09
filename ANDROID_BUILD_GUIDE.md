# Nexus Runner Mobile - Android 构建指南

## 🚀 快速开始

### 前置要求

1. **Node.js** (v18+)
2. **Android Studio** (最新稳定版)
3. **JDK 17** (推荐使用 Android Studio 自带的 JDK)

### 安装步骤

#### 1. 安装依赖
```bash
npm install
```

#### 2. 构建 Web 资源
```bash
npm run build
```

#### 3. 同步 Capacitor
```bash
npx cap sync android
```

#### 4. 在 Android Studio 中打开项目
```bash
npx cap open android
```

#### 5. 构建 APK
在 Android Studio 中:
- 选择 `Build > Build Bundle(s) / APK(s) > Build APK(s)`
- 或者使用命令行:
```bash
cd android
./gradlew assembleDebug
```

生成的 APK 位于: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 📋 权限说明

### 核心权限（必需）
- **INTERNET**: 加载 Web 应用和外部链接
- **VIBRATE**: 触觉反馈
- **WAKE_LOCK**: 防止游戏/视频播放时息屏
- **ACCESS_NETWORK_STATE**: 检测网络状态

### 导入应用可能需要的权限（可选）
- **CAMERA** / **RECORD_AUDIO**: 相机和麦克风访问
- **ACCESS_FINE_LOCATION**: GPS 定位
- **READ_MEDIA_*** (Android 13+): 读取媒体文件

这些权限在 `AndroidManifest.xml` 中已声明，应用运行时会动态请求。

---

## 🔗 Deep Link 配置

应用已配置 `nexus://run?id=xxx` 深链支持，用于桌面快捷方式。

### 测试深链
```bash
adb shell am start -a android.intent.action.VIEW -d "nexus://run?id=test-project-id" com.nexus.runner
```

### HTTPS 深链（可选）
如果需要支持 `https://yourdomain.com/run?id=xxx` 格式:

1. 在 `AndroidManifest.xml` 中取消注释 HTTPS intent-filter
2. 配置 Digital Asset Links (需要服务器配置)

---

## 🖼️ 应用图标和启动屏

### 生成图标
1. 准备 1024x1024 PNG 图标
2. 使用 [Image Asset Studio](https://developer.android.com/studio/write/image-asset-studio) 生成所有尺寸
3. 放置到 `android/app/src/main/res/mipmap-*/`

### 自定义启动屏
编辑 `android/app/src/main/res/drawable/splash.xml` 和 `colors.xml`

---

## 🔧 常见问题

### 1. Gradle 构建失败
```bash
cd android
./gradlew clean
./gradlew build
```

### 2. 插件未注册
确保 `MainActivity.java` 中已调用:
```java
registerPlugin(PinnedShortcutsPlugin.class);
```

### 3. 深链不工作
- 检查 `AndroidManifest.xml` 中的 intent-filter
- 确认 scheme 和 host 正确
- 重新安装 APK

### 4. 文件系统权限错误
Android 13+ 需要新的权限模型:
```xml
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
```

---

## 📦 发布到 Google Play

### 1. 生成签名密钥
```bash
keytool -genkey -v -keystore nexus-release.keystore -alias nexus -keyalg RSA -keysize 2048 -validity 10000
```

### 2. 配置签名
在 `android/app/build.gradle` 中添加:
```gradle
android {
    signingConfigs {
        release {
            storeFile file('nexus-release.keystore')
            storePassword 'YOUR_PASSWORD'
            keyAlias 'nexus'
            keyPassword 'YOUR_PASSWORD'
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

### 3. 构建 Release AAB
```bash
cd android
./gradlew bundleRelease
```

输出: `android/app/build/outputs/bundle/release/app-release.aab`

---

## 🛠️ 自定义插件开发

### 添加新插件

1. 创建 Java 类:
```java
@CapacitorPlugin(name = "MyPlugin")
public class MyPlugin extends Plugin {
    @PluginMethod
    public void myMethod(PluginCall call) {
        // Implementation
        call.resolve();
    }
}
```

2. 在 `MainActivity.java` 中注册:
```java
registerPlugin(MyPlugin.class);
```

3. TypeScript 接口:
```typescript
import { registerPlugin } from '@capacitor/core';

interface MyPluginInterface {
  myMethod(): Promise<void>;
}

const MyPlugin = registerPlugin<MyPluginInterface>('MyPlugin');
```

---

## 📚 更多资源

- [Capacitor 文档](https://capacitorjs.com/docs)
- [Android 开发者指南](https://developer.android.com)
- [Gradle 构建工具](https://gradle.org)
- [Android App Bundle](https://developer.android.com/guide/app-bundle)

---

## ⚠️ 注意事项

1. **首次构建**可能需要下载大量依赖，请确保网络通畅
2. **JDK 版本**必须是 17，否则可能编译失败
3. **最低 Android 版本** 为 7.0 (API 24)
4. **目标 Android 版本** 为 14 (API 34)
5. **桌面快捷方式**功能需要 Android 8.0+ (API 26)

---

## 🐛 调试技巧

### Chrome DevTools 远程调试
1. 在 Chrome 中打开 `chrome://inspect`
2. 连接设备后选择 WebView
3. 可以调试 HTML/CSS/JS

### Android Studio Logcat
查看原生层日志:
```bash
adb logcat | grep -i nexus
```

### 抓包调试
使用 Charles Proxy 或 Fiddler 抓取 HTTP/HTTPS 请求
