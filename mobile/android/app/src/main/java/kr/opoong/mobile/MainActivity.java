package kr.opoong.mobile;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.Intent;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.graphics.Typeface;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

public final class MainActivity extends Activity {
    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);

        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(Color.rgb(16, 19, 32));
        LinearLayout content = new LinearLayout(this);
        content.setPadding(dp(24), dp(48), dp(24), dp(32));
        content.setOrientation(LinearLayout.VERTICAL);
        scroll.addView(content);

        TextView title = label("오풍 위젯", 35, Color.WHITE, true);
        content.addView(title);
        TextView help = label("홈 화면에 추가할 위젯을 골라 주세요.", 15, 0xFFB9BED1, false);
        var helpMargins = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        helpMargins.topMargin = dp(5);
        helpMargins.bottomMargin = dp(24);
        content.addView(help, helpMargins);

        for (WidgetKind kind : WidgetKind.values()) {
            addCard(content, kind);
            WidgetRefreshJob.schedule(this, kind);
        }

        setContentView(scroll);
        if (Intent.ACTION_VIEW.equals(getIntent().getAction()) && getIntent().getData() != null) {
            for (WidgetKind kind : WidgetKind.values()) {
                if (kind.url.equals(getIntent().getDataString())) {
                    open(kind.url);
                    finish();
                    break;
                }
            }
        }
    }

    private void addCard(LinearLayout container, WidgetKind kind) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.HORIZONTAL);
        card.setGravity(Gravity.CENTER_VERTICAL);
        card.setPadding(dp(15), dp(15), dp(12), dp(15));
        card.setBackgroundResource(kind.background);
        var margins = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        margins.bottomMargin = dp(12);
        container.addView(card, margins);

        ImageView icon = new ImageView(this);
        icon.setImageResource(kind.symbol);
        icon.setImportantForAccessibility(ImageView.IMPORTANT_FOR_ACCESSIBILITY_NO);
        card.addView(icon, dp(28), dp(28));

        LinearLayout copy = new LinearLayout(this);
        copy.setOrientation(LinearLayout.VERTICAL);
        copy.setPadding(dp(12), 0, dp(6), 0);
        copy.addView(label(kind.label, 17, Color.WHITE, true));
        copy.addView(label(kind.description, 12, kind.accent, false));
        card.addView(copy, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        copy.setOnClickListener(view -> open(kind.url));

        Button add = new Button(this);
        add.setText("추가");
        add.setContentDescription(kind.label + " 위젯 추가");
        add.setTextColor(Color.rgb(20, 24, 34));
        add.setBackgroundTintList(ColorStateList.valueOf(kind.accent));
        add.setOnClickListener(view -> pin(kind));
        card.addView(add, ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    }

    private void pin(WidgetKind kind) {
        AppWidgetManager manager = AppWidgetManager.getInstance(this);
        if (!manager.isRequestPinAppWidgetSupported() || !manager.requestPinAppWidget(
                new ComponentName(this, kind.provider), null, null)) {
            Toast.makeText(this, "홈 화면을 길게 누르고 위젯 목록에서 오풍을 선택하세요.", Toast.LENGTH_LONG).show();
        }
    }

    private void open(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (ActivityNotFoundException error) {
            Toast.makeText(this, "웹 브라우저를 설치한 뒤 다시 열어 주세요.", Toast.LENGTH_LONG).show();
        }
    }

    private TextView label(String text, int size, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextSize(size);
        view.setTextColor(color);
        if (bold) view.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return view;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
