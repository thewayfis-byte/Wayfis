package com.wayfis.delivery;

import org.bukkit.Bukkit;
import org.bukkit.plugin.java.JavaPlugin;

import java.io.*;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;

public class DeliveryPlugin extends JavaPlugin {

    private String apiKey;
    private boolean logCommands;
    private int port;
    private HttpThread httpThread;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        reloadConfig();
        apiKey = getConfig().getString("api-key", "change-me");
        logCommands = getConfig().getBoolean("log-commands", true);
        port = getConfig().getInt("http-port", 19132);

        if ("change-me".equals(apiKey))
            getLogger().warning("[WayfisDelivery] API-ключ не изменён!");

        httpThread = new HttpThread();
        httpThread.start();
    }

    @Override
    public void onDisable() {
        if (httpThread != null) httpThread.stopServer();
    }

    public void execute(String cmd) {
        Bukkit.getScheduler().runTask(this, () -> {
            try {
                boolean ok = Bukkit.dispatchCommand(Bukkit.getConsoleSender(), cmd);
                if (logCommands)
                    getLogger().info((ok ? "OK" : "FAIL") + " /" + cmd);
            } catch (Exception e) {
                getLogger().warning("Command error /" + cmd + ": " + e.getMessage());
            }
        });
    }

    // ============================================================
    private class HttpThread extends Thread {
        private ServerSocket ss;

        @Override
        public void run() {
            try {
                ss = new ServerSocket(port);
                getLogger().info("§aHTTP на порту " + port);

                while (!ss.isClosed()) {
                    try {
                        new Thread(new Worker(ss.accept())).start();
                    } catch (IOException e) {
                        if (!ss.isClosed())
                            getLogger().warning("Accept error: " + e.getMessage());
                    }
                }
            } catch (IOException e) {
                getLogger().severe("§cCannot bind port " + port + ": " + e.getMessage());
            }
        }

        void stopServer() {
            try { if (ss != null) ss.close(); } catch (Exception e) {}
        }
    }

    // ============================================================
    private class Worker implements Runnable {
        private final Socket socket;
        private OutputStream out;

        Worker(Socket s) { this.socket = s; }

        @Override
        public void run() {
            try {
                socket.setSoTimeout(10000);
                InputStream in = socket.getInputStream();
                out = socket.getOutputStream();

                // Читаем весь запрос (байты)
                ByteArrayOutputStream buf = new ByteArrayOutputStream();
                // Сначала читаем заголовки до \r\n\r\n
                int prev = 0, curr = 0;
                boolean headersDone = false;
                while (!headersDone) {
                    int b = in.read();
                    if (b == -1) { send(400, "{\"error\":\"Connection closed\"}"); return; }
                    buf.write(b);
                    prev = curr;
                    curr = b;
                    if (prev == '\r' && curr == '\n') {
                        // Проверяем, что перед этим тоже было \r\n (дважды)
                        byte[] data = buf.toByteArray();
                        if (data.length >= 4) {
                            if (data[data.length - 4] == '\r' && data[data.length - 3] == '\n'
                                    && data[data.length - 2] == '\r' && data[data.length - 1] == '\n') {
                                headersDone = true;
                            }
                        }
                    }
                }

                String headerStr = new String(buf.toByteArray(), StandardCharsets.UTF_8);
                String[] lines = headerStr.split("\r\n");
                if (lines.length < 1) { send(400, "{\"error\":\"Bad request\"}"); return; }

                String[] rl = lines[0].split(" ");
                if (rl.length < 2) { send(400, "{\"error\":\"Bad request line\"}"); return; }
                String method = rl[0];
                String path = rl[1];

                // Парсим заголовки
                String auth = "";
                int contentLength = 0;
                for (int i = 1; i < lines.length; i++) {
                    String l = lines[i];
                    int colon = l.indexOf(':');
                    if (colon == -1) continue;
                    String key = l.substring(0, colon).trim().toLowerCase();
                    String val = l.substring(colon + 1).trim();
                    if ("authorization".equals(key)) auth = val;
                    if ("content-length".equals(key)) {
                        try { contentLength = Integer.parseInt(val); } catch (Exception e) {}
                    }
                }

                // Читаем тело в байтах
                String body = "";
                if (contentLength > 0) {
                    byte[] bodyBytes = new byte[contentLength];
                    int read = 0;
                    while (read < contentLength) {
                        int n = in.read(bodyBytes, read, contentLength - read);
                        if (n == -1) break;
                        read += n;
                    }
                    body = new String(bodyBytes, 0, read, StandardCharsets.UTF_8);
                }

                // === HEALTH ===
                if ("/health".equals(path)) {
                    send(200, "{\"status\":\"ok\",\"plugin\":\"HipexMcDelivery\"}");
                    return;
                }

                if (!"/execute".equals(path)) {
                    send(404, "{\"error\":\"Not found\"}");
                    return;
                }

                if ("change-me".equals(apiKey)) {
                    send(500, "{\"error\":\"API key not configured\"}");
                    return;
                }

                if (!auth.startsWith("Bearer ") || !auth.substring(7).equals(apiKey)) {
                    send(401, "{\"error\":\"Invalid API key\"}");
                    return;
                }

                if (!"POST".equals(method)) {
                    send(405, "{\"error\":\"Only POST allowed\"}");
                    return;
                }

                // Парсим JSON
                String nick = extract(body, "nickname");
                String prod = extract(body, "product_name");
                String[] cmds = extractArray(body, "commands");

                if (cmds == null || cmds.length == 0) {
                    send(200, "{\"status\":\"ok\",\"executed\":0}");
                    return;
                }

                int executed = 0;
                for (String cmd : cmds) {
                    cmd = cmd.replace("{player}", nick != null ? nick : "unknown");
                    cmd = cmd.replace("{product}", prod != null ? prod : "unknown");
                    execute(cmd);
                    executed++;
                }

                if (logCommands)
                    getLogger().info("Выполнено " + executed + " команд для " + nick);

                send(200, "{\"status\":\"ok\",\"executed\":" + executed + "}");

            } catch (Exception e) {
                getLogger().severe("Error: " + e.getClass().getSimpleName() + " — " + e.getMessage());
                try { send(500, "{\"error\":\"Internal error\"}"); } catch (Exception ignored) {}
            } finally {
                try { socket.close(); } catch (Exception ignored) {}
            }
        }

        private void send(int code, String json) throws IOException {
            String reason = code == 200 ? "OK" : code == 400 ? "Bad Request" :
                    code == 401 ? "Unauthorized" : code == 404 ? "Not Found" :
                    code == 405 ? "Method Not Allowed" : "Internal Server Error";
            byte[] data = json.getBytes(StandardCharsets.UTF_8);
            String headers = "HTTP/1.1 " + code + " " + reason + "\r\n" +
                    "Content-Type: application/json; charset=utf-8\r\n" +
                    "Content-Length: " + data.length + "\r\n" +
                    "Connection: close\r\n" +
                    "Access-Control-Allow-Origin: *\r\n" +
                    "\r\n";
            out.write(headers.getBytes(StandardCharsets.UTF_8));
            out.write(data);
            out.flush();
        }
    }

    // ========== JSON (без зависимостей) ==========
    private static String extract(String json, String key) {
        String q = "\"" + key + "\":\"";
        int s = json.indexOf(q);
        if (s == -1) return null;
        s += q.length();
        int e = json.indexOf("\"", s);
        if (e == -1) return null;
        return json.substring(s, e).replace("\\\"", "\"").replace("\\\\", "\\");
    }

    private static String[] extractArray(String json, String key) {
        String q = "\"" + key + "\":[";
        int s = json.indexOf(q);
        if (s == -1) return null;
        s += q.length();
        int depth = 1, e = s;
        while (e < json.length() && depth > 0) {
            char c = json.charAt(e);
            if (c == '[') depth++;
            else if (c == ']') depth--;
            e++;
        }
        String inner = json.substring(s, e - 1).trim();
        if (inner.isEmpty() || "null".equals(inner)) return new String[0];

        java.util.List<String> list = new java.util.ArrayList<>();
        int i = 0;
        while (i < inner.length()) {
            if (inner.charAt(i) == '"') {
                i++;
                StringBuilder sb = new StringBuilder();
                while (i < inner.length() && inner.charAt(i) != '"') {
                    if (inner.charAt(i) == '\\' && i + 1 < inner.length()) i++;
                    sb.append(inner.charAt(i));
                    i++;
                }
                list.add(sb.toString());
                i++;
            } else i++;
        }
        return list.toArray(new String[0]);
    }
}

