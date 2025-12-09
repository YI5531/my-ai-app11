package com.nexus.runner.plugins;

import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.ShortcutInfo;
import android.content.pm.ShortcutManager;
import android.graphics.drawable.Icon;
import android.net.Uri;
import android.os.Build;

import androidx.annotation.RequiresApi;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * PinnedShortcuts Plugin
 * Allows creating pinned shortcuts on Android home screen
 * Requires Android 8.0 (API 26) or higher
 */
@CapacitorPlugin(name = "PinnedShortcuts")
public class PinnedShortcutsPlugin extends Plugin {

    @PluginMethod
    public void pin(PluginCall call) {
        // Check Android version (Pinned shortcuts require API 26+)
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            call.reject("Pinned shortcuts require Android 8.0 or higher");
            return;
        }

        // Get parameters from JS
        String id = call.getString("id");
        String shortLabel = call.getString("shortLabel");
        String longLabel = call.getString("longLabel");
        String icon = call.getString("icon", "ic_launcher"); // Default icon
        String intentUri = call.getString("intent");

        // Validate required parameters
        if (id == null || shortLabel == null || intentUri == null) {
            call.reject("Missing required parameters: id, shortLabel, intent");
            return;
        }

        try {
            createPinnedShortcut(id, shortLabel, longLabel, icon, intentUri);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to create shortcut: " + e.getMessage(), e);
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.O)
    private void createPinnedShortcut(String id, String shortLabel, String longLabel, String iconName, String intentUri) {
        ShortcutManager shortcutManager = getContext().getSystemService(ShortcutManager.class);

        if (shortcutManager == null) {
            throw new RuntimeException("ShortcutManager not available");
        }

        // Check if pinned shortcuts are supported
        if (!shortcutManager.isRequestPinShortcutSupported()) {
            throw new RuntimeException("Device does not support pinned shortcuts");
        }

        // Parse the intent URI (e.g., "nexus://run?id=xxx")
        Intent shortcutIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(intentUri));
        shortcutIntent.setPackage(getContext().getPackageName());
        shortcutIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);

        // Get icon resource ID
        int iconResId = getContext().getResources().getIdentifier(
                iconName,
                "mipmap",
                getContext().getPackageName()
        );

        // Fallback to default launcher icon if not found
        if (iconResId == 0) {
            iconResId = getContext().getResources().getIdentifier(
                    "ic_launcher",
                    "mipmap",
                    getContext().getPackageName()
            );
        }

        Icon shortcutIcon = Icon.createWithResource(getContext(), iconResId);

        // Build the shortcut
        ShortcutInfo.Builder builder = new ShortcutInfo.Builder(getContext(), id)
                .setShortLabel(shortLabel)
                .setIcon(shortcutIcon)
                .setIntent(shortcutIntent);

        // Set long label if provided
        if (longLabel != null && !longLabel.isEmpty()) {
            builder.setLongLabel(longLabel);
        }

        ShortcutInfo shortcut = builder.build();

        // Create the PendingIntent for the system callback
        Intent pinnedShortcutCallbackIntent = shortcutManager.createShortcutResultIntent(shortcut);
        PendingIntent successCallback = PendingIntent.getBroadcast(
                getContext(),
                0,
                pinnedShortcutCallbackIntent,
                PendingIntent.FLAG_IMMUTABLE
        );

        // Request to pin the shortcut
        shortcutManager.requestPinShortcut(shortcut, successCallback.getIntentSender());
    }

    @PluginMethod
    public void isSupported(PluginCall call) {
        JSObject ret = new JSObject();
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ShortcutManager shortcutManager = getContext().getSystemService(ShortcutManager.class);
            boolean supported = shortcutManager != null && shortcutManager.isRequestPinShortcutSupported();
            ret.put("supported", supported);
        } else {
            ret.put("supported", false);
        }
        
        call.resolve(ret);
    }
}
