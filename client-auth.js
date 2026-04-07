function switchClientTab(tab) {
    document.getElementById('loginForm').classList.remove('active');
    document.getElementById('registerForm').classList.remove('active');
    
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    
    if(tab === 'login') {
        document.getElementById('loginForm').classList.add('active');
        document.querySelectorAll('.auth-tab')[0].classList.add('active');
    } else {
        document.getElementById('registerForm').classList.add('active');
        document.querySelectorAll('.auth-tab')[1].classList.add('active');
    }
}

function handleClientLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    const btn = document.querySelector('#loginForm .btn-primary');

    if (!email || !password) {
        errorDiv.textContent = "Please fill in all fields.";
        return;
    }

    btn.textContent = 'Logging in...';
    btn.disabled = true;
    errorDiv.textContent = "";

    fetch('/api/client/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            localStorage.setItem('client_id', data.client_id);
            localStorage.setItem('client_name', data.name);
            localStorage.setItem('client_email', data.email);
            localStorage.setItem('client_phone', data.phone);
            window.location.href = 'index.html';
        } else {
            errorDiv.textContent = data.message || "Login failed.";
            btn.textContent = 'Log In';
            btn.disabled = false;
        }
    })
    .catch(err => {
        errorDiv.textContent = "Network error. Make sure server is running.";
        btn.textContent = 'Log In';
        btn.disabled = false;
    });
}

function handleClientRegister() {
    const name = document.getElementById('regName').value;
    const phone = document.getElementById('regPhone').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const errorDiv = document.getElementById('registerError');
    const btn = document.querySelector('#registerForm .btn-primary');

    if (!name || !phone || !email || !password) {
        errorDiv.textContent = "Please fill in all required fields.";
        return;
    }

    btn.textContent = 'Registering...';
    btn.disabled = true;
    errorDiv.textContent = "";

    fetch('/api/client/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name, email, phone, password
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            localStorage.setItem('client_id', data.client_id);
            localStorage.setItem('client_name', name);
            localStorage.setItem('client_email', email);
            localStorage.setItem('client_phone', phone);
            window.location.href = 'index.html';
        } else {
            errorDiv.textContent = data.message || "Registration failed.";
            btn.textContent = 'Register Account';
            btn.disabled = false;
        }
    })
    .catch(err => {
        errorDiv.textContent = "Network error. Make sure server is running.";
        btn.textContent = 'Register Account';
        btn.disabled = false;
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

    fetch('/api/forgot-password', {
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

    fetch('/api/verify-otp', {
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

    fetch('/api/reset-password', {
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

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'register') {
        switchClientTab('register');
    }
});
