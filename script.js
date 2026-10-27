/* =========================================================
   GREEN HONEY BADGER SYSTEM
   SCRIPT.JS — LOCAL + SUPABASE AUTHENTICATION
   Core + Authentication + Recovery + Licensing + Permissions
========================================================= */

"use strict";

/* =========================================================
   A. GBH CONFIGURATION
========================================================= */

const GBH_CONFIG = {
    SYSTEM_NAME: "GREEN HONEY BADGER SYSTEM",
    VERSION: "1.0.0",

    SESSION_KEY: "gbhSession",
    USERS_KEY: "systemUsers",
    TEACHERS_KEY: "teachers",
    STUDENTS_KEY: "students",
    EXAM_RESULTS_KEY: "examResults",
    FEES_KEY: "fees",
    SCHOOL_DETAILS_KEY: "schoolDetails",
    ACADEMIC_SETTINGS_KEY: "academicSettings",
    ADMIN_SETTINGS_KEY: "administratorSettings",
    APPEARANCE_SETTINGS_KEY: "appearanceSettings",
    RECOVERY_SETTINGS_KEY: "gbhRecoverySettings",
    KEY_VALIDATION_KEY: "gbhKeysValidatedAt",

    SESSION_DURATION: 8 * 60 * 60 * 1000,
    RECOVERY_DURATION: 10 * 60 * 1000,

    TEMPORARY_LICENCE_BYPASS: false,
    LICENCE_SERVER: "http://localhost:3000",

    DEFAULT_ADMIN_USERNAME: "admin",
    DEFAULT_ADMIN_PASSWORD: "GBHadmin2026",
    DEFAULT_ADMIN_NAME: "System Administrator"
};

const GBH_ROLES = {
    ADMIN: "System Administrator",
    PRINCIPAL: "Principal-Headteacher",
    EXAMINATION: "Examination Department",
    BURSAR: "Bursar",
    CLASS_TEACHER: "Class Teacher",
    TEACHER: "Teacher"
};

const GBH_PUBLIC_PAGES = [
    "",
    "index.html",
    "activation.html",
    "login.html",
    "forgot_password.html",
    "change_password.html"
];

const GBH_PAGE_ACCESS = {
    "dashboard.html": [
        GBH_ROLES.ADMIN, GBH_ROLES.PRINCIPAL,
        GBH_ROLES.EXAMINATION, GBH_ROLES.BURSAR,
        GBH_ROLES.CLASS_TEACHER, GBH_ROLES.TEACHER
    ],
    "students.html": [
        GBH_ROLES.ADMIN, GBH_ROLES.PRINCIPAL,
        GBH_ROLES.CLASS_TEACHER
    ],
    "teachers.html": [
        GBH_ROLES.ADMIN, GBH_ROLES.PRINCIPAL
    ],
    "examination.html": [
        GBH_ROLES.ADMIN, GBH_ROLES.PRINCIPAL,
        GBH_ROLES.EXAMINATION, GBH_ROLES.CLASS_TEACHER,
        GBH_ROLES.TEACHER
    ],
    "learner-report.html": [
        GBH_ROLES.ADMIN, GBH_ROLES.PRINCIPAL,
        GBH_ROLES.EXAMINATION
    ],
    "report.html": [
        GBH_ROLES.ADMIN, GBH_ROLES.PRINCIPAL,
        GBH_ROLES.EXAMINATION
    ],
    "reports.html": [
        GBH_ROLES.ADMIN, GBH_ROLES.PRINCIPAL,
        GBH_ROLES.EXAMINATION
    ],
    "assessment_reports.html": [
        GBH_ROLES.ADMIN, GBH_ROLES.PRINCIPAL,
        GBH_ROLES.EXAMINATION
    ],
    "whole_assessment_report.html": [
        GBH_ROLES.ADMIN, GBH_ROLES.PRINCIPAL,
        GBH_ROLES.EXAMINATION
    ],
    "fees.html": [
        GBH_ROLES.ADMIN, GBH_ROLES.PRINCIPAL,
        GBH_ROLES.BURSAR
    ],
    "timetable.html": [
        GBH_ROLES.ADMIN, GBH_ROLES.PRINCIPAL
    ],
    "Timetable.html": [
        GBH_ROLES.ADMIN, GBH_ROLES.PRINCIPAL
    ],
    "users.html": [
        GBH_ROLES.ADMIN, GBH_ROLES.PRINCIPAL
    ],
    "settings.html": [
        GBH_ROLES.ADMIN, GBH_ROLES.PRINCIPAL
    ],
    "administration.html": [
        GBH_ROLES.ADMIN
    ]
};

const GBH_LICENCE_KEYS = {
    CACHE: "gbhLicenceCache",
    DEVICE_ID: "gbhDeviceId",
    KEY: "gbhLicenceKey",
    DEVICE: "gbhLicenceDeviceId",
    STATUS: "gbhLicenceStatus",
    EXPIRY: "gbhLicenceExpiry",
    SCHOOL_NAME: "gbhLicenceSchoolName",
    SCHOOL_CODE: "gbhLicenceSchoolCode",
    PRODUCT: "gbhLicenceProduct",
    ACTIVATION_DATE: "gbhLicenceActivationDate"
};

const GBH_RECOVERY_SESSION_KEY = "gbhPasswordRecoverySession";

/* =========================================================
   B. STORAGE HELPERS
========================================================= */

function gbhReadJSON(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        if (value === null || value === "") return fallback;
        return JSON.parse(value);
    } catch (error) {
        console.error("GBH storage read error:", key, error);
        return fallback;
    }
}

function gbhWriteJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error("GBH storage write error:", key, error);
        return false;
    }
}

function gbhRemoveStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error("GBH storage remove error:", key, error);
        return false;
    }
}

function getCurrentGBHPage() {
    return window.location.pathname.split("/").pop() || "index.html";
}

function getGBHSupabaseClient() {
    return window.GBH_SUPABASE_CLIENT || null;
}

/* =========================================================
   C. ROLE NORMALISATION
========================================================= */

function normaliseGBHRole(role) {
    if (!role) return "";

    const value = String(role).trim().toLowerCase();

    const roles = {
        "system administrator": GBH_ROLES.ADMIN,
        "administrator": GBH_ROLES.ADMIN,
        "admin": GBH_ROLES.ADMIN,
        "principal-headteacher": GBH_ROLES.PRINCIPAL,
        "principal": GBH_ROLES.PRINCIPAL,
        "headteacher": GBH_ROLES.PRINCIPAL,
        "examination department": GBH_ROLES.EXAMINATION,
        "examination": GBH_ROLES.EXAMINATION,
        "bursar": GBH_ROLES.BURSAR,
        "class teacher": GBH_ROLES.CLASS_TEACHER,
        "teacher": GBH_ROLES.TEACHER
    };

    return roles[value] || String(role).trim();
}

