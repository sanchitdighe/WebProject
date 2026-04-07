/**
 * Provider Portal Logic
 */

const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

function switchTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    
    if (tab === 'login') {
        document.querySelector('.auth-tab:nth-child(1)').classList.add('active');
        document.getElementById('loginForm').classList.add('active');
    } else {
        document.querySelector('.auth-tab:nth-child(2)').classList.add('active');
        document.getElementById('registerForm').classList.add('active');
    }
}

function handleRegister() {
    const name = document.getElementById('regName').value;
    const phone = document.getElementById('regPhone').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const service_type = document.getElementById('regService').value;
    const pincode = document.getElementById('regPincode').value;
    const experience = document.getElementById('regExperience') ? document.getElementById('regExperience').value : '';
    const rate = document.getElementById('regRate') ? document.getElementById('regRate').value : '';
    const bio = document.getElementById('regBio') ? document.getElementById('regBio').value : '';
    const errorEl = document.getElementById('registerError');
    
    errorEl.textContent = '';
    
    if (!name || !phone || !email || !password || !service_type || !pincode) {
        errorEl.textContent = 'Please fill all fields.';
        return;
    }

    if (pincode.length !== 6) {
        errorEl.textContent = 'Pincode must be exactly 6 digits.';
        return;
    }
    
    fetch(`${API_BASE}/provider/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password, service_type, pincode, experience, rate, bio })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            // Auto login after registration and redirect
            localStorage.setItem('provider_id', data.provider_id);
            localStorage.setItem('provider_name', name);
            localStorage.setItem('provider_email', email);
            window.location.href = 'index.html';
        } else {
            errorEl.textContent = data.message || 'Registration failed.';
        }
    })
    .catch(err => {
        errorEl.textContent = 'Network error. Make sure backend is running.';
        console.error(err);
    });
}

function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    
    errorEl.textContent = '';
    
    if (!email || !password) {
        errorEl.textContent = 'Please provide email and password.';
        return;
    }
    
    fetch(`${API_BASE}/provider/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            localStorage.setItem('provider_id', data.provider_id);
            localStorage.setItem('provider_name', data.name);
            localStorage.setItem('provider_email', data.email);
            window.location.href = 'index.html';
        } else {
            errorEl.textContent = data.message || 'Login failed.';
        }
    })
    .catch(err => {
        errorEl.textContent = 'Network error. Make sure backend is running.';
        console.error(err);
    });
}

function logout() {
    localStorage.removeItem('provider_id');
    localStorage.removeItem('provider_name');
    localStorage.removeItem('provider_email');
    checkAuth();
}

function checkAuth() {
    const providerId = localStorage.getItem('provider_id');
    const authSection = document.getElementById('authSection');
    const dashboardSection = document.getElementById('dashboardSection');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (providerId) {
        authSection.style.display = 'none';
        dashboardSection.style.display = 'block';
        logoutBtn.style.display = 'inline-flex';
        loadDashboard(providerId);
    } else {
        authSection.style.display = 'flex';
        dashboardSection.style.display = 'none';
        logoutBtn.style.display = 'none';
        
        const params = new URLSearchParams(window.location.search);
        if (params.get('tab') === 'register') {
            switchTab('register');
        }
    }
}

