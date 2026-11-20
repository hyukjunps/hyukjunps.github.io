package kr.opoong.mobile;

import android.Manifest;
import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.function.Consumer;
import org.json.JSONObject;
import org.json.JSONException;

public final class MainActivity extends Activity {
    private static final String HOST = "hyukjunps.github.io";
    private static final String ORIGIN = "https://" + HOST;
    private static final String HOME = ORIGIN + "/";
    private static final int NOTIFICATION_REQUEST = 41;
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final int SURFACE = 0xFF101320;
    private WebView site;
    private ScrollView panel;
    private Button panelButton;
    private String onReady;
    private boolean active;
    private final Runnable synchronize = new Runnable() {
        @Override public void run() {
            if (!active) return;
            readSite(null);
            site.postDelayed(this, 2500);
        }
    };

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(SURFACE);
        getWindow().setNavigationBarColor(SURFACE);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        var root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(SURFACE);
        if (Build.VERSION.SDK_INT >= 35) {
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                var edges = insets.getInsets(WindowInsets.Type.systemBars()
                        | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                view.setPadding(edges.left, edges.top, edges.right, edges.bottom);
                return insets;
            });
        }
        root.addView(toolbar());

        site = new WebView(this);
        configureSite();
        panel = widgetPanel();
        panel.setVisibility(View.GONE);
        FrameLayout content = new FrameLayout(this);
        content.addView(site, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
        content.addView(panel, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
        root.addView(content, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        setContentView(root);

        if (state == null || site.restoreState(state) == null) route(getIntent());
        for (WidgetKind kind : WidgetKind.values()) WidgetRefreshJob.schedule(this, kind);
        WidgetProvider.renderAll(this, WidgetKind.DDAY, false);
    }

    private LinearLayout toolbar() {
        LinearLayout bar = new LinearLayout(this);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(12), 0, dp(12), 0);
        bar.setMinimumHeight(dp(52));
        var home = new LinearLayout(this);
        home.setGravity(Gravity.CENTER_VERTICAL);
        home.setContentDescription("오풍 홈");
        home.setPadding(dp(3), dp(7), dp(12), dp(7));
        home.setOnClickListener(view -> {
            setPanel(false);
            site.loadUrl(HOME);
        });
        var icon = new ImageView(this);
        icon.setImageResource(R.mipmap.opoong_icon);
        icon.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        home.addView(icon, dp(31), dp(31));
        TextView name = label("오풍", 18, Color.WHITE, true);
        name.setPadding(dp(8), 0, 0, 0);
        home.addView(name);
        bar.addView(home);
        bar.addView(new View(this), new LinearLayout.LayoutParams(0, 1, 1));
        panelButton = new Button(this);
        panelButton.setText("위젯");
        panelButton.setTextColor(Color.WHITE);
        panelButton.setBackgroundTintList(ColorStateList.valueOf(0xFF30385B));
        panelButton.setOnClickListener(view -> setPanel(panel.getVisibility() != View.VISIBLE));
        bar.addView(panelButton);
        return bar;
    }

    @SuppressWarnings("SetJavaScriptEnabled")
    private void configureSite() {
        var settings = site.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        site.setWebChromeClient(new WebChromeClient());
        site.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri target = request.getUrl();
                if (!request.isForMainFrame()) return false;
                if (isSite(target)) return false;
                if ("https".equalsIgnoreCase(target.getScheme())) openExternal(target);
                return true;
            }

            @Override public void onPageFinished(WebView view, String url) {
                if (!isSite(Uri.parse(url))) return;
                readSite(null);
                if (onReady != null && "/".equals(Uri.parse(url).getPath())) {
                    String action = onReady;
                    onReady = null;
                    site.evaluateJavascript("if (location.origin === '" + ORIGIN
                            + "') { " + action + " }", null);
                }
            }
        });
    }

    private static boolean isSite(Uri url) {
        return url != null && "https".equalsIgnoreCase(url.getScheme()) && HOST.equalsIgnoreCase(url.getHost())
                && (url.getPort() == -1 || url.getPort() == 443);
    }

    private void route(Intent intent) {
        setPanel(false);
        Uri uri = intent.getData();
        onReady = null;
        if (!Intent.ACTION_VIEW.equals(intent.getAction()) || uri == null) {
            site.loadUrl(HOME);
        } else if (WidgetKind.ONWAY.url.equals(uri.toString())) {
            if (site.getUrl() == null) site.loadUrl(HOME);
            openExternal(uri);
        } else if (WidgetKind.DDAY.url.equals(uri.toString())) {
            onReady = "if (typeof openDdaySettings === 'function') openDdaySettings();";
            site.loadUrl(HOME);
        } else if (HOME.equals(uri.toString()) || (HOME + "?page=timetable").equals(uri.toString())
                || WidgetKind.MEAL.url.equals(uri.toString()) || WidgetKind.SCHEDULE.url.equals(uri.toString())) {
            if (HOME.equals(uri.toString())) onReady = "document.getElementById('homeWeatherBody')?.scrollIntoView({block:'center'});";
            site.loadUrl(uri.toString());
        } else {
            site.loadUrl(HOME);
        }
    }

    private void readSite(Consumer<JSONObject> done) {
        String url = site.getUrl();
        if (url == null || !isSite(Uri.parse(url))) {
            if (done != null) done.accept(null);
            return;
        }
        site.evaluateJavascript(SiteSnapshot.SCRIPT, result -> {
            JSONObject snapshot = null;
            try {
                if (result != null && result.startsWith("{")) {
                    snapshot = new JSONObject(result);
                    SiteSnapshot.saveDdays(this, snapshot);
                }
            } catch (JSONException ignored) {
                // The next read can run once the site has finished loading.
            }
            if (done != null) done.accept(snapshot);
        });
    }

    private void startNowBar() {
        readSite(snapshot -> {
            var lesson = SiteSnapshot.lesson(snapshot, ZonedDateTime.now(SEOUL));
            if (lesson == null) {
                toast("현재 추적할 수업이 없어요. 오풍 시간표에 과목을 입력하고 수업 시간에 켜 주세요.");
                return;
            }
            if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_REQUEST);
                return;
            }
            if (!ClassNowNotification.post(this, lesson)) toast("설정에서 오풍 알림을 허용해 주세요.");
            else toast("수업 남은 시간을 알림에서 확인할 수 있어요.");
        });
    }

    @Override public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(code, permissions, results);
        if (code == NOTIFICATION_REQUEST && results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) {
            startNowBar();
        }
    }

    private ScrollView widgetPanel() {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(SURFACE);
        LinearLayout content = new LinearLayout(this);
        content.setPadding(dp(22), dp(21), dp(22), dp(28));
        content.setOrientation(LinearLayout.VERTICAL);
        scroll.addView(content);

        content.addView(label("홈 화면 위젯", 28, Color.WHITE, true));
        TextView help = label("원하는 위젯을 골라 홈 화면에 추가해요.", 15, 0xFFD4D9EA, false);
        help.setPadding(0, dp(5), 0, dp(20));
        content.addView(help);
        for (WidgetKind kind : WidgetKind.values()) addCard(content, kind);

        Button now = new Button(this);
        now.setText("수업 Now Bar 켜기");
        now.setTextColor(Color.WHITE);
        now.setBackgroundTintList(ColorStateList.valueOf(0xFF30385B));
        now.setOnClickListener(view -> startNowBar());
        content.addView(now, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        TextView nowHelp = label("저장한 시간표로 이번 교시 종료나 다음 교시 시작까지 남은 시간을 표시해요.", 14, 0xFFD4D9EA, false);
        nowHelp.setPadding(dp(8), dp(4), dp(8), 0);
        content.addView(nowHelp);
        return scroll;
    }

    private void addCard(LinearLayout container, WidgetKind kind) {
        LinearLayout card = new LinearLayout(this);
        card.setGravity(Gravity.CENTER_VERTICAL);
        card.setPadding(dp(15), dp(12), dp(12), dp(12));
        card.setBackgroundResource(kind.background);
        var margins = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        margins.bottomMargin = dp(10);
        container.addView(card, margins);

        var icon = new ImageView(this);
        icon.setImageResource(kind.symbol);
        icon.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        card.addView(icon, dp(28), dp(28));

        LinearLayout copy = new LinearLayout(this);
        copy.setOrientation(LinearLayout.VERTICAL);
        copy.setPadding(dp(12), 0, dp(6), 0);
        copy.addView(label(kind.label, 18, Color.WHITE, true));
        copy.addView(label(kind.description, 14, kind.accent, false));
        copy.setOnClickListener(view -> route(new Intent(Intent.ACTION_VIEW, Uri.parse(kind.url))));
        card.addView(copy, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));

        Button add = new Button(this);
        add.setText("추가");
        add.setContentDescription(kind.label + " 위젯 추가");
        add.setTextColor(0xFF141822);
        add.setBackgroundTintList(ColorStateList.valueOf(kind.accent));
        add.setOnClickListener(view -> pin(kind));
        card.addView(add, ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    }

    private void pin(WidgetKind kind) {
        AppWidgetManager manager = AppWidgetManager.getInstance(this);
        if (!manager.isRequestPinAppWidgetSupported() || !manager.requestPinAppWidget(
                new ComponentName(this, kind.provider), null, null)) {
            toast("홈 화면을 길게 누르고 위젯 목록에서 오풍을 선택하세요.");
        }
    }

    private void setPanel(boolean shown) {
        panel.setVisibility(shown ? View.VISIBLE : View.GONE);
        site.setVisibility(shown ? View.INVISIBLE : View.VISIBLE);
        panelButton.setText(shown ? "사이트" : "위젯");
    }

    private void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException error) {
            toast("웹 브라우저를 설치한 뒤 다시 열어 주세요.");
        }
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        route(intent);
    }

    @Override protected void onResume() {
        super.onResume();
        active = true;
        site.onResume();
        site.post(synchronize);
    }

    @Override protected void onPause() {
        active = false;
        site.removeCallbacks(synchronize);
        readSite(null);
        site.onPause();
        super.onPause();
    }

    @Override protected void onSaveInstanceState(Bundle state) {
        site.saveState(state);
        super.onSaveInstanceState(state);
    }

    @Override public void onBackPressed() {
        if (panel.getVisibility() == View.VISIBLE) setPanel(false);
        else if (site.canGoBack()) site.goBack();
        else if (site.getUrl() != null && !HOME.equals(site.getUrl())) site.loadUrl(HOME);
        else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        site.removeCallbacks(synchronize);
        ((ViewGroup) site.getParent()).removeView(site);
        site.destroy();
        super.onDestroy();
    }

    private void toast(String text) { Toast.makeText(this, text, Toast.LENGTH_LONG).show(); }

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