function userHasGBHRole(user, role) {
    return !!user &&
        normaliseGBHRole(user.role) === normaliseGBHRole(role);
}

function isRecognisedGBHRole(role) {
    return Object.values(GBH_ROLES).includes(normaliseGBHRole(role));
}

/* =========================================================
   D. STORAGE INITIALISATION
========================================================= */

function initialiseGBHStorage() {
    [
        GBH_CONFIG.TEACHERS_KEY,
        GBH_CONFIG.STUDENTS_KEY,
        GBH_CONFIG.EXAM_RESULTS_KEY,
        GBH_CONFIG.FEES_KEY
    ].forEach(function (key) {
        if (localStorage.getItem(key) === null) {
            gbhWriteJSON(key, []);
        }
    });

    [
        GBH_CONFIG.SCHOOL_DETAILS_KEY,
        GBH_CONFIG.ACADEMIC_SETTINGS_KEY,
        GBH_CONFIG.ADMIN_SETTINGS_KEY,
        GBH_CONFIG.APPEARANCE_SETTINGS_KEY,
        GBH_CONFIG.RECOVERY_SETTINGS_KEY
    ].forEach(function (key) {
        if (localStorage.getItem(key) === null) {
            gbhWriteJSON(key, {});
        }
    });
}

function createDefaultGBHAdministrator() {
    return {
        id: "GBH-ADMIN-001",
        userId: "GBH-ADMIN-001",
        username: GBH_CONFIG.DEFAULT_ADMIN_USERNAME,
        password: GBH_CONFIG.DEFAULT_ADMIN_PASSWORD,
        fullName: GBH_CONFIG.DEFAULT_ADMIN_NAME,
        name: GBH_CONFIG.DEFAULT_ADMIN_NAME,
        role: GBH_ROLES.ADMIN,
        status: "Active",
        active: true,
        mustChangePassword: false,
        teacherId: "",
        tscNumber: "",
        classTeacher: false,
        className: "",
        learningAreas: [],
        createdAt: new Date().toISOString(),
        lastLogin: null
    };
}

function initialiseUsers() {
    let users = gbhReadJSON(GBH_CONFIG.USERS_KEY, []);
    if (!Array.isArray(users)) users = [];

    let admin = users.find(function (user) {
        return String(user.username || "").trim().toLowerCase() ===
            GBH_CONFIG.DEFAULT_ADMIN_USERNAME.toLowerCase();
    });

    if (!admin) {
        users.push(createDefaultGBHAdministrator());
    } else {
        admin.role = GBH_ROLES.ADMIN;
        admin.status = admin.status || "Active";
        admin.active = admin.active !== false;
        admin.fullName = admin.fullName || admin.name ||
            GBH_CONFIG.DEFAULT_ADMIN_NAME;
        admin.name = admin.name || admin.fullName;
        admin.learningAreas = Array.isArray(admin.learningAreas)
            ? admin.learningAreas : [];
    }

    users = users.map(function (user) {
        const id = user.id || user.userId ||
            ("GBH-USER-" + Date.now() + "-" +
                Math.random().toString(36).substring(2, 8));

        return {
            ...user,
            id: id,
            userId: user.userId || id,
            username: String(user.username || "").trim(),
            role: normaliseGBHRole(user.role),
            status: user.status || "Active",
            active: user.active !== false,
            fullName: user.fullName || user.name || user.username,
            name: user.name || user.fullName || user.username,
            learningAreas: Array.isArray(user.learningAreas)
                ? user.learningAreas : []
        };
    });

    gbhWriteJSON(GBH_CONFIG.USERS_KEY, users);
    return users;
}

function findGBHUserByUsername(username) {
    const users = gbhReadJSON(GBH_CONFIG.USERS_KEY, []);
    if (!Array.isArray(users)) return null;

    const search = String(username || "").trim().toLowerCase();

    return users.find(function (user) {
        return String(user.username || "").trim().toLowerCase() === search;
    }) || null;
}

function findGBHUserById(id) {
    const users = gbhReadJSON(GBH_CONFIG.USERS_KEY, []);
    if (!Array.isArray(users)) return null;

    return users.find(function (user) {
        return String(user.id || "") === String(id || "") ||
            String(user.userId || "") === String(id || "");
    }) || null;
}

function validateGBHSystemKeys() {
    try {
        initialiseGBHStorage();
        initialiseUsers();
        localStorage.setItem(GBH_CONFIG.KEY_VALIDATION_KEY, String(Date.now()));

        return {
            success: true,
            message: "GBH system keys validated successfully."
        };
    } catch (error) {
        console.error("GBH KEY VALIDATION ERROR:", error);
        return {
            success: false,
            message: "GBH system validation failed."
        };
    }
}

function showGBHValidationMessage(message, type) {
    const ids = [
        "validationMessage",
        "keyValidationMessage",
        "loginMessage",
        "systemMessage"
    ];

    let element = null;
    for (let i = 0; i < ids.length; i++) {
        element = document.getElementById(ids[i]);
        if (element) break;
    }

    if (!element) {
        console.log("GBH:", message);
        return;
    }

    element.textContent = message;
    element.className = "message " + (type || "error");
}

function validateGBHEntrySystem() {
    const result = validateGBHSystemKeys();

    if (!result.success) {
        showGBHValidationMessage(result.message, "error");
        return false;
    }

    return true;
}

function validateGBHPassword(password) {
    return typeof password === "string" && password.length >= 4;
}

function isGBHUserActive(user) {
    if (!user || user.active === false || user.isActive === false) {
        return false;
    }

    const status = String(user.status || "").trim().toLowerCase();
    return !["inactive", "transferred", "disabled"].includes(status);
}

/* =========================================================
   E. SESSION MANAGEMENT
========================================================= */

function createGBHSession(user) {
    const now = Date.now();

    return {
        userId: user.id || user.userId,
        username: user.username,
        fullName: user.fullName || user.name,
        role: normaliseGBHRole(user.role),
        teacherId: user.teacherId || "",
        tscNumber: user.tscNumber || "",
        className: user.className || "",
        learningAreas: Array.isArray(user.learningAreas)
            ? user.learningAreas : [],
        authProvider: user.authProvider || "local",
        schoolId: user.schoolId || "",
        loginTime: now,
        lastActivity: now,
        expiresAt: now + GBH_CONFIG.SESSION_DURATION
    };
}

function saveGBHSession(session) {
    return gbhWriteJSON(GBH_CONFIG.SESSION_KEY, session);
}

