package ro.church_office.modern.launcher;

import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JCheckBox;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JProgressBar;
import javax.swing.JScrollPane;
import javax.swing.JTextArea;
import javax.swing.SwingUtilities;
import javax.swing.Timer;
import javax.swing.WindowConstants;
import java.awt.BorderLayout;
import java.awt.Desktop;
import java.awt.FlowLayout;
import java.awt.GridLayout;
import java.awt.Toolkit;
import java.awt.datatransfer.StringSelection;
import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.StandardOpenOption;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public final class ModernMinistryLauncher {
    private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final int DESKTOP_PORT = 80;
    private static final String BASE_URL = DESKTOP_PORT == 80 ? "http://localhost" : "http://localhost:" + DESKTOP_PORT;
    private static final int MAX_LOG_CHARS = 200_000;
    private static final int DEFAULT_WIDTH = 620;
    private static final int DEFAULT_HEIGHT = 220;
    private static final int DEBUG_WIDTH = 920;
    private static final int DEBUG_HEIGHT = 560;

    private final JFrame frame = new JFrame("Modern Ministry Launcher");
    private final JTextArea logs = new JTextArea(22, 100);
    private final JScrollPane logScrollPane = new JScrollPane(logs);
    private final JLabel status = new JLabel("Status: oprit");
    private final JLabel appAddress = new JLabel("Adresa aplicatie: " + BASE_URL);
    private final JLabel location = new JLabel("Date locale: -");
    private final JProgressBar progressBar = new JProgressBar(0, 100);
    private final JCheckBox debugModeToggle = new JCheckBox("Debug mode");
    private final JButton startButton = new JButton("Start");
    private final JButton stopButton = new JButton("Stop");
    private final JButton browserButton = new JButton("Deschide aplicatia");
    private final JButton copyAddressButton = new JButton("Copiaza adresa");
    private final JButton releasePortButton = new JButton("Elibereaza portul si reporneste");
    private final JButton closeButton = new JButton("Inchide aplicatia");
    private final Timer progressTimer;

    private volatile Process childProcess;
    private volatile boolean startupComplete;
    private int startupProgress;

    public static void main(String[] args) {
        System.setProperty("java.awt.headless", "false");
        System.setProperty("apple.awt.UIElement", "false");
        Thread.setDefaultUncaughtExceptionHandler((thread, error) ->
                writeLauncherLog("Uncaught exception on " + thread.getName() + ": " + error));
        writeLauncherLog("Launcher main started.");
        SwingUtilities.invokeLater(() -> {
            try {
                new ModernMinistryLauncher().show();
            } catch (Throwable error) {
                writeLauncherLog("Launcher UI failed: " + error);
                throw error;
            }
        });
    }

    private ModernMinistryLauncher() {
        buildUi();
        new Timer(800, e -> refreshButtons()).start();
        progressTimer = new Timer(250, e -> advanceStartupProgress());
    }

    private void buildUi() {
        frame.setDefaultCloseOperation(WindowConstants.DO_NOTHING_ON_CLOSE);
        frame.setLayout(new BorderLayout(8, 8));
        frame.setAutoRequestFocus(true);
        frame.addWindowListener(new java.awt.event.WindowAdapter() {
            @Override
            public void windowClosing(java.awt.event.WindowEvent e) {
                requestExit();
            }
        });

        logs.setEditable(false);
        logs.setLineWrap(true);
        logs.setWrapStyleWord(true);

        JPanel top = new JPanel(new BorderLayout(10, 10));
        top.setBorder(BorderFactory.createEmptyBorder(16, 18, 12, 18));

        JPanel header = new JPanel(new BorderLayout(10, 0));

        JPanel details = new JPanel(new GridLayout(3, 1, 4, 2));
        details.add(status);
        details.add(appAddress);
        details.add(location);
        header.add(details, BorderLayout.CENTER);

        debugModeToggle.setFocusPainted(false);
        header.add(debugModeToggle, BorderLayout.EAST);
        top.add(header, BorderLayout.CENTER);

        progressBar.setStringPainted(true);
        progressBar.setValue(0);
        progressBar.setString("Pregatit");
        top.add(progressBar, BorderLayout.EAST);

        JPanel actions = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 0));
        actions.add(startButton);
        actions.add(stopButton);
        actions.add(browserButton);
        actions.add(copyAddressButton);
        actions.add(releasePortButton);
        actions.add(closeButton);
        top.add(actions, BorderLayout.SOUTH);

        startButton.addActionListener(e -> startServer());
        stopButton.addActionListener(e -> stopServer());
        browserButton.addActionListener(e -> openBrowser());
        copyAddressButton.addActionListener(e -> copyAddress());
        releasePortButton.addActionListener(e -> releasePortAndRestart());
        closeButton.addActionListener(e -> requestExit());
        debugModeToggle.addActionListener(e -> updateDebugMode());

        frame.add(top, BorderLayout.NORTH);
        frame.add(logScrollPane, BorderLayout.CENTER);
        updateDebugMode();
        frame.setLocationRelativeTo(null);
        writeLauncherLog("Launcher frame built.");
    }

    private void show() {
        writeLauncherLog("Showing launcher frame.");
        activateMacApplication();
        frame.setVisible(true);
        minimizeControlWindow();
        appendLog("Launcher pornit. Pornesc Modern Ministry.");
        appendLog("Adresa aplicatie: " + BASE_URL);
        startServer();
    }

    private synchronized void startServer() {
        if (isRunning()) {
            appendLog("Aplicatia este deja pornita.");
            return;
        }
        try {
            String appPath = System.getProperty("jpackage.app-path");
            if (appPath == null || appPath.isBlank()) {
                throw new IllegalStateException("Lipseste jpackage.app-path.");
            }
            Path appExecutable = Paths.get(appPath).toAbsolutePath().normalize();
            Path javaBin = resolveJavaBin(appExecutable);
            Path appDir = resolveAppDir(appExecutable);
            Path bootJar = resolveBootJar(appDir);
            Path homePath = Paths.get(System.getProperty("user.home"), "ModernMinistry").toAbsolutePath().normalize();
            Path dataDir = homePath.resolve("data");
            Path logsDir = homePath.resolve("logs");
            Path uploadsDir = homePath.resolve("uploads");
            Files.createDirectories(dataDir);
            Files.createDirectories(logsDir);
            Files.createDirectories(uploadsDir);

            List<String> cmd = new ArrayList<>();
            cmd.add(javaBin.toString());
            cmd.add("-Dfile.encoding=UTF-8");
            cmd.add("-jar");
            cmd.add(bootJar.toString());
            cmd.add("--server.port=" + DESKTOP_PORT);
            cmd.add("--modern.ministry.data-dir=" + dataDir);
            cmd.add("--app.security.cors-allowed-origins=http://localhost:4200," + BASE_URL);

            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.redirectErrorStream(true);
            pb.directory(new File(homePath.toString()));
            childProcess = pb.start();

            setStarting();
            updateLocation(dataDir);
            writeLauncherLog("Backend process started on " + BASE_URL + ".");
            appendLog("Pornire server pe " + BASE_URL);
            appendLog("Date locale: " + dataDir);

            Thread streamReader = new Thread(() -> pumpLogs(childProcess), "modern-ministry-log-reader");
            streamReader.setDaemon(true);
            streamReader.start();

            Thread startupWatcher = new Thread(this::waitForStartup, "modern-ministry-startup-watcher");
            startupWatcher.setDaemon(true);
            startupWatcher.start();

            Thread waiter = new Thread(() -> {
                try {
                    int code = childProcess.waitFor();
                    appendLog("Aplicatia s-a oprit. Exit code=" + code);
                } catch (InterruptedException ignored) {
                    Thread.currentThread().interrupt();
                } finally {
                    childProcess = null;
                    setStopped();
                }
            }, "modern-ministry-exit-watcher");
            waiter.setDaemon(true);
            waiter.start();
        } catch (Exception ex) {
            writeLauncherLog("Backend start failed: " + ex);
            appendLog("Eroare la pornire: " + ex.getMessage());
            setError();
        }
        refreshButtons();
    }

    private Path resolveJavaBin(Path appExecutable) {
        List<Path> candidates = new ArrayList<>();
        Path executableDir = appExecutable.getParent();
        if (executableDir != null) {
            candidates.add(executableDir.resolve("../runtime/Contents/Home/bin/java").normalize());
            candidates.add(executableDir.resolve("runtime/bin/java.exe").normalize());
            candidates.add(executableDir.resolve("runtime/bin/java").normalize());
            candidates.add(executableDir.resolve("../runtime/bin/java.exe").normalize());
            candidates.add(executableDir.resolve("../runtime/bin/java").normalize());
        }
        for (Path candidate : candidates) {
            if (Files.isRegularFile(candidate)) {
                return candidate.toAbsolutePath().normalize();
            }
        }
        return candidates.isEmpty() ? Paths.get("java") : candidates.get(0).toAbsolutePath().normalize();
    }

    private Path resolveAppDir(Path appExecutable) {
        List<Path> candidates = new ArrayList<>();
        Path executableDir = appExecutable.getParent();
        if (executableDir != null) {
            candidates.add(executableDir.resolve("../app").normalize());
            candidates.add(executableDir.resolve("app").normalize());
            candidates.add(executableDir.resolve("../lib/app").normalize());
        }
        for (Path candidate : candidates) {
            if (Files.isDirectory(candidate)) {
                return candidate.toAbsolutePath().normalize();
            }
        }
        return candidates.isEmpty() ? Paths.get("app") : candidates.get(0).toAbsolutePath().normalize();
    }

    private Path resolveBootJar(Path appDir) throws IOException {
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(appDir, "modern-ministry-backend-*.jar")) {
            for (Path candidate : stream) {
                String name = candidate.getFileName().toString();
                if (!name.endsWith(".jar.original")) {
                    return candidate;
                }
            }
        }
        throw new IllegalStateException("Nu gasesc jar-ul backend in: " + appDir);
    }

    private synchronized void stopServer() {
        if (!isRunning()) {
            setStopped();
            return;
        }
        appendLog("Oprire aplicatie...");
        childProcess.destroy();
        setStopped();
        refreshButtons();
    }

    private void releasePortAndRestart() {
        Thread thread = new Thread(() -> {
            appendLog("Verific procesele care folosesc portul " + DESKTOP_PORT + "...");
            stopServer();
            Set<Long> pids = findListeningPids(DESKTOP_PORT);
            long currentPid = ProcessHandle.current().pid();
            pids.remove(currentPid);
            if (pids.isEmpty()) {
                appendLog("Nu am gasit un proces extern pe portul " + DESKTOP_PORT + ".");
            } else {
                for (Long pid : pids) {
                    stopProcess(pid);
                }
            }
            waitForPortToBeFree();
            SwingUtilities.invokeLater(this::startServer);
        }, "modern-ministry-release-port");
        thread.setDaemon(true);
        thread.start();
    }

    private Set<Long> findListeningPids(int port) {
        String osName = System.getProperty("os.name", "").toLowerCase(Locale.ROOT);
        if (osName.contains("win")) {
            return findWindowsListeningPids(port);
        }
        return findUnixListeningPids(port);
    }

    private Set<Long> findUnixListeningPids(int port) {
        Set<Long> pids = new LinkedHashSet<>();
        Process process = null;
        try {
            process = new ProcessBuilder("lsof", "-nP", "-ti", "tcp:" + port, "-sTCP:LISTEN")
                    .redirectErrorStream(true)
                    .start();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    parsePid(line).ifPresent(pids::add);
                }
            }
            process.waitFor();
        } catch (Exception ex) {
            appendLog("Nu pot verifica portul cu lsof: " + ex.getMessage());
        } finally {
            if (process != null) {
                process.destroy();
            }
        }
        return pids;
    }

    private Set<Long> findWindowsListeningPids(int port) {
        Set<Long> pids = new LinkedHashSet<>();
        Process process = null;
        try {
            process = new ProcessBuilder("netstat", "-ano", "-p", "tcp")
                    .redirectErrorStream(true)
                    .start();
            String needle = ":" + port;
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    String normalized = line.trim().replaceAll("\\s+", " ");
                    if (!normalized.contains(needle) || !normalized.toUpperCase(Locale.ROOT).contains("LISTENING")) {
                        continue;
                    }
                    String[] parts = normalized.split(" ");
                    if (parts.length > 0) {
                        parsePid(parts[parts.length - 1]).ifPresent(pids::add);
                    }
                }
            }
            process.waitFor();
        } catch (Exception ex) {
            appendLog("Nu pot verifica portul cu netstat: " + ex.getMessage());
        } finally {
            if (process != null) {
                process.destroy();
            }
        }
        return pids;
    }

    private java.util.Optional<Long> parsePid(String value) {
        try {
            String trimmed = value == null ? "" : value.trim();
            if (trimmed.isEmpty()) {
                return java.util.Optional.empty();
            }
            return java.util.Optional.of(Long.parseLong(trimmed));
        } catch (NumberFormatException ex) {
            return java.util.Optional.empty();
        }
    }

    private void stopProcess(long pid) {
        try {
            java.util.Optional<ProcessHandle> handle = ProcessHandle.of(pid);
            if (handle.isEmpty()) {
                appendLog("PID " + pid + " nu mai exista.");
                return;
            }
            appendLog("Opresc procesul de pe portul " + DESKTOP_PORT + " (PID " + pid + ")...");
            ProcessHandle process = handle.get();
            process.destroy();
            Thread.sleep(1200);
            if (process.isAlive()) {
                appendLog("Procesul PID " + pid + " nu s-a oprit normal. Fortez oprirea.");
                process.destroyForcibly();
            }
        } catch (Exception ex) {
            appendLog("Nu pot opri PID " + pid + ": " + ex.getMessage());
        }
    }

    private void waitForPortToBeFree() {
        for (int i = 0; i < 20; i++) {
            if (!isApplicationReady() && findListeningPids(DESKTOP_PORT).isEmpty()) {
                appendLog("Portul " + DESKTOP_PORT + " este liber.");
                return;
            }
            try {
                Thread.sleep(300);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                return;
            }
        }
        appendLog("Portul " + DESKTOP_PORT + " pare inca ocupat; incerc repornirea oricum.");
    }

    private void requestExit() {
        stopServer();
        frame.dispose();
        System.exit(0);
    }

    private void openBrowser() {
        try {
            if (Desktop.isDesktopSupported()) {
                Desktop.getDesktop().browse(URI.create(BASE_URL));
                minimizeControlWindow();
            }
        } catch (Exception ex) {
            appendLog("Nu pot deschide browserul: " + ex.getMessage());
        }
    }

    private void copyAddress() {
        Toolkit.getDefaultToolkit().getSystemClipboard().setContents(new StringSelection(BASE_URL), null);
        appendLog("Adresa copiata: " + BASE_URL);
    }

    private void bringControlWindowToFront() {
        SwingUtilities.invokeLater(() -> {
            frame.setState(JFrame.NORMAL);
            frame.setVisible(true);
            frame.setAlwaysOnTop(true);
            frame.toFront();
            frame.requestFocus();
            frame.requestFocusInWindow();
            Timer timer = new Timer(5000, e -> frame.setAlwaysOnTop(false));
            timer.setRepeats(false);
            timer.start();
        });
    }

    private void minimizeControlWindow() {
        SwingUtilities.invokeLater(() -> {
            frame.setAlwaysOnTop(false);
            frame.setState(JFrame.ICONIFIED);
        });
    }

    private void activateMacApplication() {
        String osName = System.getProperty("os.name", "").toLowerCase();
        if (!osName.contains("mac")) {
            return;
        }
        try {
            Class<?> applicationClass = Class.forName("com.apple.eawt.Application");
            Object application = applicationClass.getMethod("getApplication").invoke(null);
            applicationClass.getMethod("requestForeground", boolean.class).invoke(application, true);
        } catch (Exception ignored) {
            // Older or modular JDKs may not expose this API; the Swing focus fallback remains active.
        }
    }

    private void waitForStartup() {
        for (int i = 0; i < 120; i++) {
            if (!isRunning()) {
                return;
            }
            if (isApplicationReady()) {
                appendLog("Aplicatia este disponibila la " + BASE_URL);
                setRunning();
                openBrowser();
                minimizeControlWindow();
                return;
            }
            try {
                Thread.sleep(500);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                return;
            }
        }
        appendLog("Aplicatia inca porneste. Verifica logurile din fereastra.");
    }

    private boolean isApplicationReady() {
        HttpURLConnection connection = null;
        try {
            URL url = URI.create(BASE_URL + "/api/auth/login").toURL();
            connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(300);
            connection.setReadTimeout(300);
            connection.setInstanceFollowRedirects(false);
            int code = connection.getResponseCode();
            return code >= 200 && code < 500;
        } catch (Exception ex) {
            return false;
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private void pumpLogs(Process process) {
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                appendLog(line);
            }
        } catch (IOException ex) {
            appendLog("Flux log inchis: " + ex.getMessage());
        }
    }

    private boolean isRunning() {
        Process p = childProcess;
        return p != null && p.isAlive();
    }

    private void refreshButtons() {
        boolean running = isRunning();
        startButton.setEnabled(!running);
        stopButton.setEnabled(running);
        browserButton.setEnabled(running || startupComplete);
        releasePortButton.setEnabled(!running);
    }

    private void updateDebugMode() {
        boolean debug = debugModeToggle.isSelected();
        logScrollPane.setVisible(debug);
        location.setVisible(debug);
        copyAddressButton.setVisible(debug);
        releasePortButton.setVisible(debug);
        frame.setSize(debug ? DEBUG_WIDTH : DEFAULT_WIDTH, debug ? DEBUG_HEIGHT : DEFAULT_HEIGHT);
        frame.revalidate();
        frame.repaint();
    }

    private void setStarting() {
        startupComplete = false;
        startupProgress = 8;
        SwingUtilities.invokeLater(() -> {
            status.setText("Status: pornire");
            progressBar.setValue(startupProgress);
            progressBar.setString("Se incarca...");
        });
        progressTimer.start();
    }

    private void setRunning() {
        startupComplete = true;
        progressTimer.stop();
        SwingUtilities.invokeLater(() -> {
            status.setText("Status: ruleaza");
            progressBar.setValue(100);
            progressBar.setString("Aplicatia este pornita");
        });
    }

    private void setStopped() {
        startupComplete = false;
        progressTimer.stop();
        SwingUtilities.invokeLater(() -> {
            status.setText("Status: oprit");
            progressBar.setValue(0);
            progressBar.setString("Oprit");
        });
    }

    private void setError() {
        startupComplete = false;
        progressTimer.stop();
        SwingUtilities.invokeLater(() -> {
            status.setText("Status: eroare");
            progressBar.setValue(0);
            progressBar.setString("Eroare la pornire");
        });
    }

    private void advanceStartupProgress() {
        if (startupComplete || !isRunning()) {
            return;
        }
        if (startupProgress < 90) {
            startupProgress += startupProgress < 55 ? 4 : 1;
            progressBar.setValue(Math.min(startupProgress, 90));
            progressBar.setString("Se incarca... " + progressBar.getValue() + "%");
        }
    }

    private void updateLocation(Path dataDir) {
        SwingUtilities.invokeLater(() -> location.setText("Date locale: " + dataDir));
    }

    private void appendLog(String msg) {
        writeLauncherLog(msg);
        String line = "[" + LocalDateTime.now().format(TS) + "] " + msg + "\n";
        SwingUtilities.invokeLater(() -> {
            logs.append(line);
            String text = logs.getText();
            if (text.length() > MAX_LOG_CHARS) {
                logs.setText(text.substring(text.length() - MAX_LOG_CHARS));
            }
            logs.setCaretPosition(logs.getDocument().getLength());
        });
    }

    private static void writeLauncherLog(String msg) {
        try {
            Path logDir = Paths.get(System.getProperty("user.home"), "ModernMinistry", "logs");
            Files.createDirectories(logDir);
            String line = "[" + LocalDateTime.now().format(TS) + "] " + msg + "\n";
            Files.writeString(logDir.resolve("launcher.log"), line, StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.APPEND);
        } catch (Exception ignored) {
            // Logging must never prevent the launcher from starting.
        }
    }
}
