<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1HqfhlTHWNRQ3-8l2wLXcqiG_86KoWVld

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Android 深链与桌面快捷方式

要让“添加到桌面”图标一键直达项目，需在 Android 宿主（Capacitor）侧完成以下配置：

1) Manifest 深链声明（`android/app/src/main/AndroidManifest.xml`）
```xml
<activity android:name="com.getcapacitor.BridgeActivity" ...>
   <intent-filter>
      <action android:name="android.intent.action.VIEW" />
      <category android:name="android.intent.category.DEFAULT" />
      <category android:name="android.intent.category.BROWSABLE" />
      <data android:scheme="nexus" android:host="run" />
   </intent-filter>
   <!-- 可选：兼容 https://your.domain/run?id=xxx 的形式 -->
   <!--
   <intent-filter>
      <action android:name="android.intent.action.VIEW" />
      <category android:name="android.intent.category.DEFAULT" />
      <category android:name="android.intent.category.BROWSABLE" />
      <data android:scheme="https" android:host="your.domain" android:pathPrefix="/run" />
   </intent-filter>
   -->
</activity>
```

2) 自定义插件 `PinnedShortcuts`
- 需要一个 Capacitor 原生插件，内部用 `ShortcutManager` 动态创建快捷方式，Intent 指向 `Intent.ACTION_VIEW` + `Uri.parse("nexus://run?id=xxx")`，目标 Activity 是 `BridgeActivity`。
- JS 侧已调用 `PinnedShortcuts.pin({ id, shortLabel, longLabel, icon: 'ic_launcher', intent })`，请确保插件导出 `pin` 方法并在 Android 端注册。

3) 测试流程
- 在 App 内点击“添加到桌面”，系统应弹出确认；
- 桌面图标点击后应冷启动 App 并直接打开对应项目；
- 若项目被删除，应提示未找到并回到仪表盘；
- 离线/后台状态下重复测试，确认参数解析正常。