function getGBHSession() {
    const session = gbhReadJSON(GBH_CONFIG.SESSION_KEY, null);
    if (!session) return null;

    if (session.expiresAt && Date.now() >= Number(session.expiresAt)) {
        gbhRemoveStorage(GBH_CONFIG.SESSION_KEY);
        return null;
    }

    return session;
}

function getCurrentGBHUser() {
    const session = getGBHSession();
    if (!session) return null;
    return findGBHUserById(session.userId);
}

function isGBHLoggedIn() {
    return getGBHSession() !== null;
}

function refreshGBHSession() {
    const session = getGBHSession();
    if (!session) return false;

    session.lastActivity = Date.now();
    session.expiresAt = Date.now() + GBH_CONFIG.SESSION_DURATION;
    return saveGBHSession(session);
}

function checkGBHSessionExpiry() {
    return getGBHSession() !== null;
}

function getGBHCurrentUserName() {
    const user = getCurrentGBHUser();
    return user ? (user.fullName || user.name || user.username || "") : "";
}

function getGBHCurrentUserRole() {
    const user = getCurrentGBHUser();
    return user ? normaliseGBHRole(user.role) : "";
}

function getGBHCurrentUserId() {
    const user = getCurrentGBHUser();
    return user ? (user.id || user.userId || "") : "";
}

/* =========================================================
   F. LOCAL + SUPABASE AUTHENTICATION
========================================================= */

/* Existing local login remains available for existing GBH accounts. */
function authenticateUser(username, password) {
    const validation = validateGBHSystemKeys();

    if (!validation.success) {
        return { success: false, message: "GBH system validation failed." };
    }

    if (!GBH_CONFIG.TEMPORARY_LICENCE_BYPASS) {
        const licence = validateLocalGBHLicence();
        if (!licence.valid) {
            return {
                success: false,
                message: licence.message || "A valid GBH licence is required."
            };
        }
    }

    const cleanUsername = String(username || "").trim();
    const cleanPassword = String(password || "");

    if (!cleanUsername || !cleanPassword) {
        return {
            success: false,
            message: "Please enter your username and password."
        };
    }

    const user = findGBHUserByUsername(cleanUsername);

    /* Cloud accounts must be authenticated by Supabase, not by a
       locally stored password. */
    if (user && user.authProvider === "supabase") {
        return {
            success: false,
            message: "This is a cloud account. Sign in using its registered email address."
        };
    }

    if (!user || String(user.password || "") !== cleanPassword) {
        return { success: false, message: "Invalid username or password." };
    }

    if (!isGBHUserActive(user)) {
        return { success: false, message: "This user account is inactive." };
    }

    if (!user.role) {
        return {
            success: false,
            message: "This user account has no assigned role."
        };
    }

    if (!saveGBHSession(createGBHSession(user))) {
        return { success: false, message: "Unable to create login session." };
    }

    const users = gbhReadJSON(GBH_CONFIG.USERS_KEY, []);
    if (Array.isArray(users)) {
        const index = users.findIndex(function (item) {
            return String(item.id || item.userId || "") ===
                String(user.id || user.userId || "");
        });

        if (index !== -1) {
            users[index].lastLogin = new Date().toISOString();
            gbhWriteJSON(GBH_CONFIG.USERS_KEY, users);
        }
    }

    return {
        success: true,
        message: "Login successful.",
        redirect: "dashboard.html",
        user: user
    };
}

/*
 * Cloud login:
 * 1. Validate the existing GBH licence.
 * 2. Authenticate the email and password with Supabase Auth.
 * 3. Read the signed-in user's own school membership.
 * 4. Reject missing/invalid membership or unsupported roles.
 * 5. Save a GBH session without storing the cloud password.
 */
async function authenticateGBHUserWithSupabase(email, password) {
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPassword = String(password || "");

    if (!cleanEmail || !cleanPassword) {
        return {
            success: false,
            message: "Enter your registered email address and password."
        };
    }

    if (!cleanEmail.includes("@")) {
        return {
            success: false,
            message: "Enter the email address registered with Supabase."
        };
    }

    const validation = validateGBHSystemKeys();

    if (!validation.success) {
        return {
            success: false,
            message: "GBH system validation failed."
        };
    }

    if (!GBH_CONFIG.TEMPORARY_LICENCE_BYPASS) {
        const licence = validateLocalGBHLicence();

        if (!licence.valid) {
            return {
                success: false,
                message: licence.message ||
                    "A valid GBH licence is required."
            };
        }
    }

    const client = getGBHSupabaseClient();

    if (!client || !client.auth) {
        return {
            success: false,
            message: "Supabase is not ready. Check your internet connection and Supabase configuration."
        };
    }

    let authResult;

    try {
        authResult = await client.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPassword
        });
    } catch (error) {
        console.error("GBH Supabase sign-in request failed:", error);

        return {
            success: false,
            message: "Could not contact Supabase. Check your internet connection and try again."
        };
    }

    if (authResult.error || !authResult.data ||
        !authResult.data.user) {
        console.warn(
            "GBH Supabase sign-in rejected:",
            authResult.error ? authResult.error.message : "No user returned"
        );

        return {
            success: false,
            message: "Email or password is incorrect, or the account has not been confirmed."
        };
    }

    const authUser = authResult.data.user;
    let membershipResult;

    try {
        membershipResult = await client
            .from("school_members")
            .select("school_id, user_id, role")
            .eq("user_id", authUser.id)
            .maybeSingle();
    } catch (error) {
        console.error("GBH membership request failed:", error);

        await client.auth.signOut();

        return {
            success: false,
            message: "Could not verify school membership. Please try again."
        };
    }

    if (membershipResult.error) {
        console.error(
            "GBH school membership verification failed:",
            membershipResult.error
        );

        await client.auth.signOut();

        return {
            success: false,
            message: "School membership could not be verified. Check the school_members table and its security policies."
        };
    }

    const membership = membershipResult.data;

    if (!membership ||
        String(membership.user_id || "") !== String(authUser.id) ||
        !membership.school_id ||
        !membership.role) {
        await client.auth.signOut();

        return {
            success: false,
            message: "This account has no valid school membership. Ask your school administrator to assign your account to the school."
        };
    }

    const role = normaliseGBHRole(membership.role);

    if (!isRecognisedGBHRole(role)) {
        await client.auth.signOut();

        return {
            success: false,
            message: "Your school membership has an unrecognised role. Ask the school administrator to correct it."
        };
    }

    const existingUsers = gbhReadJSON(GBH_CONFIG.USERS_KEY, []);
    const users = Array.isArray(existingUsers) ? existingUsers : [];

    /*
     * Do not overwrite an unrelated local account that happens to
     * use the same email as the cloud account.
     */
    const conflictingUser = users.find(function (user) {
        return String(user.username || "").trim().toLowerCase() ===
                cleanEmail &&
            user.authProvider !== "supabase" &&
            String(user.id || user.userId || "") !== String(authUser.id);
    });

    if (conflictingUser) {
        await client.auth.signOut();

        return {
            success: false,
            message: "This email conflicts with an existing local GBH username. Ask the administrator to resolve the account conflict before signing in."
        };
    }

    const metadata = authUser.user_metadata || {};
    const cloudUser = {
        id: authUser.id,
        userId: authUser.id,
        username: cleanEmail,
        email: cleanEmail,
        fullName: String(
            metadata.full_name ||
            metadata.fullName ||
            metadata.name ||
            cleanEmail
        ),
        name: String(
            metadata.full_name ||
            metadata.fullName ||
            metadata.name ||
            cleanEmail
        ),
        role: role,
        status: "Active",
        active: true,
        mustChangePassword: false,
        teacherId: "",
        tscNumber: "",
        classTeacher: false,
        className: "",
        learningAreas: [],
        authProvider: "supabase",
        authUserId: authUser.id,
        schoolId: membership.school_id,
        createdAt: authUser.created_at || new Date().toISOString(),
        lastLogin: new Date().toISOString()
    };

    const existingIndex = users.findIndex(function (user) {
        return user.authProvider === "supabase" &&
            String(user.authUserId || user.id || user.userId) ===
                String(authUser.id);
    });

    if (existingIndex >= 0) {
        /*
         * Keep existing local teacher/class assignments and other
         * profile details; refresh cloud identity and membership.
         */
        const previous = users[existingIndex];

        users[existingIndex] = {
            ...previous,
            ...cloudUser,
            teacherId: previous.teacherId || "",
            tscNumber: previous.tscNumber || "",
            classTeacher: previous.classTeacher === true,
            className: previous.className || "",
            learningAreas: Array.isArray(previous.learningAreas)
                ? previous.learningAreas : []
        };
    } else {
        users.push(cloudUser);
    }

    if (!gbhWriteJSON(GBH_CONFIG.USERS_KEY, users)) {
        await client.auth.signOut();

        return {
            success: false,
            message: "Unable to save the cloud login session on this device. Check available browser storage."
        };
    }

    const sessionUser = existingIndex >= 0
        ? users[existingIndex]
        : cloudUser;

    if (!saveGBHSession(createGBHSession(sessionUser))) {
        await client.auth.signOut();

        return {
            success: false,
            message: "Unable to create the GBH login session."
        };
    }

    return {
        success: true,
        message: "Cloud login successful.",
        redirect: "dashboard.html",
        user: sessionUser
    };
}

