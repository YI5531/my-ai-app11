package com.nexus.runner;

import android.os.Bundle;
import android.content.Intent; // 👈 必须引用，用于处理快捷方式的跳转指令
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // 这里不需要写太多代码，Capacitor 会自动处理初始化
    }

    /**
     * ✅ 核心修改：处理 Deep Link (快捷方式)
     * 当你的 App 已经在后台放歌或者运行时，如果用户点击了桌面的“固定快捷方式”，
     * Android 会调用这个方法。
     * 我们必须调用 super.onNewIntent(intent) 让 Capacitor 接收到这个 nexus:// 链接，
     * 这样你的 Web 端才能监听到并进行跳转。
     */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
    }
}