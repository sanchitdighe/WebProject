/**
 * Admin Dashboard Logic - Secure Version (Ask Every Time)
 */

const API_BASE = '/api';

// No Initialize check here: always show the overlay on every refresh/visit

async function handleAdminLogin() {
    const password = document.getElementById('adminPassword').value;
    const errorEl = document.getElementById('loginError');
    
    if (!password) {
        errorEl.textContent = "Please enter password.";
        errorEl.style.display = 'block';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        const data = await response.json();

        if (data.success) {
            // we don't store any token anywhere: this ensures it asks every time
            showDashboard();
        } else {
            errorEl.textContent = data.message || "Access Denied: Invalid Password.";
            errorEl.style.display = 'block';
        }
    } catch (error) {
        console.error("Admin login error:", error);
        errorEl.innerHTML = `<strong>Connection Failed:</strong><br>${error.message}<br><small>Target: ${API_BASE}</small><br><br>Please check if the Python server is running on port 3000.`;
        errorEl.style.display = 'block';
    }
}

function showDashboard() {
    const overlay = document.getElementById('adminLoginOverlay');
    const header = document.getElementById('adminHeader');
    const dashboard = document.getElementById('adminDashboard');
    
    if (overlay) overlay.style.display = 'none';
    if (header) header.style.display = 'block';
    if (dashboard) dashboard.style.display = 'block';
    loadAdminData();
}

async function loadAdminData() {
    try {
        const response = await fetch(`${API_BASE}/admin/data`);
        const data = await response.json();

        if (data.success) {
            renderStats(data.stats);
            renderBookings(data.bookings);
            renderProviders(data.providers);
            renderClients(data.clients);
            
            if (window.lucide) lucide.createIcons();
        }
    } catch (error) {
        console.error("Error loading admin data:", error);
    }
}

function renderStats(stats) {
    const elClients = document.getElementById('statClients');
    const elProviders = document.getElementById('statProviders');
    const elBookings = document.getElementById('statBookings');
    
    if (elClients) elClients.textContent = stats.total_clients || 0;
    if (elProviders) elProviders.textContent = stats.total_providers || 0;
    if (elBookings) elBookings.textContent = stats.total_bookings || 0;
}

function renderBookings(bookings) {
    const tbody = document.getElementById('bookingsTableBody');
    const countEl = document.getElementById('bookingCount');
    if (countEl) countEl.textContent = `${bookings.length} Total`;
    if (!tbody) return;

    tbody.innerHTML = '';
    bookings.forEach(b => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 700;">#${b.id}</td>
            <td>
                <div style="font-weight: 600;">${b.client_name}</div>
                <div style="font-size: 0.75rem; color: var(--clr-text-muted);">${b.client_phone}</div>
            </td>
            <td style="font-weight: 500;">${b.provider_name || 'N/A'}</td>
            <td><span class="badge" style="background: #f3f4f6;">${b.service_type}</span></td>
            <td>${b.date} at ${b.time}</td>
            <td><span class="badge" style="background: ${b.status === 'completed' ? '#dcfce7' : '#fef9c3'}; color: ${b.status === 'completed' ? '#166534' : '#854d0e'};">${b.status}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function renderProviders(providers) {
    const tbody = document.getElementById('providersTableBody');
    const countEl = document.getElementById('providerCount');
    if (countEl) countEl.textContent = `${providers.length} Partners`;
    if (!tbody) return;
    
    tbody.innerHTML = '';

    providers.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600;">${p.name}</td>
            <td style="color: var(--clr-text-muted);">${p.email}</td>
            <td><span class="badge" style="background: #eff6ff; color: #3b82f6;">${p.service_type}</span></td>
            <td>${p.pincode}</td>
            <td><span class="badge ${p.is_verified ? 'badge-verified' : 'badge-pending'}">${p.is_verified ? 'Verified' : 'Pending'}</span></td>
            <td>
                <button class="btn btn-outline" onclick="toggleVerification(${p.id}, ${p.is_verified})" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">${p.is_verified ? 'Unverify' : 'Verify'}</button>
                <button class="btn btn-outline" onclick="deleteProvider(${p.id})" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; color: var(--clr-danger); border-color: var(--clr-danger);">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderClients(clients) {
    const tbody = document.getElementById('clientsTableBody');
    const countEl = document.getElementById('clientCount');
    if (countEl) countEl.textContent = `${clients.length} Total`;
    if (!tbody) return;

    tbody.innerHTML = '';

    clients.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600;">${c.name}</td>
            <td style="color: var(--clr-text-muted);">${c.email}</td>
            <td>${c.phone || 'N/A'}</td>
            <td>
                <button class="btn btn-outline" onclick="deleteClient(${c.id})" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; color: var(--clr-danger); border-color: var(--clr-danger);">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function toggleVerification(providerId, currentStatus) {
    try {
        const response = await fetch(`${API_BASE}/admin/verify_provider`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider_id: providerId, is_verified: !currentStatus })
        });
        const data = await response.json();
        if (data.success) {
            loadAdminData();
        }
    } catch (error) {
        console.error("Error toggling verification:", error);
    }
}

async function deleteClient(clientId) {
    if (!confirm("Are you sure you want to delete this client? All their bookings will also be removed.")) return;
    try {
        const response = await fetch(`${API_BASE}/client/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ client_id: clientId })
        });
        const data = await response.json();
        if (data.success) {
            loadAdminData();
        }
    } catch (error) {
        console.error("Error deleting client:", error);
    }
}

async function deleteProvider(providerId) {
    if (!confirm("Are you sure you want to delete this provider? All their bookings and reviews will also be removed.")) return;
    try {
        const response = await fetch(`${API_BASE}/provider/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider_id: providerId })
        });
        const data = await response.json();
        if (data.success) {
            loadAdminData();
        }
    } catch (error) {
        console.error("Error deleting provider:", error);
    }
}

function adminLogout() {
    window.location.reload();
}