function loginGBHUser(username, password) {
    return authenticateUser(username, password);
}

async function logout() {
    const session = getGBHSession();
    const client = getGBHSupabaseClient();

    gbhRemoveStorage(GBH_CONFIG.SESSION_KEY);

    if (session && session.authProvider === "supabase" &&
        client && client.auth) {
        try {
            await client.auth.signOut();
        } catch (error) {
            console.error("GBH cloud sign-out warning:", error);
        }
    }

    window.location.href = "login.html";
}

/* =========================================================
   G. CHANGE PASSWORD
========================================================= */

function changeUserPassword(userIdentifier, currentPassword, newPassword) {
    const users = gbhReadJSON(GBH_CONFIG.USERS_KEY, []);
    if (!Array.isArray(users)) {
        return { success: false, message: "User database is unavailable." };
    }

    const identifier = String(userIdentifier || "").trim();

    const index = users.findIndex(function (user) {
        return String(user.id || "") === identifier ||
            String(user.userId || "") === identifier ||
            String(user.username || "").trim().toLowerCase() ===
                identifier.toLowerCase();
    });

    if (index === -1) {
        return { success: false, message: "User account was not found." };
    }

    const user = users[index];

    if (user.authProvider === "supabase") {
        return {
            success: false,
            message: "This is a cloud account. Its password must be changed through Supabase account recovery or a cloud password-change flow."
        };
    }

    if (!isGBHUserActive(user)) {
        return { success: false, message: "This user account is inactive." };
    }

    if (String(user.password || "") !== String(currentPassword || "")) {
        return { success: false, message: "Current password is incorrect." };
    }

    const validation = validateNewPassword(newPassword);
    if (!validation.valid) {
        return { success: false, message: validation.message };
    }

    if (String(newPassword) === String(currentPassword)) {
        return {
            success: false,
            message: "New password must be different from the current password."
        };
    }

    user.password = String(newPassword);
    user.mustChangePassword = false;
    user.passwordChangedAt = new Date().toISOString();
    users[index] = user;

    if (!gbhWriteJSON(GBH_CONFIG.USERS_KEY, users)) {
        return { success: false, message: "Unable to save the new password." };
    }

    return { success: true, message: "Password changed successfully." };
}

function changeCurrentGBHUserPassword(currentPassword, newPassword) {
    const session = getGBHSession();

    if (!session) {
        return { success: false, message: "Please log in first." };
    }

    return changeUserPassword(session.userId, currentPassword, newPassword);
}

/* =========================================================
   H. PASSWORD RECOVERY
========================================================= */

function getGBHRecoveryUser(username) {
    const user = findGBHUserByUsername(username);
    return isGBHUserActive(user) ? user : null;
}

function getGBHRecoveryQuestion(user) {
    if (!user) return "";

    return String(
        user.recoveryQuestion ||
        user.securityQuestion ||
        user.passwordRecoveryQuestion ||
        ""
    ).trim();
}

function getGBHRecoveryAnswer(user) {
    if (!user) return "";

    return String(
        user.recoveryAnswer ||
        user.securityAnswer ||
        user.passwordRecoveryAnswer ||
        ""
    ).trim();
}

function validateNewPassword(password) {
    const value = String(password || "");

    if (value.length < 8) {
        return {
            valid: false,
            message: "Password must be at least 8 characters."
        };
    }

    if (!/[A-Za-z]/.test(value)) {
        return {
            valid: false,
            message: "Password must contain at least one letter."
        };
    }

    if (!/[0-9]/.test(value)) {
        return {
            valid: false,
            message: "Password must contain at least one number."
        };
    }

    return { valid: true, message: "Password meets the requirements." };
}

function getGBHRecoverySession() {
    const recovery = gbhReadJSON(GBH_RECOVERY_SESSION_KEY, null);
    if (!recovery) return null;

    if (!recovery.expiresAt ||
        Date.now() >= Number(recovery.expiresAt)) {
        clearGBHRecoverySession();
        return null;
    }

    return recovery;
}

function clearGBHRecoverySession() {
    gbhRemoveStorage(GBH_RECOVERY_SESSION_KEY);

    try {
        sessionStorage.removeItem(GBH_RECOVERY_SESSION_KEY);
    } catch (error) {
        console.warn("GBH recovery session cleanup warning:", error);
    }
}

