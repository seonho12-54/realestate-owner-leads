package com.downy.api.auth;

public final class SessionModels {

    private SessionModels() {
    }

    public enum SessionKind {
        ADMIN,
        USER
    }

    public record AdminSession(long adminId, Long officeId, String email, String name, String role, long exp) {
    }

    public record UserSession(long userId, String email, String name, long exp) {
    }

    public record SessionSnapshot(AdminSession admin, UserSession user) {

        public boolean isAuthenticated() {
            return admin != null || user != null;
        }
    }
}
