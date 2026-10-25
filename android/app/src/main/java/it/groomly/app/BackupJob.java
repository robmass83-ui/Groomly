package it.groomly.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.util.concurrent.TimeUnit;

public class BackupJob extends Worker {
    static final String LAVORO = "groomly-backup";
    static final String PREFS = "groomly";
    static final String ATTIVO = "backupJobAttivo";
    static final String DOVUTO = "backupJobDovuto";
    private static final String CANALE = "groomly-backup";

    public BackupJob(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        android.content.SharedPreferences prefs = getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (!prefs.getBoolean(ATTIVO, false)) return Result.success();
        if (System.currentTimeMillis() < prefs.getLong(DOVUTO, 0)) return Result.success();
        avvisa(getApplicationContext());
        return Result.success();
    }

    static void applica(Context context, boolean attivo, boolean wifi, boolean carica, long dovuto) {
        Context app = context.getApplicationContext();
        app.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(ATTIVO, attivo)
            .putLong(DOVUTO, dovuto)
            .commit();
        WorkManager manager = WorkManager.getInstance(app);
        if (!attivo) {
            manager.cancelUniqueWork(LAVORO);
            return;
        }
        Constraints.Builder vincoli = new Constraints.Builder()
            .setRequiredNetworkType(wifi ? NetworkType.UNMETERED : NetworkType.CONNECTED);
        if (carica) vincoli.setRequiresCharging(true);
        PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(BackupJob.class, 24, TimeUnit.HOURS)
            .setConstraints(vincoli.build())
            .build();
        manager.enqueueUniquePeriodicWork(LAVORO, ExistingPeriodicWorkPolicy.UPDATE, request);
    }

    private static void avvisa(Context context) {
        try {
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager == null) return;
            if (Build.VERSION.SDK_INT >= 26) {
                NotificationChannel channel = new NotificationChannel(CANALE, context.getString(R.string.canale_backup), NotificationManager.IMPORTANCE_DEFAULT);
                manager.createNotificationChannel(channel);
            }
            Intent open = new Intent(context, MainActivity.class);
            open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pending = PendingIntent.getActivity(
                context,
                0,
                open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CANALE)
                .setSmallIcon(android.R.drawable.stat_notify_sync)
                .setContentTitle("Backup Groomly")
                .setContentText("Apri Groomly per completare il backup.")
                .setAutoCancel(true)
                .setContentIntent(pending);
            manager.notify(71, builder.build());
        } catch (Exception ignored) {
            // Senza il permesso di notifica il job non blocca il prossimo giro.
        }
    }
}