function startPasswordRecovery(username, question, answer) {
    const user = getGBHRecoveryUser(username);

    if (!user) {
        return {
            success: false,
            message: "Account or recovery information is incorrect."
        };
    }

    if (user.authProvider === "supabase") {
        return {
            success: false,
            message: "This is a cloud account. Use the cloud password-recovery process."
        };
    }

    const now = Date.now();

    const recovery = {
        userId: user.id || user.userId,
        username: user.username,
        startedAt: now,
        expiresAt: now + GBH_CONFIG.RECOVERY_DURATION,
        verified: false
    };

    if (!gbhWriteJSON(GBH_RECOVERY_SESSION_KEY, recovery)) {
        return {
            success: false,
            message: "Unable to start password recovery. Please try again."
        };
    }

    if (question !== undefined || answer !== undefined) {
        const verified = verifyPasswordRecoveryAnswer(
            username, answer, question
        );

        if (!verified) {
            clearGBHRecoverySession();
            return {
                success: false,
                message: "Account or recovery information is incorrect."
            };
        }

        return {
            success: true,
            message: "Account verified. You may reset your password.",
            question: getGBHRecoveryQuestion(user)
        };
    }

    return {
        success: true,
        message: "Password recovery started.",
        question: getGBHRecoveryQuestion(user)
    };
}

function verifyPasswordRecoveryAnswer(username, answer, question) {
    const recovery = getGBHRecoverySession();
    if (!recovery) return false;

    if (String(recovery.username || "").trim().toLowerCase() !==
        String(username || "").trim().toLowerCase()) {
        return false;
    }

    const user = getGBHRecoveryUser(username);
    if (!user || user.authProvider === "supabase") {
        clearGBHRecoverySession();
        return false;
    }

    const currentId = String(user.id || user.userId || "");
    if (currentId !== String(recovery.userId || "")) {
        clearGBHRecoverySession();
        return false;
    }

    const savedAnswer = getGBHRecoveryAnswer(user);
    const submittedAnswer = String(answer || "").trim();

    if (!savedAnswer || !submittedAnswer ||
        savedAnswer.toLowerCase() !== submittedAnswer.toLowerCase()) {
        return false;
    }

    if (question !== undefined && question !== null &&
        String(question).trim()) {
        const savedQuestion = getGBHRecoveryQuestion(user);

        if (!savedQuestion ||
            savedQuestion.toLowerCase() !==
                String(question).trim().toLowerCase()) {
            return false;
        }
    }

    recovery.verified = true;
    recovery.verifiedAt = Date.now();

    return gbhWriteJSON(GBH_RECOVERY_SESSION_KEY, recovery);
}

function resetPasswordFromRecovery(username, newPassword) {
    const recovery = getGBHRecoverySession();
    const cleanUsername = String(username || "").trim();

    if (!recovery ||
        recovery.verified !== true ||
        String(recovery.username || "").toLowerCase() !==
            cleanUsername.toLowerCase()) {
        return {
            success: false,
            message: "Your recovery session has expired or is not verified. Please verify your account again."
        };
    }

    const users = gbhReadJSON(GBH_CONFIG.USERS_KEY, []);
    if (!Array.isArray(users)) {
        return {
            success: false,
            message: "User database is unavailable."
        };
    }

    const index = users.findIndex(function (user) {
        return user.authProvider !== "supabase" &&
            isGBHUserActive(user) &&
            String(user.username || "").trim().toLowerCase() ===
                cleanUsername.toLowerCase() &&
            String(user.id || user.userId || "") ===
                String(recovery.userId || "");
    });

    if (index === -1) {
        clearGBHRecoverySession();
        return {
            success: false,
            message: "The verified account could not be found."
        };
    }

    const validation = validateNewPassword(newPassword);
    if (!validation.valid) {
        return { success: false, message: validation.message };
    }

    if (String(users[index].password || "") === String(newPassword)) {
        return {
            success: false,
            message: "The new password must be different from the old password."
        };
    }

    users[index].password = String(newPassword);
    users[index].mustChangePassword = false;
    users[index].passwordChangedAt = new Date().toISOString();

    if (!gbhWriteJSON(GBH_CONFIG.USERS_KEY, users)) {
        return {
            success: false,
            message: "Unable to save the new password."
        };
    }

    clearGBHRecoverySession();

    return {
        success: true,
        message: "Password reset successfully. You can now log in with your new password."
    };
}

/* =========================================================
   I. CURRENT USER DISPLAY
========================================================= */

function updateCurrentUserDisplay() {
    const user = getCurrentGBHUser();
    if (!user) return;

    const name = user.fullName || user.name || user.username || "";
    const role = normaliseGBHRole(user.role);

    document.querySelectorAll("[data-gbh-user-name]").forEach(function (el) {
        el.textContent = name;
    });

    document.querySelectorAll("[data-gbh-user-role]").forEach(function (el) {
        el.textContent = role;
    });
}

/* =========================================================
   J. LICENCE MANAGEMENT
========================================================= */

function getGBHDeviceId() {
    let deviceId = localStorage.getItem(GBH_LICENCE_KEYS.DEVICE_ID);

    if (!deviceId) {
        deviceId = "GBH-" + Date.now().toString(36) + "-" +
            Math.random().toString(36).substring(2, 10).toUpperCase();

        localStorage.setItem(GBH_LICENCE_KEYS.DEVICE_ID, deviceId);
    }

    return deviceId;
}

function getGBHLicenceCache() {
    return gbhReadJSON(GBH_LICENCE_KEYS.CACHE, null);
}

function saveGBHLicenceCache(licence) {
    if (!licence) return false;
    return gbhWriteJSON(GBH_LICENCE_KEYS.CACHE, licence);
}

function clearGBHLicenceCache() {
    gbhRemoveStorage(GBH_LICENCE_KEYS.CACHE);
}

function getGBHLicenceKey() {
    return localStorage.getItem(GBH_LICENCE_KEYS.KEY) || "";
}

function getGBHLicenceStatus() {
    return localStorage.getItem(GBH_LICENCE_KEYS.STATUS) || "";
}

function getGBHLicenceExpiry() {
    return localStorage.getItem(GBH_LICENCE_KEYS.EXPIRY) || "";
}

function isGBHLicenceExpired() {
    const expiry = getGBHLicenceExpiry();
    if (!expiry) return false;

    const expiryDate = new Date(expiry);
    if (Number.isNaN(expiryDate.getTime())) return true;

    return Date.now() > expiryDate.getTime();
}

