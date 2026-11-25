package kr.opoong.mobile;

import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Future;
import org.json.JSONException;

public final class WidgetRefreshJob extends JobService {
    private static final ExecutorService WORKERS = Executors.newFixedThreadPool(3);
    private final Handler main = new Handler(Looper.getMainLooper());
    private final Map<JobParameters, Future<?>> active = new HashMap<>();

    static void schedule(Context context, WidgetKind kind) {
        if (kind.jobId == 0 || WidgetProvider.ids(context, kind).length == 0) return;
        JobScheduler scheduler = context.getSystemService(JobScheduler.class);
        if (scheduler.getPendingJob(kind.jobId) != null) return;
        JobInfo job = new JobInfo.Builder(kind.jobId, new ComponentName(context, WidgetRefreshJob.class))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setPersisted(true)
                .build();
        scheduler.schedule(job);
    }

    @Override public boolean onStartJob(JobParameters params) {
        if (params.getJobId() == MorningMeal.JOB_ID) {
            var work = WORKERS.submit(() -> {
                boolean retry = MorningMeal.deliver(this, params.getExtras().getString(MorningMeal.JOB_DAY));
                main.post(() -> {
                    if (active.remove(params) != null) jobFinished(params, retry);
                });
            });
            active.put(params, work);
            return true;
        }
        WidgetKind kind = WidgetKind.forJob(params.getJobId());
        if (kind == null || WidgetProvider.ids(this, kind).length == 0) return false;
        Future<?> task = WORKERS.submit(() -> {
            var day = SchoolMeals.today();
            boolean failed = refresh(kind);
            boolean dateChanged = kind != WidgetKind.WEATHER && !day.equals(SchoolMeals.today());
            main.post(() -> {
                if (active.remove(params) == null) return;
                WidgetProvider.renderAll(this, kind, failed);
                jobFinished(params, failed || dateChanged);
            });
        });
        active.put(params, task);
        return true;
    }

    private boolean refresh(WidgetKind kind) {
        try {
            WidgetData.refresh(this, kind);
            return false;
        } catch (IOException | JSONException error) {
            return true;
        }
    }

    @Override public boolean onStopJob(JobParameters params) {
        Future<?> task = active.remove(params);
        if (task != null) task.cancel(true);
        if (params.getJobId() == MorningMeal.JOB_ID) return MorningMeal.enabled(this);
        WidgetKind kind = WidgetKind.forJob(params.getJobId());
        return kind != null && WidgetProvider.ids(this, kind).length > 0;
    }
}
