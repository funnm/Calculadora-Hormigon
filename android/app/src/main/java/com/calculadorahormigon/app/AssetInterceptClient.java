package com.calculadorahormigon.app;

import android.content.Context;
import android.content.Intent;
import android.content.res.AssetManager;
import android.net.Uri;
import android.util.Log;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Intercepts requests to https://appassets.androidplatform.net/ and serves bundled
 * offline assets from assets/www/ with strict MIME types and CORS support for ES modules.
 */
public final class AssetInterceptClient extends WebViewClient {

    private static final String TAG = "CalcAssetClient";
    public static final String APP_HOST = "appassets.androidplatform.net";
    public static final String APP_ORIGIN = "https://" + APP_HOST;
    public static final String START_URL = APP_ORIGIN + "/index.html";

    private final Context context;
    private final AssetManager assetManager;
    private final Runnable onPageReadyCallback;

    public AssetInterceptClient(Context context, Runnable onPageReadyCallback) {
        this.context = context;
        this.assetManager = context.getAssets();
        this.onPageReadyCallback = onPageReadyCallback;
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        Uri uri = request.getUrl();
        if (uri == null) return null;

        String host = uri.getHost();
        if (host == null) return null;

        if (APP_HOST.equalsIgnoreCase(host)) {
            return serveLocalAsset(uri.getPath());
        }

        // Prevent offline hangs when external font CDNs are requested
        String lowerHost = host.toLowerCase(Locale.ROOT);
        if (lowerHost.endsWith("fonts.googleapis.com")
                || lowerHost.endsWith("fonts.gstatic.com")) {
            return new WebResourceResponse(
                "text/css",
                "utf-8",
                200,
                "OK",
                defaultHeaders(),
                new ByteArrayInputStream(new byte[0])
            );
        }

        return super.shouldInterceptRequest(view, request);
    }

    private WebResourceResponse serveLocalAsset(String rawPath) {
        String path = (rawPath == null || rawPath.isEmpty() || "/".equals(rawPath))
            ? "index.html"
            : rawPath.startsWith("/") ? rawPath.substring(1) : rawPath;

        if (path.contains("..")) {
            return notFoundResponse();
        }

        if ("favicon.ico".equalsIgnoreCase(path)) {
            path = "icons/icon-192.png";
        }

        InputStream stream = openAssetOrNull("www/" + path);
        String resolvedPath = path;

        if (stream == null && !path.contains(".")) {
            resolvedPath = "index.html";
            stream = openAssetOrNull("www/index.html");
        }

        if (stream == null) {
            Log.w(TAG, "Asset not found: www/" + path);
            return notFoundResponse();
        }

        String mimeType = guessMimeType(resolvedPath);
        String encoding = isTextMime(mimeType) ? "utf-8" : null;
        return new WebResourceResponse(mimeType, encoding, 200, "OK", defaultHeaders(), stream);
    }

    private InputStream openAssetOrNull(String assetPath) {
        try {
            return assetManager.open(assetPath);
        } catch (IOException e) {
            return null;
        }
    }

    private WebResourceResponse notFoundResponse() {
        byte[] body = "Not Found".getBytes(StandardCharsets.UTF_8);
        return new WebResourceResponse(
            "text/plain",
            "utf-8",
            404,
            "Not Found",
            defaultHeaders(),
            new ByteArrayInputStream(body)
        );
    }

    private Map<String, String> defaultHeaders() {
        Map<String, String> headers = new HashMap<>();
        headers.put("Access-Control-Allow-Origin", APP_ORIGIN);
        headers.put("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
        headers.put("Cache-Control", "no-cache");
        return headers;
    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        Uri uri = request.getUrl();
        if (uri == null) return false;
        String scheme = uri.getScheme() != null ? uri.getScheme().toLowerCase(Locale.ROOT) : "";
        String host = uri.getHost() != null ? uri.getHost().toLowerCase(Locale.ROOT) : "";

        if (("https".equals(scheme) || "http".equals(scheme)) && APP_HOST.equals(host)) {
            return false;
        }

        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        } catch (Exception e) {
            Log.w(TAG, "Unable to open external URI: " + uri, e);
        }
        return true;
    }

    @Override
    public void onPageFinished(WebView view, String url) {
        super.onPageFinished(view, url);
        if (onPageReadyCallback != null) {
            onPageReadyCallback.run();
        }
    }

    private static boolean isTextMime(String mimeType) {
        return mimeType.startsWith("text/")
            || mimeType.contains("javascript")
            || mimeType.contains("json")
            || mimeType.contains("xml")
            || mimeType.contains("svg");
    }

    private static String guessMimeType(String path) {
        String lower = path.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html";
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "application/javascript";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".json")) return "application/json";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".ico")) return "image/x-icon";
        if (lower.endsWith(".woff2")) return "font/woff2";
        if (lower.endsWith(".woff")) return "font/woff";
        if (lower.endsWith(".ttf")) return "font/ttf";
        if (lower.endsWith(".xml")) return "application/xml";
        if (lower.endsWith(".txt")) return "text/plain";
        return "application/octet-stream";
    }
}