function loadDashboard(providerId) {
    const urlParams = new URLSearchParams(window.location.search);
    const filter = urlParams.get('filter');
    
    fetch(`${API_BASE}/provider/dashboard?provider_id=${providerId}`)
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            document.getElementById('welcomeUser').textContent = `Welcome, ${data.provider.name}`;
            document.getElementById('dashService').textContent = data.provider.service_type || 'Professional';
            document.getElementById('dashPincode').textContent = 'Pincode: ' + (data.provider.pincode || 'N/A');
            
            // Handle Verification Warning Visibility
            const vWarning = document.getElementById('verificationWarning');
            if (vWarning) {
                vWarning.style.display = data.provider.is_verified ? 'none' : 'flex';
            }
            
            const tbody = document.getElementById('bookingsTableBody');
            const noBookings = document.getElementById('noBookings');
            tbody.innerHTML = '';
            
            let bookings = data.bookings || [];
            if (filter === 'pending') {
                bookings = bookings.filter(b => b.status.toLowerCase() !== 'completed' && b.status.toLowerCase() !== 'cancelled');
                document.querySelector('.dashboard-header p').textContent = 'Showing Pending Orders';
                document.querySelector('.dashboard-header p').style.color = 'var(--clr-danger)';
                document.querySelector('.dashboard-header p').style.fontWeight = '700';
            } else {
                document.querySelector('.dashboard-header p').textContent = 'Your Bookings';
                document.querySelector('.dashboard-header p').style.color = '';
                document.querySelector('.dashboard-header p').style.fontWeight = '';
            }

            if (bookings.length > 0) {
                noBookings.style.display = 'none';
                bookings.forEach(b => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><strong>${b.client_name}</strong></td>
                        <td>${b.client_phone}</td>
                        <td>${b.date}</td>
                        <td>${b.time}</td>
                        <td><span class="status-badge status-${b.status.toLowerCase()}">${b.status}</span></td>
                        <td>
                            ${b.status.toLowerCase() !== 'completed' ? 
                                `<button class="btn-status-done" onclick="updateBookingStatus(${b.id}, 'Completed')">
                                    <i data-lucide="check-circle" style="width: 14px; height: 14px;"></i> Service Done
                                </button>` : 
                                '<span style="color: var(--clr-success); font-size: 0.85rem; font-weight: 600;">Finished</span>'
                            }
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
                if(typeof lucide !== 'undefined') lucide.createIcons();
            } else {
                noBookings.style.display = 'block';
                if(filter === 'pending') {
                    noBookings.querySelector('p').textContent = 'No pending bookings found.';
                } else {
                    noBookings.querySelector('p').textContent = 'No bookings yet. When clients book you, they will appear here.';
                }
            }
        }
    })
    .catch(err => {
        console.error("Error loading dashboard", err);
    });
}

function updateBookingStatus(bookingId, newStatus) {
    if (!confirm(`Mark this service as ${newStatus}?`)) return;

    fetch(`${API_BASE}/booking/update_status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId, status: newStatus })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const providerId = localStorage.getItem('provider_id');
            loadDashboard(providerId);
        } else {
            alert('Failed to update status: ' + data.message);
        }
    })
    .catch(err => {
        console.error("Error updating status", err);
        alert('Network error while updating status.');
    });
}

// FORGOT PASSWORD FLOW
let fpCurrentEmail = '';

function openForgotPasswordModal() {
    document.getElementById('forgotPasswordModal').classList.add('active');
    document.getElementById('fpStep1').style.display = 'block';
    document.getElementById('fpStep2').style.display = 'none';
    document.getElementById('fpStep3').style.display = 'none';
    document.getElementById('fpSuccess').style.display = 'none';
    document.getElementById('fpEmail').value = '';
    document.getElementById('fpOTP').value = '';
    document.getElementById('fpNewPassword').value = '';
    document.getElementById('fpError1').textContent = '';
    document.getElementById('fpError2').textContent = '';
    document.getElementById('fpError3').textContent = '';
}

function closeForgotPasswordModal() {
    document.getElementById('forgotPasswordModal').classList.remove('active');
}

function handleFPSendOTP(role) {
    const email = document.getElementById('fpEmail').value;
    const errorDiv = document.getElementById('fpError1');
    const btn = document.getElementById('btnFPSend');

    if (!email) {
        errorDiv.textContent = "Please enter your email.";
        return;
    }

    btn.textContent = 'Sending...';
    btn.disabled = true;
    errorDiv.textContent = '';

    fetch(`${API_BASE}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            fpCurrentEmail = email;
            document.getElementById('fpStep1').style.display = 'none';
            document.getElementById('fpStep2').style.display = 'block';
        } else {
            errorDiv.textContent = data.message || "Failed to send OTP.";
            btn.textContent = 'Send OTP';
            btn.disabled = false;
        }
    })
    .catch(err => {
        errorDiv.textContent = "Network error.";
        btn.textContent = 'Send OTP';
        btn.disabled = false;
    });
}

