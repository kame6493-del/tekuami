package jp.tekuami.app;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import org.json.JSONObject;

/**
 * アプリ(WebView)とホーム画面ウィジェットの間の置き場。中身は src/platform/widget.ts の WidgetSnapshot と同じ形の JSON。
 */
public final class TekuamiWidgetStore {
    private static final String PREFS = "tekuami_widget";
    private static final String KEY = "snapshot";

    private TekuamiWidgetStore() {}

    public static final class Snap {
        public int toNext = 0;
        public int rowSteps = 500;
        public int today = 0;
        public String item = "";
        public String theme = "hidamari";

        /** 今の段で編めた割合(0〜1) */
        public float frac() {
            if (rowSteps <= 0 || item.isEmpty()) return 0f;
            return Math.max(0f, Math.min(1f, (rowSteps - toNext) / (float) rowSteps));
        }
    }

    public static void save(Context c, String json) {
        prefs(c).edit().putString(KEY, json).apply();
    }

    public static Snap read(Context c) {
        Snap s = new Snap();
        try {
            JSONObject o = new JSONObject(prefs(c).getString(KEY, "{}"));
            s.toNext = o.optInt("toNext", 0);
            s.rowSteps = o.optInt("rowSteps", 500);
            s.today = o.optInt("today", 0);
            s.item = o.optString("item", "");
            s.theme = o.optString("theme", "hidamari");
        } catch (Exception ignored) {
            // 壊れていても、空の表示で出す
        }
        return s;
    }

    /** ウィジェットを押したらアプリを開く */
    public static PendingIntent openApp(Context c) {
        Intent i = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(c, 0, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** 3,214 のように3けた区切り */
    public static String fmt(int n) {
        return String.format(java.util.Locale.JAPAN, "%,d", Math.max(0, n));
    }

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
