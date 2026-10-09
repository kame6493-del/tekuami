package jp.tekuami.app;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * 端末の歩数センサー(TYPE_STEP_COUNTER: 電源を入れてからの累計)を1回だけ読む小さなプラグイン。
 * ヘルスコネクトが入っていない・歩数が入らない端末のための予備。日ごとへの割り振りは JS 側(src/domain/steps.ts)で行う。
 */
@CapacitorPlugin(
    name = "StepSensor",
    permissions = { @Permission(strings = { Manifest.permission.ACTIVITY_RECOGNITION }, alias = "activity") }
)
public class StepSensorPlugin extends Plugin {

    private SensorManager manager() {
        return (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
    }

    private Sensor sensor() {
        SensorManager sm = manager();
        return sm == null ? null : sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
    }

    private boolean granted() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return true;
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED;
    }

    private void resolveGranted(PluginCall call, boolean value) {
        JSObject r = new JSObject();
        r.put("granted", value);
        call.resolve(r);
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject r = new JSObject();
        r.put("available", sensor() != null);
        call.resolve(r);
    }

    @PluginMethod
    public void checkPermission(PluginCall call) {
        resolveGranted(call, granted());
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (granted()) {
            resolveGranted(call, true);
            return;
        }
        requestPermissionForAlias("activity", call, "permissionDone");
    }

    @PermissionCallback
    private void permissionDone(PluginCall call) {
        resolveGranted(call, getPermissionState("activity") == PermissionState.GRANTED || granted());
    }

    @PluginMethod
    public void read(final PluginCall call) {
        final Sensor s = sensor();
        final SensorManager sm = manager();
        if (s == null || sm == null) {
            call.reject("この端末には歩数センサーがありません");
            return;
        }
        if (!granted()) {
            call.reject("身体活動の許可がありません");
            return;
        }
        final boolean[] done = { false };
        final SensorEventListener listener = new SensorEventListener() {
            @Override
            public void onSensorChanged(SensorEvent event) {
                if (done[0]) return;
                done[0] = true;
                sm.unregisterListener(this);
                long now = System.currentTimeMillis();
                JSObject r = new JSObject();
                r.put("counter", (long) event.values[0]);
                r.put("at", now);
                r.put("bootAt", now - SystemClock.elapsedRealtime());
                call.resolve(r);
            }

            @Override
            public void onAccuracyChanged(Sensor sensor, int accuracy) {}
        };
        sm.registerListener(listener, s, SensorManager.SENSOR_DELAY_NORMAL);
        // 値がすぐに来ない端末がある。5秒待って来なければあきらめる
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            if (done[0]) return;
            done[0] = true;
            sm.unregisterListener(listener);
            call.reject("歩数センサーから値が届きませんでした");
        }, 5000);
    }
}