function validateLocalGBHLicence() {
    if (GBH_CONFIG.TEMPORARY_LICENCE_BYPASS) {
        return {
            valid: true,
            bypass: true,
            message: "Temporary development licence bypass active."
        };
    }

    const status = getGBHLicenceStatus();
    const licenceKey = getGBHLicenceKey();
    const deviceId = getGBHDeviceId();
    const licenceDevice = localStorage.getItem(GBH_LICENCE_KEYS.DEVICE);

    if (!licenceKey) {
        return { valid: false, message: "No GBH licence key was found." };
    }

    if (status && status.toLowerCase() !== "active") {
        return { valid: false, message: "The GBH licence is not active." };
    }

    if (licenceDevice && licenceDevice !== deviceId) {
        return {
            valid: false,
            message: "This licence belongs to another device."
        };
    }

    if (isGBHLicenceExpired()) {
        return { valid: false, message: "The GBH licence has expired." };
    }

    return { valid: true, message: "GBH licence validated." };
}

function hasValidGBHLicence() {
    return validateLocalGBHLicence().valid === true;
}

function enforceGBHLicenceGate() {
    if (GBH_CONFIG.TEMPORARY_LICENCE_BYPASS) return true;
    if (isGBHPublicPage()) return true;

    const licence = validateLocalGBHLicence();

    if (!licence.valid) {
        window.location.href = "activation.html";
        return false;
    }

    return true;
}

function isGBHPublicPage(page) {
    return GBH_PUBLIC_PAGES.includes(page || getCurrentGBHPage());
}

/* =========================================================
   K. PAGE PROTECTION
========================================================= */

function protectCurrentPage() {
    const page = getCurrentGBHPage();

    if (isGBHPublicPage(page)) return true;

    const session = getGBHSession();

    if (!session || !checkGBHSessionExpiry()) {
        window.location.href = "login.html";
        return false;
    }

    const user = getCurrentGBHUser();

    if (!user || !isGBHUserActive(user)) {
        gbhRemoveStorage(GBH_CONFIG.SESSION_KEY);
        window.location.href = "login.html";
        return false;
    }

    if (!userCanAccessGBHPage(page)) {
        alert("Access denied. You are not authorised to open this page.");
        window.location.href = "dashboard.html";
        return false;
    }

    return true;
}

function redirectAuthenticatedUserFromLogin() {
    if (getCurrentGBHPage() !== "login.html") return false;

    if (!isGBHLoggedIn() || !checkGBHSessionExpiry()) return false;

    window.location.href = "dashboard.html";
    return true;
}

/* =========================================================
   L. LOGIN PAGE
========================================================= */

function initialiseGBHLoginPage() {
    if (redirectAuthenticatedUserFromLogin()) return;

    const form = document.getElementById("loginForm");
    if (!form || form.dataset.gbhReady === "true") return;

    form.dataset.gbhReady = "true";

    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const message = document.getElementById("loginMessage");
    const button = document.getElementById("loginButton");
    const loading = document.getElementById("loadingMessage");

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const username = usernameInput ? usernameInput.value.trim() : "";
        const password = passwordInput ? passwordInput.value : "";

        if (!username || !password) {
            if (message) {
                message.textContent = "Please enter your username/email and password.";
                message.className = "message error";
            }
            return;
        }

        if (button) button.disabled = true;
        if (loading) loading.style.display = "block";
        if (message) {
            message.textContent = "";
            message.className = "message";
        }

        let result;

        try {
            /*
             * Email address = Supabase cloud authentication.
             * Username without @ = existing local GBH authentication.
             */
            if (username.includes("@")) {
                result = await authenticateGBHUserWithSupabase(
                    username,
                    password
                );
            } else {
                result = authenticateUser(username, password);
            }
        } catch (error) {
            console.error("GBH login error:", error);
            result = {
                success: false,
                message: "An unexpected login error occurred. Please try again."
            };
        } finally {
            if (button) button.disabled = false;
            if (loading) loading.style.display = "none";
        }

        if (result && result.success) {
            if (message) {
                message.textContent = "Login successful. Opening dashboard...";
                message.className = "message success";
            }

            window.setTimeout(function () {
                window.location.href = result.redirect || "dashboard.html";
            }, 400);
        } else {
            if (message) {
                message.textContent = result && result.message
                    ? result.message
                    : "Login failed. Please check your credentials.";
                message.className = "message error";
            }

            if (passwordInput) {
                passwordInput.value = "";
                passwordInput.focus();
            }
        }
    });
}

/* =========================================================
   M. INDEX ENTRY FLOW
========================================================= */

function runGBHIndexEntryFlow() {
    const page = getCurrentGBHPage();

    if (page !== "index.html" && page !== "") return false;

    const validation = validateGBHSystemKeys();

    if (!validation.success) {
        showGBHValidationMessage(validation.message, "error");
        return false;
    }

    if (!GBH_CONFIG.TEMPORARY_LICENCE_BYPASS) {
        const licence = validateLocalGBHLicence();

        if (!licence.valid) {
            window.location.href = "activation.html";
            return true;
        }
    }

    if (isGBHLoggedIn() && checkGBHSessionExpiry()) {
        window.location.href = "dashboard.html";
        return true;
    }

    window.setTimeout(function () {
        window.location.href = "login.html";
    }, 350);

    return true;
}

/* =========================================================
   N. ROLE ACCESS CONTROL
========================================================= */

function userCanAccessGBHPage(page) {
    const user = getCurrentGBHUser();
    if (!user) return false;

    const role = normaliseGBHRole(user.role);

    if (role === GBH_ROLES.ADMIN) return true;

    const allowedRoles = GBH_PAGE_ACCESS[page];

    if (!allowedRoles) return true;

    return allowedRoles.some(function (allowedRole) {
        return normaliseGBHRole(allowedRole) === role;
    });
}

function getGBHAccessiblePages() {
    const user = getCurrentGBHUser();
    if (!user) return [];

    if (normaliseGBHRole(user.role) === GBH_ROLES.ADMIN) {
        return Object.keys(GBH_PAGE_ACCESS);
    }

    return Object.keys(GBH_PAGE_ACCESS).filter(function (page) {
        return userCanAccessGBHPage(page);
    });
}

/* =========================================================
   O. TEACHER RECORD + LEARNING AREAS
========================================================= */

function getGBHTeacherRecord(user) {
    if (!user) return null;

    const teachers = gbhReadJSON(GBH_CONFIG.TEACHERS_KEY, []);
    if (!Array.isArray(teachers)) return null;

    const teacherId = user.teacherId || user.tscNumber || "";

    if (teacherId) {
        const match = teachers.find(function (item) {
            return String(item.id || item.teacherId || "") ===
                    String(teacherId) ||
                String(item.tscNumber || "") === String(teacherId);
        });

        if (match) return match;
    }

    const username = String(user.username || "").trim().toLowerCase();
    const name = String(user.fullName || user.name || "").trim().toLowerCase();

    return teachers.find(function (item) {
        const itemUsername = String(item.username || "").trim().toLowerCase();
        const itemName = String(
            item.name || item.teacherName || item.fullName || ""
        ).trim().toLowerCase();

        return (username && itemUsername && username === itemUsername) ||
            (name && itemName && name === itemName);
    }) || null;
}

