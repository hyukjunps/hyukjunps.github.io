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
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Future;
import org.json.JSONException;

public final class MealRefreshJob extends JobService {
    static final int ID = 1;
    private static final ExecutorService WORKER = Executors.newSingleThreadExecutor();
    private final Handler main = new Handler(Looper.getMainLooper());
    private JobParameters active;
    private Future<?> task;

    static void schedule(Context context) {
        JobScheduler scheduler = context.getSystemService(JobScheduler.class);
        if (scheduler.getPendingJob(ID) != null) return;
        JobInfo job = new JobInfo.Builder(ID, new ComponentName(context, MealRefreshJob.class))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setPersisted(true)
                .build();
        scheduler.schedule(job);
    }

    @Override public boolean onStartJob(JobParameters params) {
        active = params;
        task = WORKER.submit(() -> {
            var day = SchoolMeals.today();
            boolean failed;
            try {
                SchoolMeals.refresh(this, day);
                failed = false;
            } catch (IOException | JSONException error) {
                failed = true;
            }
            boolean loadFailed = failed;
            boolean retry = failed || !day.equals(SchoolMeals.today());
            main.post(() -> {
                if (active != params) return;
                active = null;
                task = null;
                MealWidget.renderAll(this, loadFailed);
                jobFinished(params, retry);
            });
        });
        return true;
    }

    @Override public boolean onStopJob(JobParameters params) {
        if (active == params) {
            active = null;
            task.cancel(true);
            task = null;
        }
        return true;
    }
}
