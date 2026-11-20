package kr.opoong.mobile;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

public final class MainActivity extends Activity {
    static final String MEAL_URL = "https://hyukjunps.github.io/?page=meal";

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setGravity(Gravity.CENTER);
        int padding = Math.round(24 * getResources().getDisplayMetrics().density);
        content.setPadding(padding, padding, padding, padding);

        TextView title = new TextView(this);
        title.setText("오풍");
        title.setTextSize(36);
        content.addView(title);

        TextView help = new TextView(this);
        help.setText("홈 화면을 길게 누르고 위젯에서 ‘오풍’을 선택하세요.");
        help.setGravity(Gravity.CENTER);
        content.addView(help);

        AppWidgetManager manager = AppWidgetManager.getInstance(this);
        if (manager.isRequestPinAppWidgetSupported()) {
            Button add = new Button(this);
            add.setText("급식 위젯 추가");
            add.setOnClickListener(view -> manager.requestPinAppWidget(
                    new ComponentName(this, MealWidget.class), null, null));
            content.addView(add);
        }

        Button website = new Button(this);
        website.setText("오풍 급식 열기");
        website.setOnClickListener(view -> openMeal());
        content.addView(website);
        setContentView(content);

        if (Intent.ACTION_VIEW.equals(getIntent().getAction())) openMeal();
    }

    private void openMeal() {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(MEAL_URL)));
        } catch (ActivityNotFoundException error) {
            Toast.makeText(this, "웹 브라우저를 설치한 뒤 다시 열어 주세요.", Toast.LENGTH_LONG).show();
        }
    }
}
