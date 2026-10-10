package jp.tekuami.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.widget.RemoteViews;

/** ホーム画面ウィジェット(小)。見本D: 円で 287 / 500 */
public class TekuamiSmallWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        RemoteViews v = build(context);
        for (int id : ids) manager.updateAppWidget(id, v);
    }

    public static void refreshAll(Context context) {
        AppWidgetManager m = AppWidgetManager.getInstance(context);
        int[] ids = m.getAppWidgetIds(new ComponentName(context, TekuamiSmallWidgetProvider.class));
        if (ids.length == 0) return;
        RemoteViews v = build(context);
        for (int id : ids) m.updateAppWidget(id, v);
    }

    /** 下の開いた円(左下から右下へ)。地の弧と、進んだ分の弧 */
    static Bitmap ring(float frac, boolean night) {
        int size = 300;
        Bitmap b = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(b);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(26f);
        p.setStrokeCap(Paint.Cap.ROUND);
        RectF r = new RectF(20, 20, size - 20, size - 20);
        p.setColor(night ? 0xFF46507A : 0xFFEADFCF);
        c.drawArc(r, 135, 270, false, p);
        p.setColor(night ? 0xFF7F9AD0 : 0xFFD9905A);
        if (frac > 0) c.drawArc(r, 135, 270 * frac, false, p);
        return b;
    }

    static RemoteViews build(Context context) {
        TekuamiWidgetStore.Snap s = TekuamiWidgetStore.read(context);
        boolean night = "yoru".equals(s.theme);
        int ink = night ? 0xFFFFF8EE : 0xFF5A3624;
        RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.widget_tekuami_small);
        v.setInt(R.id.ws_bg, "setColorFilter", night ? 0xFF2C3552 : 0xFFFBF3E6);
        v.setImageViewBitmap(R.id.ws_ring, ring(s.frac(), night));
        v.setTextViewText(R.id.ws_num, s.item.isEmpty() ? "-" : String.valueOf(s.toNext));
        v.setTextViewText(R.id.ws_of, "/" + s.rowSteps);
        v.setTextColor(R.id.ws_num, ink);
        v.setTextColor(R.id.ws_of, ink);
        v.setTextColor(R.id.ws_ato, ink);
        v.setOnClickPendingIntent(R.id.ws_root, TekuamiWidgetStore.openApp(context));
        return v;
    }
}
