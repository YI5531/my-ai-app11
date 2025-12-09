package com.nexus.runner;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.nexus.runner.plugins.PinnedShortcutsPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PinnedShortcutsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
