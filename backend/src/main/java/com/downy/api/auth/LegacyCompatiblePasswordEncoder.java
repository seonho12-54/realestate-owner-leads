package com.downy.api.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.HexFormat;
import org.bouncycastle.crypto.generators.SCrypt;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.StringUtils;

public class LegacyCompatiblePasswordEncoder implements PasswordEncoder {

    private static final int SALT_BYTES = 16;
    private static final int DERIVED_KEY_BYTES = 64;
    private static final int CPU_COST = 16384;
    private static final int MEMORY_COST = 8;
    private static final int PARALLELIZATION = 1;

    private final SecureRandom secureRandom = new SecureRandom();
    private final BCryptPasswordEncoder bcryptPasswordEncoder = new BCryptPasswordEncoder();
    private final HexFormat hexFormat = HexFormat.of();

    @Override
    public String encode(CharSequence rawPassword) {
        byte[] salt = new byte[SALT_BYTES];
        secureRandom.nextBytes(salt);
        byte[] derived = derive(rawPassword, salt);
        return "scrypt:" + hexFormat.formatHex(salt) + ":" + hexFormat.formatHex(derived);
    }

    @Override
    public boolean matches(CharSequence rawPassword, String encodedPassword) {
        if (!StringUtils.hasText(encodedPassword)) {
            return false;
        }

        if (encodedPassword.startsWith("scrypt:")) {
            return matchesLegacyScrypt(rawPassword, encodedPassword);
        }

        if (encodedPassword.startsWith("$2a$") || encodedPassword.startsWith("$2b$") || encodedPassword.startsWith("$2y$")) {
            return bcryptPasswordEncoder.matches(rawPassword, encodedPassword);
        }

        return false;
    }

    @Override
    public boolean upgradeEncoding(String encodedPassword) {
        return false;
    }

    private boolean matchesLegacyScrypt(CharSequence rawPassword, String encodedPassword) {
        String[] parts = encodedPassword.split(":");
        if (parts.length != 3) {
            return false;
        }

        try {
            byte[] salt = hexFormat.parseHex(parts[1]);
            byte[] expected = hexFormat.parseHex(parts[2]);
            byte[] actual = derive(rawPassword, salt);
            return MessageDigest.isEqual(actual, expected);
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private byte[] derive(CharSequence rawPassword, byte[] salt) {
        return SCrypt.generate(
            rawPassword.toString().getBytes(StandardCharsets.UTF_8),
            salt,
            CPU_COST,
            MEMORY_COST,
            PARALLELIZATION,
            DERIVED_KEY_BYTES
        );
    }
}