function getGBHUserLearningAreas(user) {
    if (!user) return [];

    let areas = Array.isArray(user.learningAreas) ? user.learningAreas : [];

    if (!areas.length && Array.isArray(user.subjects)) {
        areas = user.subjects;
    }

    if (!areas.length) {
        const teacher = getGBHTeacherRecord(user);

        if (teacher) {
            if (Array.isArray(teacher.learningAreas)) {
                areas = teacher.learningAreas;
            } else if (Array.isArray(teacher.subjects)) {
                areas = teacher.subjects;
            }
        }
    }

    return areas.map(function (area) {
        return String(area || "").trim();
    }).filter(Boolean);
}

function normaliseGBHLearningArea(learningArea) {
    return String(learningArea || "").trim().toLowerCase()
        .replace(/\s+/g, " ");
}

function userCanEnterGBHLearningArea(learningArea) {
    const user = getCurrentGBHUser();
    if (!user) return false;

    const role = normaliseGBHRole(user.role);

    if ([GBH_ROLES.ADMIN, GBH_ROLES.PRINCIPAL,
        GBH_ROLES.EXAMINATION].includes(role)) {
        return true;
    }

    const requested = normaliseGBHLearningArea(learningArea);
    if (!requested) return false;

    return getGBHUserLearningAreas(user).some(function (area) {
        return normaliseGBHLearningArea(area) === requested;
    });
}

function getGBHUserClass(user) {
    if (!user) return "";

    if (user.className) return String(user.className).trim();

    const teacher = getGBHTeacherRecord(user);
    if (!teacher) return "";

    return String(
        teacher.className || teacher.class ||
        teacher.assignedClass || ""
    ).trim();
}

function userCanAccessGBHClass(grade, stream) {
    const user = getCurrentGBHUser();
    if (!user) return false;

    const role = normaliseGBHRole(user.role);

    if ([GBH_ROLES.ADMIN, GBH_ROLES.PRINCIPAL,
        GBH_ROLES.EXAMINATION].includes(role)) {
        return true;
    }

    const assignedClass = getGBHUserClass(user);

    if (!assignedClass) {
        return role === GBH_ROLES.TEACHER && !stream;
    }

    const requested = (String(grade || "") + " " +
        String(stream || "")).trim().toLowerCase();

    const assigned = assignedClass.trim().toLowerCase();

    if (!requested) return false;

    return assigned === requested ||
        assigned.includes(requested) ||
        requested.includes(assigned);
}

function checkGBHExaminationPermission(learningArea, grade, stream) {
    const user = getCurrentGBHUser();
    if (!user) return false;

    const role = normaliseGBHRole(user.role);

    if ([GBH_ROLES.ADMIN, GBH_ROLES.PRINCIPAL,
        GBH_ROLES.EXAMINATION].includes(role)) {
        return true;
    }

    if (role === GBH_ROLES.CLASS_TEACHER) {
        return userCanAccessGBHClass(grade, stream) &&
            userCanEnterGBHLearningArea(learningArea);
    }

    if (role === GBH_ROLES.TEACHER) {
        return userCanEnterGBHLearningArea(learningArea);
    }

    return false;
}

/* =========================================================
   P. ROLE-BASED VISIBILITY
========================================================= */

function initialiseGBHRoleVisibility() {
    const user = getCurrentGBHUser();
    if (!user) return;

    const role = normaliseGBHRole(user.role);

    document.querySelectorAll("[data-gbh-roles]").forEach(function (element) {
        const allowed = String(element.dataset.gbhRoles || "")
            .split(",")
            .map(function (item) {
                return normaliseGBHRole(item);
            })
            .filter(Boolean);

        element.style.display =
            role === GBH_ROLES.ADMIN || allowed.includes(role) ? "" : "none";
    });
}

/* =========================================================
   Q. SESSION MONITOR + ACTIVITY REFRESH
========================================================= */

function initialiseGBHSessionMonitor() {
    if (isGBHPublicPage()) return;

    window.setInterval(function () {
        if (!checkGBHSessionExpiry()) {
            window.location.href = "login.html";
            return;
        }

        refreshGBHSession();
    }, 5 * 60 * 1000);
}

function initialiseGBHActivityRefresh() {
    if (isGBHPublicPage()) return;

    let lastRefresh = 0;

    function activity() {
        const now = Date.now();
        if (now - lastRefresh < 60 * 1000) return;

        lastRefresh = now;
        refreshGBHSession();
    }

    ["click", "keydown", "mousemove", "touchstart"].forEach(function (name) {
        document.addEventListener(name, activity, { passive: true });
    });
}

/* =========================================================
   R. FORGOT PASSWORD PAGE
========================================================= */

function initialiseGBHForgotPasswordPage() {
    const form = document.getElementById("forgotPasswordForm");
    if (!form || form.dataset.gbhReady === "true") return;

    form.dataset.gbhReady = "true";

    const usernameInput = document.getElementById("username");
    const answerInput = document.getElementById("recoveryAnswer");
    const questionInput = document.getElementById("recoveryQuestion");
    const message = document.getElementById("forgotPasswordMessage") ||
        document.getElementById("recoveryMessage");

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        const username = usernameInput ? usernameInput.value.trim() : "";
        const answer = answerInput ? answerInput.value.trim() : "";
        const question = questionInput ? questionInput.value.trim() : "";

        if (!username) {
            if (message) {
                message.textContent = "Please enter your username.";
                message.className = "message error";
            }
            return;
        }

        const result = startPasswordRecovery(username);

        if (!result.success) {
            if (message) {
                message.textContent = result.message;
                message.className = "message error";
            }
            return;
        }

        if (!answer || !question) {
            if (message) {
                message.textContent =
                    "Please select your security question and enter your answer.";
                message.className = "message error";
            }
            clearGBHRecoverySession();
            return;
        }

        if (!verifyPasswordRecoveryAnswer(username, answer, question)) {
            if (message) {
                message.textContent = "Account or recovery information is incorrect.";
                message.className = "message error";
            }
            return;
        }

        if (message) {
            message.textContent = "Account verified. Opening password reset...";
            message.className = "message success";
        }

        window.setTimeout(function () {
            window.location.href = "change_password.html";
        }, 500);
    });
}

/* =========================================================
   S. CHANGE PASSWORD PAGE
========================================================= */

