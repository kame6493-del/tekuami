package jp.tekuami.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** src/platform/widget.ts の TekuamiWidget の Android 側。アプリが読んだ歩数をウィジェットへ渡す */
@CapacitorPlugin(name = "TekuamiWidget")
public class TekuamiWidgetPlugin extends Plugin {

    @PluginMethod
    public void setSnapshot(PluginCall call) {
        String json = call.getString("json");
        if (json == null) {
            call.reject("json がありません");
            return;
        }
        TekuamiWidgetStore.save(getContext(), json);
        TekuamiWidgetProvider.refreshAll(getContext());
        TekuamiSmallWidgetProvider.refreshAll(getContext());
        call.resolve();
    }
}
