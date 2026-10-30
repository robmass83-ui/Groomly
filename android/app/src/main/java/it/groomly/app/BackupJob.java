package it.groomly.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.work.Constraints;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.util.concurrent.TimeUnit;
import org.json.JSONObject;

/**
 * Backup automatico: all'istante dovuto apre Groomly senza schermo e lo fa da solo.
 * La notifica arriva solo se il backup non riesce.
 */
public class BackupJob extends Worker {
    static final String LAVORO_VECCHIO = "groomly-backup";
    static final String LAVORO = "groomly-backup-auto";
    static final String PREFS = "groomly";
    static final String ATTIVO = "backupJobAttivo";
    static final String DOVUTO = "backupJobDovuto";
    static final String WIFI = "backupJobWifi";
    static final String CARICA = "backupJobCarica";
    static final String AVVISATO = "backupJobAvvisato";
    private static final String CANALE = "groomly-backup";
    private static final int NOTIFICA = 71;
    private static final long ATTESA = TimeUnit.MINUTES.toMillis(9);
    private static final long RIPROVA_ERRORE = TimeUnit.HOURS.toMillis(1);
    private static final long RIPROVA_SALTATO = TimeUnit.HOURS.toMillis(3);
    private static final long SILENZIO = TimeUnit.HOURS.toMillis(12);

    private static volatile boolean inCorso = false;

    public BackupJob(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context app = getApplicationContext();
        SharedPreferences prefs = prefs(app);
        if (!prefs.getBoolean(ATTIVO, false)) return Result.success();
        long now = System.currentTimeMillis();
        if (now + TimeUnit.MINUTES.toMillis(1) < prefs.getLong(DOVUTO, 0)) {
            accoda(app, ExistingWorkPolicy.APPEND_OR_REPLACE);
            return Result.success();
        }
        String risposta;
        inCorso = true;
        try {
            risposta = BackupHeadless.esegui(app, ATTESA);
        } catch (InterruptedException stop) {
            Thread.currentThread().interrupt();
            risposta = null;
        } catch (RuntimeException error) {
            risposta = null;
        } finally {
            inCorso = false;
        }
        String esito = "errore";
        String messaggio = "";
        if (risposta != null) {
            try {
                JSONObject json = new JSONObject(risposta);
                esito = json.optString("esito", "errore");
                messaggio = json.optString("messaggio", "");
            } catch (Exception ignored) {
                esito = "errore";
            }
        }
        long dopo = System.currentTimeMillis();
        if ("inviato".equals(esito)) {
            togliAvviso(app);
        } else if (prefs.getLong(DOVUTO, 0) <= dopo) {
            long riprova = "saltato".equals(esito) ? RIPROVA_SALTATO : RIPROVA_ERRORE;
            prefs.edit().putLong(DOVUTO, dopo + riprova).commit();
        }
        if ("errore".equals(esito)) avvisa(app, messaggio);
        accoda(app, ExistingWorkPolicy.APPEND_OR_REPLACE);
        return Result.success();
    }

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /** Solo le preferenze: serve al backup in corso, che si riprogramma da solo quando finisce. */
    static void salva(Context context, boolean attivo, boolean wifi, boolean carica, long dovuto) {
        prefs(context)
            .edit()
            .putBoolean(ATTIVO, attivo)
            .putBoolean(WIFI, wifi)
            .putBoolean(CARICA, carica)
            .putLong(DOVUTO, dovuto)
            .commit();
    }

    static void applica(Context context, boolean attivo, boolean wifi, boolean carica, long dovuto) {
        Context app = context.getApplicationContext();
        salva(app, attivo, wifi, carica, dovuto);
        WorkManager manager = WorkManager.getInstance(app);
        manager.cancelUniqueWork(LAVORO_VECCHIO);
        if (!attivo) {
            manager.cancelUniqueWork(LAVORO);
            return;
        }
        if (inCorso) return;
        accoda(app, ExistingWorkPolicy.REPLACE);
    }

    private static void accoda(Context app, ExistingWorkPolicy policy) {
        SharedPreferences prefs = prefs(app);
        if (!prefs.getBoolean(ATTIVO, false)) return;
        long attesa = Math.max(0L, prefs.getLong(DOVUTO, 0) - System.currentTimeMillis());
        Constraints.Builder vincoli = new Constraints.Builder()
            .setRequiredNetworkType(prefs.getBoolean(WIFI, true) ? NetworkType.UNMETERED : NetworkType.CONNECTED);
        if (prefs.getBoolean(CARICA, false)) vincoli.setRequiresCharging(true);
        OneTimeWorkRequest request = new OneTimeWorkRequest.Builder(BackupJob.class)
            .setInitialDelay(attesa, TimeUnit.MILLISECONDS)
            .setConstraints(vincoli.build())
            .build();
        WorkManager.getInstance(app).enqueueUniqueWork(LAVORO, policy, request);
    }

    private static void togliAvviso(Context context) {
        prefs(context).edit().remove(AVVISATO).commit();
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) manager.cancel(NOTIFICA);
    }

    private static void avvisa(Context context, String messaggio) {
        SharedPreferences prefs = prefs(context);
        long now = System.currentTimeMillis();
        if (now - prefs.getLong(AVVISATO, 0) < SILENZIO) return;
        prefs.edit().putLong(AVVISATO, now).commit();
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
            String motivo = messaggio == null || messaggio.isEmpty() ? "Backup automatico non riuscito" : messaggio;
            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CANALE)
                .setSmallIcon(android.R.drawable.stat_notify_sync)
                .setContentTitle("Backup Groomly non riuscito")
                .setContentText(motivo + ". Riprovo tra poco.")
                .setAutoCancel(true)
                .setContentIntent(pending);
            manager.notify(NOTIFICA, builder.build());
        } catch (Exception ignored) {
            // Senza il permesso di notifica il backup riprova comunque.
        }
    }
}
