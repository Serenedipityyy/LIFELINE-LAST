// --- GLOBAL CONSTANTS & STATE ---
const LS = {
    token: "lifeline_auth_token",
    user: "lifeline_user_data",
    section: "lifeline_active_section",
    alerts: "lifeline_alerts_muted"
};

let state = {
    user: null,
    meta: {
        buildings: [],
        rooms: [],
        squads: [],
        zones: []
    },
    incidents: [],
    announcements: [],
    users: [],
    loginLogs: [],
    incidentLogs: [],
    selectedBuilding: null,
    selectedRoom: null,
    isMuted: localStorage.getItem(LS.alerts) === "true"
};

const POLL_MS = 4000;
let lastAlertCount = 0;
let activeAudioCtx = null;

// --- API HELPER ---
async function api(endpoint, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(state.token ? { "Authorization": "Bearer " + state.token } : {}),
        ...(options.headers || {})
    };

    let body = options.body;
    if (body && typeof body === "object" && !(body instanceof FormData)) {
        body = JSON.stringify(body);
    }

    const res = await fetch(endpoint, {
        ...options,
        headers,
        body
    });

    const text = await res.text();
    let data;
    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        data = { error: text || "Invalid JSON response from server." };
    }

    if (!res.ok) {
        throw new Error(data.error || `HTTP error! status: ${res.status}`);
    }
    return data;
}

// --- AUTH UI & TAB SWITCHING ---
function switchAuthTab(tab) {
    const loginTabBtn = document.getElementById("loginTabBtn");
    const registerTabBtn = document.getElementById("registerTabBtn");
    const loginContainer = document.getElementById("loginFormContainer");
    const registerContainer = document.getElementById("registerFormContainer");

    if (!loginTabBtn || !registerTabBtn || !loginContainer || !registerContainer) return;

    if (tab === "login") {
        loginTabBtn.classList.add("active");
        registerTabBtn.classList.remove("active");
        loginContainer.style.display = "block";
        registerContainer.style.display = "none";
    } else {
        registerTabBtn.classList.add("active");
        loginTabBtn.classList.remove("active");
        registerContainer.style.display = "block";
        loginContainer.style.display = "none";
    }
}

// --- PROFILE DROPDOWN & UI HELPERS ---
function toggleProfileDropdown(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById("profileDropdownMenu");
    if (menu) menu.classList.toggle("show");
}

function closeProfileDropdown() {
    const menu = document.getElementById("profileDropdownMenu");
    if (menu) menu.classList.remove("show");
}

document.addEventListener("click", function (event) {
    const container = document.getElementById("userProfileMenuContainer");
    if (container && !container.contains(event.target)) closeProfileDropdown();
});

// --- TOAST NOTIFICATIONS ---
function toast(message, type = "info", duration = 4000) {
    let container = document.getElementById("toastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        container.style.cssText = "position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;";
        document.body.appendChild(container);
    }

    const el = document.createElement("div");
    let bg = "#2563eb";
    if (type === "success") bg = "#059669";
    if (type === "error") bg = "#dc2626";
    if (type === "warning") bg = "#d97706";

    el.style.cssText = `background: ${bg}; color: white; padding: 12px 18px; border-radius: 8px; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: opacity 0.3s ease;`;
    el.textContent = message;
    container.appendChild(el);

    setTimeout(() => {
        el.style.opacity = "0";
        setTimeout(() => el.remove(), 300);
    }, duration);
}

// --- OTP & REGISTRATION LOGIC ---
const ID_REGEX = /^\d{2}-\d{4}-\d{3}$/;
let isOtpVerified = false;

async function requestOTP() {
    const studentIdInput = document.getElementById("regStudentId");
    if (!studentIdInput) return;
    const studentId = studentIdInput.value.trim();

    if (!studentId || !ID_REGEX.test(studentId)) {
        toast("Please enter a valid Student ID format: 2X-XXXX-XXX (e.g. 23-1234-567).", "error");
        studentIdInput.focus();
        return;
    }

    const btn = document.getElementById("sendOtpBtn");
    if (btn) btn.disabled = true;

    try {
        const res = await api("auth.php?action=send_otp", {
            method: "POST",
            body: { student_id: studentId }
        });
        const otpSection = document.getElementById("otpCodeContainer") || document.getElementById("otpSection");
        if (otpSection) otpSection.style.display = "block";

        const statusMsg = document.getElementById("otpStatusMsg");
        if (statusMsg) {
            statusMsg.style.display = "block";
            statusMsg.textContent = res.message || "OTP sent successfully!";
        }

        toast(`OTP Sent! Demo code: ${res.demo_otp || 'Check console'}`, "success", 8000);
        if (res.demo_otp) console.log("DEMO OTP:", res.demo_otp);
    } catch (err) {
        toast(err.message || "Failed to send OTP.", "error");
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function verifyOTP() {
    const studentIdInput = document.getElementById("regStudentId");
    const otpInput = document.getElementById("regOtpCode");
    if (!studentIdInput || !otpInput) return;

    const student_id = studentIdInput.value.trim();
    const otp_code = otpInput.value.trim();

    if (!otp_code || otp_code.length !== 6) {
        toast("Please enter the 6-digit OTP code.", "error");
        otpInput.focus();
        return;
    }

    const btn = document.getElementById("verifyOtpBtn");
    if (btn) btn.disabled = true;

    try {
        const res = await api("auth.php?action=verify_otp", {
            method: "POST",
            body: { student_id, otp_code }
        });

        if (res.verified) {
            isOtpVerified = true;
            const verifiedMsg = document.getElementById("otpVerifiedMsg");
            if (verifiedMsg) verifiedMsg.style.display = "block";

            const submitBtn = document.getElementById("regSubmitBtn");
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = "1";
                submitBtn.style.cursor = "pointer";
            }
            if (btn) btn.style.display = "none";
            otpInput.disabled = true;
            studentIdInput.disabled = true;
            toast("OTP verified successfully! You may now complete your registration.", "success");
        }
    } catch (err) {
        toast(err.message || "Invalid or expired OTP code.", "error");
    } finally {
        if (btn) btn.disabled = false;
    }
}

// --- DASHBOARD & NAVIGATION ---
function showSection(sectionId, skipPush = false) {
    // Basic section toggler if dashboard elements exist
    console.log("Showing section:", sectionId);
}

async function startDashboard() {
    try {
        const me = await api("auth.php?action=me");
        state.user = me.user;
    } catch (e) {
        window.location.replace("index.html");
    }
}

async function startLoginPage() {
    try {
        await api("auth.php?action=me");
        window.location.replace("dashboard.html");
    } catch (e) { /* stay on login */ }
}

function initApp() {
    if (document.getElementById("dashboard")) {
        startDashboard();
    } else {
        startLoginPage();
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}
