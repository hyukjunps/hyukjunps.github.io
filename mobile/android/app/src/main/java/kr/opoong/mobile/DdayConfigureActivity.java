package kr.opoong.mobile;

import android.app.Activity;
import android.app.DatePickerDialog;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.text.InputFilter;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import java.time.LocalDate;
import java.util.UUID;

public final class DdayConfigureActivity extends Activity {
    static final String ADD = "kr.opoong.mobile.ADD_DDAY";
    private int widgetId;
    private LocalDate date;
    private LinearLayout form;
    private EditText title;
    private Button chooseDate;

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        setResult(RESULT_CANCELED);
        widgetId = getIntent().getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        boolean pin = ADD.equals(getIntent().getAction());
        if (!pin && !DdayChoice.bound(this, widgetId)) {
            finish();
            return;
        }
        var saved = pin ? null : DdayChoice.load(this, widgetId);
        date = saved != null && saved.date() != null ? saved.date() : SchoolMeals.today();
        var scroll = new ScrollView(this);
        scroll.setBackgroundColor(0xFF101320);
        var content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(24), dp(45), dp(24), dp(24));
        scroll.addView(content);
        var heading = new TextView(this);
        heading.setText("어떤 디데이를 추가할까요?");
        heading.setTextSize(25);
        heading.setTextColor(Color.WHITE);
        heading.setPadding(0, 0, 0, dp(16));
        content.addView(heading);
        button(content, caption("귀가 자동 추천 디데이", saved, DdayChoice.HOME),
                () -> complete(new DdayChoice(DdayChoice.HOME, "", null)));
        button(content, caption("시험 자동 추천 디데이", saved, DdayChoice.EXAM),
                () -> complete(new DdayChoice(DdayChoice.EXAM, "", null)));
        button(content, "직접 추가", () -> form.setVisibility(View.VISIBLE));
        form = new LinearLayout(this);
        form.setOrientation(LinearLayout.VERTICAL);
        content.addView(form);
        title = new EditText(this);
        title.setHint("디데이 이름");
        title.setSingleLine(true);
        title.setTextColor(Color.WHITE);
        title.setHintTextColor(0xFFCDD1DE);
        title.setFilters(new InputFilter[]{new InputFilter.LengthFilter(40)});
        if (saved != null && DdayChoice.CUSTOM.equals(saved.mode())) title.setText(saved.title());
        form.addView(title);
        chooseDate = button(form, date.toString(), this::pickDate);
        button(form, "이 디데이 저장", () -> {
            String name = title.getText().toString().trim();
            if (name.isEmpty()) {
                title.setError("디데이 이름을 입력해 주세요.");
                return;
            }
            complete(new DdayChoice(DdayChoice.CUSTOM, name, date));
        });
        form.setVisibility(saved != null && DdayChoice.CUSTOM.equals(saved.mode()) ? View.VISIBLE : View.GONE);
        if (state != null) {
            date = LocalDate.ofEpochDay(state.getLong("date"));
            chooseDate.setText(date.toString());
            title.setText(state.getString("title", ""));
            form.setVisibility(state.getBoolean("editing") ? View.VISIBLE : View.GONE);
        }
        setContentView(scroll);
    }

    private void pickDate() {
        new DatePickerDialog(this, (picker, year, month, day) -> {
            date = LocalDate.of(year, month + 1, day);
            chooseDate.setText(date.toString());
        }, date.getYear(), date.getMonthValue() - 1, date.getDayOfMonth()).show();
    }

    private static String caption(String text, DdayChoice saved, String mode) {
        return saved != null && mode.equals(saved.mode()) ? text + " · 선택됨" : text;
    }

    private void complete(DdayChoice choice) {
        var manager = AppWidgetManager.getInstance(this);
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            if (!manager.isRequestPinAppWidgetSupported()) {
                Toast.makeText(this, "홈 화면을 길게 눌러 오풍 디데이 위젯을 추가해 주세요.", Toast.LENGTH_LONG).show();
                return;
            }
            var result = choice.addTo(new Intent(this, Pinned.class)
                    .setData(Uri.parse("opoong://pin-dday/" + UUID.randomUUID())));
            int flags = PendingIntent.FLAG_ONE_SHOT | (Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0);
            var callback = PendingIntent.getBroadcast(this, 0, result, flags);
            if (!manager.requestPinAppWidget(new ComponentName(this, WidgetProvider.Dday.class), null, callback)) {
                callback.cancel();
                Toast.makeText(this, "홈 화면에서 오풍 디데이 위젯을 추가해 주세요.", Toast.LENGTH_LONG).show();
                return;
            }
        } else {
            if (!DdayChoice.bound(this, widgetId)) {
                finish();
                return;
            }
            saveChoice(this, widgetId, choice);
            setResult(RESULT_OK, new Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId));
        }
        finish();
    }

    private static void saveChoice(Context context, int id, DdayChoice choice) {
        choice.save(context, id);
        WidgetProvider.renderAll(context, WidgetKind.DDAY, false);
        WidgetRefreshJob.schedule(context, WidgetKind.DDAY);
    }

    public static final class Pinned extends BroadcastReceiver {
        @Override public void onReceive(Context context, Intent intent) {
            int id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
            var choice = DdayChoice.fromIntent(intent);
            if (choice != null && DdayChoice.bound(context, id)) saveChoice(context, id, choice);
        }
    }

    @Override protected void onSaveInstanceState(Bundle state) {
        if (date != null) {
            state.putLong("date", date.toEpochDay());
            state.putString("title", title.getText().toString());
            state.putBoolean("editing", form.getVisibility() == View.VISIBLE);
        }
        super.onSaveInstanceState(state);
    }

    private Button button(LinearLayout parent, String label, Runnable action) {
        Button button = new Button(this);
        button.setAllCaps(false);
        button.setText(label);
        button.setOnClickListener(view -> action.run());
        parent.addView(button, LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        return button;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
