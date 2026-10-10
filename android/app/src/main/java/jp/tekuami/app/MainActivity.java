package jp.tekuami.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 自前のプラグインは super.onCreate より前に登録する
        registerPlugin(StepSensorPlugin.class);
        registerPlugin(TekuamiWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