function handleFPVerifyOTP(role) {
    const otp = document.getElementById('fpOTP').value;
    const errorDiv = document.getElementById('fpError2');
    const btn = document.getElementById('btnFPVerify');

    if (!otp || otp.length < 6) {
        errorDiv.textContent = "Please enter the 6-digit OTP.";
        return;
    }

    btn.textContent = 'Verifying...';
    btn.disabled = true;
    errorDiv.textContent = '';

    fetch(`${API_BASE}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpCurrentEmail, role, otp })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            document.getElementById('fpStep2').style.display = 'none';
            document.getElementById('fpStep3').style.display = 'block';
        } else {
            errorDiv.textContent = data.message || "Invalid OTP.";
            btn.textContent = 'Verify Code';
            btn.disabled = false;
        }
    })
    .catch(err => {
        errorDiv.textContent = "Network error.";
        btn.textContent = 'Verify Code';
        btn.disabled = false;
    });
}

function handleFPResetPassword(role) {
    const otp = document.getElementById('fpOTP').value;
    const newPassword = document.getElementById('fpNewPassword').value;
    const errorDiv = document.getElementById('fpError3');
    const btn = document.getElementById('btnFPReset');

    if (!newPassword || newPassword.length < 4) {
        errorDiv.textContent = "Password must be at least 4 characters.";
        return;
    }

    btn.textContent = 'Resetting...';
    btn.disabled = true;
    errorDiv.textContent = '';

    fetch(`${API_BASE}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpCurrentEmail, role, otp, new_password: newPassword })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            document.getElementById('fpStep3').style.display = 'none';
            document.getElementById('fpSuccess').style.display = 'block';
        } else {
            errorDiv.textContent = data.message || "Failed to reset password.";
            btn.textContent = 'Reset Password';
            btn.disabled = false;
        }
    })
    .catch(err => {
        errorDiv.textContent = "Network error.";
        btn.textContent = 'Reset Password';
        btn.disabled = false;
    });
}

function deleteProviderAccount() {
    openConfirmModal();
}

function openConfirmModal() {
    document.getElementById('confirmDeleteModal').classList.add('active');
}

function closeConfirmModal() {
    document.getElementById('confirmDeleteModal').classList.remove('active');
}

function executePermanentDelete() {
    const btn = document.getElementById('executeDeleteBtn');
    const content = document.getElementById('confirmDeleteContent');
    const title = document.getElementById('confirmTitle');
    const text = document.getElementById('confirmText');
    
    const providerId = localStorage.getItem('provider_id');
    if (!providerId) {
        alert("Session error. Please log in again.");
        closeConfirmModal();
        return;
    }

    btn.disabled = true;
    btn.textContent = "Purging Data...";
    
    fetch(`${API_BASE}/provider/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: providerId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            content.classList.add('success');
            title.textContent = "Successfully Deleted";
            text.textContent = "Your professional partner data has been wiped forever. You may register again when ready.";
            
            setTimeout(() => {
                localStorage.clear();
                window.location.href = 'provider.html?tab=register';
            }, 2500);
        } else {
            alert("Error: " + data.message);
            btn.disabled = false;
            btn.textContent = "Delete Account";
        }
    })
    .catch(err => {
        console.error("Deletion error:", err);
        alert("Database connection failed. Please ensure your backend is active.");
        btn.disabled = false;
        btn.textContent = "Delete Account";
    });
}