function initialiseGBHChangePasswordPage() {
    const form = document.getElementById("changePasswordForm");
    if (!form || form.dataset.gbhReady === "true") return;

    form.dataset.gbhReady = "true";

    const usernameInput = document.getElementById("username");
    const currentInput = document.getElementById("currentPassword");
    const newInput = document.getElementById("newPassword");
    const confirmInput = document.getElementById("confirmPassword");

    const message = document.getElementById("changeMessage") ||
        document.getElementById("changePasswordMessage");

    const currentGroup = document.getElementById("currentPasswordGroup");
    const recoveryNotice = document.getElementById("recoveryNotice");

    const recovery = getGBHRecoverySession();
    const recoveryMode = !!(recovery && recovery.verified === true);

    if (recoveryMode) {
        if (usernameInput) {
            usernameInput.value = recovery.username || "";
            usernameInput.readOnly = true;
        }

        if (currentGroup) currentGroup.style.display = "none";
        if (currentInput) currentInput.required = false;
        if (recoveryNotice) recoveryNotice.style.display = "";
    } else {
        if (currentGroup) currentGroup.style.display = "";
        if (currentInput) currentInput.required = true;
        if (recoveryNotice) recoveryNotice.style.display = "none";
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        const username = usernameInput ? usernameInput.value.trim() : "";
        const current = currentInput ? currentInput.value : "";
        const next = newInput ? newInput.value : "";
        const confirm = confirmInput ? confirmInput.value : "";

        function displayResult(result) {
            if (!message) return;

            message.textContent = result.message ||
                (result.success ? "Operation successful." : "Operation failed.");

            message.className = "message " +
                (result.success ? "success" : "error");
        }

        if (!username) {
            displayResult({
                success: false,
                message: "Please enter your username."
            });
            return;
        }

        if (next !== confirm) {
            displayResult({
                success: false,
                message: "New passwords do not match."
            });
            return;
        }

        const validation = validateNewPassword(next);
        if (!validation.valid) {
            displayResult({
                success: false,
                message: validation.message
            });
            return;
        }

        const result = recoveryMode
            ? resetPasswordFromRecovery(username, next)
            : changeUserPassword(username, current, next);

        displayResult(result);

        if (result.success) {
            form.reset();

            if (recoveryMode) {
                clearGBHRecoverySession();

                window.setTimeout(function () {
                    window.location.href = "login.html";
                }, 1200);
            }
        }
    });
}

/* =========================================================
   T. SYSTEM INITIALISATION
========================================================= */

function initialiseGBHSystem() {
    console.log("GREEN HONEY BADGER SYSTEM starting...");

    initialiseGBHStorage();
    initialiseUsers();

    const page = getCurrentGBHPage();
    console.log("GBH current page:", page);

    if (page === "index.html" || page === "") {
        runGBHIndexEntryFlow();
        return;
    }

    if (!enforceGBHLicenceGate()) return;

    if (page === "login.html") {
        initialiseGBHLoginPage();
        return;
    }

    if (page === "forgot_password.html") {
        initialiseGBHForgotPasswordPage();
        return;
    }

    if (page === "change_password.html") {
        initialiseGBHChangePasswordPage();
        return;
    }

    if (!protectCurrentPage()) return;

    initialiseGBHRoleVisibility();
    initialiseGBHSessionMonitor();
    initialiseGBHActivityRefresh();
    updateCurrentUserDisplay();

    console.log("GBH system initialised successfully.");
}

/* =========================================================
   U. GLOBAL GBH API
========================================================= */

window.GBH = {
    config: GBH_CONFIG,
    roles: GBH_ROLES,
    pageAccess: GBH_PAGE_ACCESS,

    readJSON: gbhReadJSON,
    writeJSON: gbhWriteJSON,
    removeStorage: gbhRemoveStorage,

    initialise: initialiseGBHSystem,
    validateSystem: validateGBHSystemKeys,

    authenticate: authenticateUser,
    authenticateWithSupabase: authenticateGBHUserWithSupabase,
    login: loginGBHUser,
    logout: logout,

    getSession: getGBHSession,
    getCurrentUser: getCurrentGBHUser,
    isLoggedIn: isGBHLoggedIn,
    refreshSession: refreshGBHSession,

    changePassword: changeCurrentGBHUserPassword,
    changeUserPassword: changeUserPassword,
    validateNewPassword: validateNewPassword,

    startRecovery: startPasswordRecovery,
    verifyRecovery: verifyPasswordRecoveryAnswer,
    resetPassword: resetPasswordFromRecovery,
    getRecoverySession: getGBHRecoverySession,
    clearRecoverySession: clearGBHRecoverySession,

    canAccessPage: userCanAccessGBHPage,
    accessiblePages: getGBHAccessiblePages,
    canEnterLearningArea: userCanEnterGBHLearningArea,
    canAccessClass: userCanAccessGBHClass,
    canEnterExamination: checkGBHExaminationPermission,

    getDeviceId: getGBHDeviceId,
    getLicence: getGBHLicenceCache,
    validateLicence: validateLocalGBHLicence,
    hasValidLicence: hasValidGBHLicence
};

/* =========================================================
   V. BACKWARD-COMPATIBLE GLOBAL FUNCTIONS
========================================================= */

window.authenticateUser = authenticateUser;
window.authenticateGBHUserWithSupabase = authenticateGBHUserWithSupabase;
window.loginGBHUser = loginGBHUser;
window.logout = logout;

window.getCurrentGBHUser = getCurrentGBHUser;
window.getGBHSession = getGBHSession;
window.isGBHLoggedIn = isGBHLoggedIn;

window.changeUserPassword = changeUserPassword;
window.changeCurrentGBHUserPassword = changeCurrentGBHUserPassword;

window.startPasswordRecovery = startPasswordRecovery;
window.verifyPasswordRecoveryAnswer = verifyPasswordRecoveryAnswer;
window.resetPasswordFromRecovery = resetPasswordFromRecovery;

window.getRecoverySession = getGBHRecoverySession;
window.getGBHRecoverySession = getGBHRecoverySession;
window.clearGBHRecoverySession = clearGBHRecoverySession;
window.validateNewPassword = validateNewPassword;

window.userCanAccessGBHPage = userCanAccessGBHPage;
window.userCanEnterGBHLearningArea = userCanEnterGBHLearningArea;
window.userCanAccessGBHClass = userCanAccessGBHClass;
window.checkGBHExaminationPermission = checkGBHExaminationPermission;

/* =========================================================
   W. START GBH WHEN PAGE LOADS
========================================================= */

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialiseGBHSystem);
} else {
    initialiseGBHSystem();
}

console.log("GREEN HONEY BADGER SYSTEM - SCRIPT.JS loaded.");