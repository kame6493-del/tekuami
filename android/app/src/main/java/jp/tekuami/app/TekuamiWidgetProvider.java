package jp.tekuami.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.view.View;
import android.widget.RemoteViews;

/** ホーム画面ウィジェット(中)。見本D: 編み地の絵と「次の段まで あと287歩」「今日 3,214歩」 */
public class TekuamiWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        RemoteViews v = build(context);
        for (int id : ids) manager.updateAppWidget(id, v);
    }

    public static void refreshAll(Context context) {
        AppWidgetManager m = AppWidgetManager.getInstance(context);
        int[] ids = m.getAppWidgetIds(new ComponentName(context, TekuamiWidgetProvider.class));
        if (ids.length == 0) return;
        RemoteViews v = build(context);
        for (int id : ids) m.updateAppWidget(id, v);
    }

    static RemoteViews build(Context context) {
        TekuamiWidgetStore.Snap s = TekuamiWidgetStore.read(context);
        boolean night = "yoru".equals(s.theme);
        int ink = night ? 0xFFFFF8EE : 0xFF5A3624;
        RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.widget_tekuami);
        v.setInt(R.id.w_bg, "setColorFilter", night ? 0xFF2C3552 : 0xFFFBF3E6);
        if (s.item.isEmpty()) {
            v.setTextViewText(R.id.w_label, "てくあみ");
            v.setTextViewText(R.id.w_num, "次に編むものを選ぶ");
            v.setViewVisibility(R.id.w_ato, View.GONE);
            v.setViewVisibility(R.id.w_unit, View.GONE);
        } else {
            v.setTextViewText(R.id.w_label, "次の段まで");
            v.setTextViewText(R.id.w_num, String.valueOf(s.toNext));
            v.setViewVisibility(R.id.w_ato, View.VISIBLE);
            v.setViewVisibility(R.id.w_unit, View.VISIBLE);
        }
        v.setTextViewText(R.id.w_today, "今日 " + TekuamiWidgetStore.fmt(s.today) + "歩");
        for (int id : new int[] {R.id.w_label, R.id.w_num, R.id.w_ato, R.id.w_unit, R.id.w_today}) v.setTextColor(id, ink);
        v.setOnClickPendingIntent(R.id.w_root, TekuamiWidgetStore.openApp(context));
        return v;
    }
}
