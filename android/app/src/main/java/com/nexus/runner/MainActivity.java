package com.nexus.runner;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.nexus.runner.plugins.PinnedShortcutsPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Register custom plugins
        registerPlugin(PinnedShortcutsPlugin.class);
    }
}
