package com.calculadorahormigon.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.JsPromptResult;
import android.webkit.JsResult;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Main native host Activity for Calculadora de Hormigón (Engineering Suite Pro) on Android.
 * Provides offline HTTPS asset loading, native file export/import, native PrintManager PDF,
 * clipboard bridge, adaptive light/dark system bars, and back-stack navigation.
 */
public class MainActivity extends Activity {

    private static final String TAG = "CalculadoraHormigon";
    private static final String JS_TAG = "CalculadoraHormigonJS";
    private static final int REQ_FILE_CHOOSER = 1001;
    private static final int REQ_STORAGE_PERMISSION = 1002;
    private static final long DOUBLE_BACK_EXIT_MS = 2000L;

    private WebView webView;
    private ValueCallback<Uri[]> pendingFileCallback;
    private long lastBackPressMs = 0L;
    private final ExecutorService ioExecutor = Executors.newSingleThreadExecutor();

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        boolean isDebuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        if (isDebuggable) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        FrameLayout root = new FrameLayout(this);
        root.setLayoutParams(new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));

        webView = new WebView(this);
        webView.setLayoutParams(new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        root.addView(webView);
        setContentView(root);

        configureWebView();
        applySystemBarsTheme(false);

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        }
        if (webView.getUrl() == null) {
            webView.loadUrl(AssetInterceptClient.START_URL);
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setTextZoom(100);

        // Disable WebView page zoom so touch pan/zoom goes directly to Plotly graph canvas
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");

        webView.setWebViewClient(new AssetInterceptClient(this, () -> {
            webView.evaluateJavascript(
                "(function(){ return (document.documentElement.classList.contains('dark-mode') || document.documentElement.classList.contains('dark-theme') || document.body.classList.contains('dark-mode') || document.body.classList.contains('dark-theme')) ? 'dark' : 'light'; })()",
                val -> {
                    boolean dark = val != null && val.contains("dark");
                    applySystemBarsTheme(dark);
                }
            );
        }));

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (pendingFileCallback != null) {
                    pendingFileCallback.onReceiveValue(null);
                    pendingFileCallback = null;
                }
                pendingFileCallback = filePathCallback;

                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[] {
                    "application/json",
                    "text/plain",
                    "text/csv",
                    "text/comma-separated-values",
                    "application/octet-stream",
                    "*/*"
                });

                try {
                    startActivityForResult(Intent.createChooser(intent, "Seleccionar archivo"), REQ_FILE_CHOOSER);
                    return true;
                } catch (ActivityNotFoundException e) {
                    pendingFileCallback = null;
                    Toast.makeText(MainActivity.this, "No se encontró un selector de archivos.", Toast.LENGTH_SHORT).show();
                    return false;
                }
            }

            @Override
            public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
                if (isFinishing()) {
                    result.cancel();
                    return true;
                }
                new AlertDialog.Builder(MainActivity.this)
                    .setTitle(R.string.app_name)
                    .setMessage(message)
                    .setPositiveButton("Aceptar", (d, w) -> result.confirm())
                    .setOnCancelListener(d -> result.cancel())
                    .show();
                return true;
            }

            @Override
            public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                if (isFinishing()) {
                    result.cancel();
                    return true;
                }
                new AlertDialog.Builder(MainActivity.this)
                    .setTitle(R.string.app_name)
                    .setMessage(message)
                    .setPositiveButton("Aceptar", (d, w) -> result.confirm())
                    .setNegativeButton("Cancelar", (d, w) -> result.cancel())
                    .setOnCancelListener(d -> result.cancel())
                    .show();
                return true;
            }

            @Override
            public boolean onJsPrompt(WebView view, String url, String message, String defaultValue, JsPromptResult result) {
                if (isFinishing()) {
                    result.cancel();
                    return true;
                }
                EditText input = new EditText(MainActivity.this);
                input.setText(defaultValue != null ? defaultValue : "");
                new AlertDialog.Builder(MainActivity.this)
                    .setTitle(R.string.app_name)
                    .setMessage(message)
                    .setView(input)
                    .setPositiveButton("Aceptar", (d, w) -> result.confirm(input.getText().toString()))
                    .setNegativeButton("Cancelar", (d, w) -> result.cancel())
                    .setOnCancelListener(d -> result.cancel())
                    .show();
                return true;
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage cm) {
                String text = "[" + cm.messageLevel() + "] " + cm.message()
                    + " (" + cm.sourceId() + ":" + cm.lineNumber() + ")";
                if (cm.messageLevel() == ConsoleMessage.MessageLevel.ERROR) {
                    Log.e(JS_TAG, text);
                } else if (cm.messageLevel() == ConsoleMessage.MessageLevel.WARNING) {
                    Log.w(JS_TAG, text);
                } else {
                    Log.i(JS_TAG, text);
                }
                return true;
            }
        });

        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            if (url != null && url.startsWith("data:")) {
                handleDataUrlDownload(url, mimeType);
            } else {
                Toast.makeText(this, "Usa el menú Archivo para exportar gráficas o informes.", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void handleDataUrlDownload(String dataUrl, String fallbackMime) {
        try {
            int comma = dataUrl.indexOf(',');
            if (comma < 0) return;
            String header = dataUrl.substring(5, comma);
            String payload = dataUrl.substring(comma + 1);
            boolean isBase64 = header.contains(";base64");
            String mime = header.split(";")[0];
            if (mime == null || mime.isEmpty()) mime = fallbackMime != null ? fallbackMime : "application/octet-stream";
            String base64 = isBase64
                ? payload
                : Base64.encodeToString(Uri.decode(payload).getBytes("UTF-8"), Base64.NO_WRAP);
            new AndroidBridge().saveFileBase64("calculadora_grafica_export", mime, base64, true);
        } catch (Exception e) {
            Log.e(TAG, "Fallback data URL download failed", e);
        }
    }

    private void applySystemBarsTheme(boolean dark) {
        runOnUiThread(() -> {
            Window window = getWindow();
            if (window == null) return;
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);

            int statusColor = dark ? Color.parseColor("#0A0B0F") : Color.parseColor("#F5F5F7");
            int navColor = dark ? Color.parseColor("#111318") : Color.parseColor("#FFFFFF");
            window.setStatusBarColor(statusColor);
            window.setNavigationBarColor(navColor);

            View decor = window.getDecorView();
            int flags = decor.getSystemUiVisibility();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (dark) {
                    flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                } else {
                    flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                }
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (dark) {
                    flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                } else {
                    flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                }
            }
            decor.setSystemUiVisibility(flags);
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_FILE_CHOOSER) {
            if (pendingFileCallback != null) {
                Uri[] results = null;
                if (resultCode == Activity.RESULT_OK && data != null) {
                    Uri single = data.getData();
                    if (single != null) {
                        results = new Uri[] { single };
                    } else if (data.getClipData() != null) {
                        ClipData clip = data.getClipData();
                        results = new Uri[clip.getItemCount()];
                        for (int i = 0; i < clip.getItemCount(); i++) {
                            results[i] = clip.getItemAt(i).getUri();
                        }
                    }
                }
                pendingFileCallback.onReceiveValue(results);
                pendingFileCallback = null;
            }
        }
    }

    @Override
    public void onBackPressed() {
        if (webView == null) {
            super.onBackPressed();
            return;
        }

        String currentUrl = webView.getUrl();
        if (currentUrl != null && !currentUrl.endsWith("/index.html") && !currentUrl.endsWith("/") && webView.canGoBack()) {
            webView.goBack();
            return;
        }

        webView.evaluateJavascript(
            "(function(){ return typeof window.__androidHandleBack === 'function' ? window.__androidHandleBack() : 'exit'; })()",
            value -> {
                if (value != null && value.contains("handled")) {
                    return;
                }
                long now = System.currentTimeMillis();
                if (now - lastBackPressMs <= DOUBLE_BACK_EXIT_MS) {
                    MainActivity.super.onBackPressed();
                } else {
                    lastBackPressMs = now;
                    Toast.makeText(MainActivity.this, "Presiona Atrás otra vez para salir", Toast.LENGTH_SHORT).show();
                }
            }
        );
    }

    @Override
    protected void onPause() {
        if (webView != null) {
            webView.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) {
            webView.saveState(outState);
        }
    }

    @Override
    protected void onDestroy() {
        ioExecutor.shutdownNow();
        if (webView != null) {
            webView.removeJavascriptInterface("AndroidBridge");
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    private String sanitizeFileName(String raw, String mimeType) {
        String name = (raw == null || raw.trim().isEmpty()) ? "calculadora_grafica" : raw.trim();
        name = name.replaceAll("[\\\\/:*?\"<>|\\r\\n]+", "_");
        if (name.startsWith(".")) name = "archivo" + name;
        if (!name.contains(".") && mimeType != null) {
            String lower = mimeType.toLowerCase(Locale.ROOT);
            if (lower.contains("pdf")) name += ".pdf";
            else if (lower.contains("json")) name += ".json";
            else if (lower.contains("csv")) name += ".csv";
            else if (lower.contains("svg")) name += ".svg";
            else if (lower.contains("png")) name += ".png";
            else if (lower.contains("text")) name += ".txt";
        }
        return name;
    }

    private String normalizeMimeType(String fileName, String mimeType) {
        if (mimeType != null && !mimeType.trim().isEmpty() && !mimeType.startsWith("application/octet-stream")) {
            int semi = mimeType.indexOf(';');
            return semi > 0 ? mimeType.substring(0, semi).trim() : mimeType.trim();
        }
        String lower = fileName.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".pdf")) return "application/pdf";
        if (lower.endsWith(".json")) return "application/json";
        if (lower.endsWith(".csv")) return "text/csv";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".txt")) return "text/plain";
        return "application/octet-stream";
    }

    private String saveToPublicDownloads(String fileName, String mimeType, byte[] data) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentResolver resolver = getContentResolver();
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
                values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
                values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/CalculadoraHormigon");
                Uri inserted = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (inserted != null) {
                    try (OutputStream os = resolver.openOutputStream(inserted)) {
                        if (os != null) {
                            os.write(data);
                            os.flush();
                            return "Descargas/CalculadoraHormigon/" + fileName;
                        }
                    }
                }
            } else {
                boolean hasWritePerm = checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE)
                    == PackageManager.PERMISSION_GRANTED;
                if (hasWritePerm) {
                    File publicDownloads = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                    File targetDir = new File(publicDownloads, "CalculadoraHormigon");
                    if (targetDir.exists() || targetDir.mkdirs()) {
                        File outFile = new File(targetDir, fileName);
                        try (FileOutputStream fos = new FileOutputStream(outFile)) {
                            fos.write(data);
                            fos.flush();
                        }
                        MediaScannerConnection.scanFile(
                            getApplicationContext(),
                            new String[] { outFile.getAbsolutePath() },
                            new String[] { mimeType },
                            null
                        );
                        return "Descargas/CalculadoraHormigon/" + fileName;
                    }
                } else {
                    runOnUiThread(() -> requestPermissions(
                        new String[] { Manifest.permission.WRITE_EXTERNAL_STORAGE },
                        REQ_STORAGE_PERMISSION
                    ));
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Public download save fallback triggered", e);
        }

        File appDownloads = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (appDownloads != null) {
            File targetDir = new File(appDownloads, "CalculadoraHormigon");
            if (!targetDir.exists()) {
                //noinspection ResultOfMethodCallIgnored
                targetDir.mkdirs();
            }
            File outFile = new File(targetDir, fileName);
            try (FileOutputStream fos = new FileOutputStream(outFile)) {
                fos.write(data);
                fos.flush();
                return outFile.getAbsolutePath();
            } catch (IOException e) {
                Log.e(TAG, "Failed saving to app external downloads", e);
            }
        }
        return null;
    }

    private void showExportDialog(String fileName, String mimeType, File shareFile, String savedLocation) {
        if (isFinishing()) return;
        Uri contentUri = ExportFileProvider.getUriForFile(shareFile);
        String locationLine = savedLocation != null
            ? "Archivo guardado en:\n" + savedLocation
            : "Archivo listo para abrir o compartir.";

        new AlertDialog.Builder(this)
            .setTitle("Exportación completada")
            .setMessage(fileName + "\n\n" + locationLine)
            .setNeutralButton("Cerrar", null)
            .setNegativeButton("Compartir", (d, w) -> {
                Intent share = new Intent(Intent.ACTION_SEND);
                share.setType(mimeType);
                share.putExtra(Intent.EXTRA_STREAM, contentUri);
                share.putExtra(Intent.EXTRA_SUBJECT, fileName);
                share.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                try {
                    startActivity(Intent.createChooser(share, "Compartir " + fileName));
                } catch (Exception e) {
                    Toast.makeText(this, "No se encontró aplicación para compartir.", Toast.LENGTH_SHORT).show();
                }
            })
            .setPositiveButton("Abrir", (d, w) -> {
                Intent viewIntent = new Intent(Intent.ACTION_VIEW);
                viewIntent.setDataAndType(contentUri, mimeType);
                viewIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                try {
                    startActivity(Intent.createChooser(viewIntent, "Abrir " + fileName));
                } catch (Exception e) {
                    Toast.makeText(this, "No hay visor instalado para este tipo de archivo.", Toast.LENGTH_SHORT).show();
                }
            })
            .show();
    }

    private final class AndroidBridge {

        @JavascriptInterface
        public void saveFileBase64(String rawFileName, String rawMimeType, String base64Data, boolean offerAction) {
            if (base64Data == null) return;
            final String fileName = sanitizeFileName(rawFileName, rawMimeType);
            final String mimeType = normalizeMimeType(fileName, rawMimeType);

            ioExecutor.execute(() -> {
                try {
                    byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
                    File shareFile = new File(ExportFileProvider.getExportsDir(MainActivity.this), fileName);
                    try (FileOutputStream fos = new FileOutputStream(shareFile)) {
                        fos.write(bytes);
                        fos.flush();
                    }

                    String savedLocation = saveToPublicDownloads(fileName, mimeType, bytes);
                    Log.i(TAG, "Exported " + fileName + " (" + bytes.length + " bytes) -> " + savedLocation);

                    runOnUiThread(() -> {
                        if (offerAction) {
                            showExportDialog(fileName, mimeType, shareFile, savedLocation);
                        } else {
                            Toast.makeText(MainActivity.this, "Guardado: " + fileName, Toast.LENGTH_SHORT).show();
                        }
                    });
                } catch (Exception e) {
                    Log.e(TAG, "Error saving exported file: " + fileName, e);
                    runOnUiThread(() -> Toast.makeText(
                        MainActivity.this,
                        "Error al guardar archivo: " + fileName,
                        Toast.LENGTH_LONG
                    ).show());
                }
            });
        }

        @JavascriptInterface
        public void printDocument(String title) {
            runOnUiThread(() -> {
                if (webView == null || isFinishing()) return;
                try {
                    PrintManager pm = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                    if (pm == null) {
                        Toast.makeText(MainActivity.this, "Servicio de impresión no disponible.", Toast.LENGTH_SHORT).show();
                        return;
                    }
                    String jobName = (title == null || title.trim().isEmpty()) ? "Calculadora de Hormigón" : title.trim();
                    PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter(jobName);
                    pm.print(jobName, adapter, new PrintAttributes.Builder().build());
                } catch (Exception e) {
                    Log.e(TAG, "Print error", e);
                    Toast.makeText(MainActivity.this, "No se pudo iniciar la impresión PDF.", Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface
        public void copyToClipboard(String text) {
            runOnUiThread(() -> {
                try {
                    ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                    if (cm != null) {
                        cm.setPrimaryClip(ClipData.newPlainText("Calculadora de Hormigón", text != null ? text : ""));
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Clipboard error", e);
                }
            });
        }

        @JavascriptInterface
        public void setTheme(String mode) {
            applySystemBarsTheme("dark".equalsIgnoreCase(mode));
        }

        @JavascriptInterface
        public void showNativeToast(String message) {
            if (message == null || message.trim().isEmpty()) return;
            runOnUiThread(() -> Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show());
        }

        @JavascriptInterface
        public void openExternalUrl(String url) {
            if (url == null || url.trim().isEmpty()) return;
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "No se pudo abrir el enlace.", Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface
        public String getDeviceInfo() {
            String appVersion = "2.0.0";
            try {
                PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
                if (info != null && info.versionName != null) appVersion = info.versionName;
            } catch (Exception ignored) {
            }
            return "{\"platform\":\"Android\",\"suite\":\"Engineering Suite Pro\",\"model\":\"" + escapeJson(Build.MODEL)
                + "\",\"android\":\"" + escapeJson(Build.VERSION.RELEASE)
                + "\",\"sdk\":" + Build.VERSION.SDK_INT
                + ",\"appVersion\":\"" + escapeJson(appVersion) + "\"}";
        }
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
