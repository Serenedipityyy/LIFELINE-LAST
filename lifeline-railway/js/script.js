function renderRoleDashboard() {
    const u = state.user;
    if (!u) return;

    const r = u.role; // 'user', 'member', 'officer', 'admin'
    const studentView = document.getElementById("studentDashboardView");
    const medicView = document.getElementById("medicDashboardView");
    const officerView = document.getElementById("officerDashboardView");

    const badgeHeader = document.getElementById("roleBadgeHeader");
    const roleHeaderBadge = document.getElementById("roleHeaderBadge");
    const roleHeaderTitle = document.getElementById("roleHeaderTitle");
    const roleHeaderAction = document.getElementById("roleHeaderAction");
    const navDashText = document.getElementById("navDashText");

    if (badgeHeader) {
        if (r === "officer" || r === "admin") {
            badgeHeader.textContent = "OFFICER";
            badgeHeader.style.background = "#2563eb";
        } else if (r === "member") {
            badgeHeader.textContent = "MEDIC";
            badgeHeader.style.background = "#059669";
        } else {
            badgeHeader.textContent = "STUDENT";
            badgeHeader.style.background = "#4f46e5";
        }
    }

    if (roleHeaderBadge) roleHeaderBadge.textContent = r.toUpperCase();
    if (roleHeaderTitle) roleHeaderTitle.textContent = `Welcome back, ${u.name || 'User'}!`;
    if (navDashText) navDashText.textContent = r === 'user' ? 'Student Dashboard' : 'Responder Dashboard';

    // Hide all views first
    if (studentView) studentView.style.display = "none";
    if (medicView) medicView.style.display = "none";
    if (officerView) officerView.style.display = "none";

    // Show appropriate view
    if (r === 'officer' || r === 'admin') {
        if (officerView) officerView.style.display = "block";
        loadOfficerData();
    } else if (r === 'member') {
        if (medicView) medicView.style.display = "block";
        loadMedicData();
    } else {
        if (studentView) studentView.style.display = "block";
        loadStudentData();
    }
}

// Global state container
const state = {
    user: null,
    token: localStorage.getItem('lifeline_token') || null
};

// API helper
async function api(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(state.token ? { 'Authorization': 'Bearer ' + state.token } : {}),
        ...(options.headers || {})
    };
    
    const res = await fetch(endpoint, {
        ...options,
        headers
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.error || 'An unexpected error occurred.');
    }
    return data;
}

// OTP Request Function
async function requestOTP() {
    const studentIdInput = document.getElementById('regStudentId');
    const statusMsg = document.getElementById('otpStatusMsg');
    const otpContainer = document.getElementById('otpCodeContainer');
    const sendBtn = document.getElementById('sendOtpBtn');

    if (!studentIdInput) return;
    const studentId = studentIdInput.value.trim();

    if (!studentId) {
        alert('Please enter your Student ID first.');
        studentIdInput.focus();
        return;
    }

    try {
        if (sendBtn) sendBtn.disabled = true;
        const res = await api('auth.php?action=send_otp', {
            method: 'POST',
            body: JSON.stringify({ student_id: studentId })
        });

        if (otpContainer) otpContainer.style.display = 'block';
        if (statusMsg) {
            statusMsg.style.display = 'block';
            statusMsg.style.color = '#2563eb';
            statusMsg.textContent = res.message || 'OTP sent successfully! Check demo OTP if enabled.';
        }
        if (res.demo_otp) {
            console.log('DEMO OTP:', res.demo_otp);
            alert('DEMO OTP for testing: ' + res.demo_otp);
        }
    } catch (err) {
        alert(err.message);
    } finally {
        if (sendBtn) sendBtn.disabled = false;
    }
}

// OTP Verification Function
async function verifyOTP() {
    const studentIdInput = document.getElementById('regStudentId');
    const otpInput = document.getElementById('regOtpCode');
    const verifiedMsg = document.getElementById('otpVerifiedMsg');
    const submitBtn = document.getElementById('regSubmitBtn');
    const verifyBtn = document.getElementById('verifyOtpBtn');

    if (!studentIdInput || !otpInput) return;
    const student_id = studentIdInput.value.trim();
    const otp_code = otpInput.value.trim();

    if (!otp_code) {
        alert('Please enter the 6-digit OTP code.');
        otpInput.focus();
        return;
    }

    try {
        if (verifyBtn) verifyBtn.disabled = true;
        await api('auth.php?action=verify_otp', {
            method: 'POST',
            body: JSON.stringify({ student_id, otp_code })
        });

        if (verifiedMsg) verifiedMsg.style.display = 'block';
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
        }
        if (verifyBtn) verifyBtn.style.display = 'none';
        if (otpInput) otpInput.disabled = true;
        if (studentIdInput) studentIdInput.disabled = true;
        alert('OTP verified successfully! You can now complete your registration.');
    } catch (err) {
        alert(err.message);
        if (verifyBtn) verifyBtn.disabled = false;
    }
}

// Dummy loaders for role views if needed
function loadStudentData() {}
function loadMedicData() {}
function loadOfficerData() {}
