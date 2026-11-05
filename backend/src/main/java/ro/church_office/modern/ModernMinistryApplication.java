package ro.church_office.modern;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ModernMinistryApplication {
    private static final String DATA_DIR_PROPERTY = "modern.ministry.data-dir";
    private static final String DATA_DIR_ENV = "MODERN_MINISTRY_DATA_DIR";
    private static final String DATA_DIR_ARG_PREFIX = "--modern.ministry.data-dir=";

    public static void main(String[] args) {
        configureDataDirectory(args);
        SpringApplication.run(ModernMinistryApplication.class, args);
    }

    private static void configureDataDirectory(String[] args) {
        String argDir = findDataDirectoryArgument(args);
        if (argDir != null && !argDir.isBlank()) {
            ensureDirectory(Path.of(argDir));
            return;
        }

        if (System.getProperty(DATA_DIR_PROPERTY) != null && !System.getProperty(DATA_DIR_PROPERTY).isBlank()) {
            ensureDirectory(Path.of(System.getProperty(DATA_DIR_PROPERTY)));
            return;
        }

        String envDir = System.getenv(DATA_DIR_ENV);
        Path dataDir = envDir == null || envDir.isBlank()
                ? Path.of(System.getProperty("user.home"), ".modern-ministry", "data")
                : Path.of(envDir);
        ensureDirectory(dataDir);
        System.setProperty(DATA_DIR_PROPERTY, dataDir.toAbsolutePath().toString());
    }

    private static String findDataDirectoryArgument(String[] args) {
        if (args == null) {
            return null;
        }
        for (String arg : args) {
            if (arg != null && arg.startsWith(DATA_DIR_ARG_PREFIX)) {
                return arg.substring(DATA_DIR_ARG_PREFIX.length());
            }
        }
        return null;
    }

    private static void ensureDirectory(Path dataDir) {
        try {
            Files.createDirectories(dataDir);
        } catch (IOException ex) {
            throw new IllegalStateException("Could not create data directory: " + dataDir, ex);
        }
    }
}
