/* profile.js */
const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const role = params.get('role') || 'client'; // default to client
    loadProfile(role);
});

function loadProfile(role) {
    const userId = localStorage.getItem(`${role}_id`);
    if(!userId || userId === 'undefined') { // Safety check for 'undefined' string
        console.warn(`No valid ${role}_id found in localStorage. Redirecting...`);
        window.location.href = 'index.html';
        return;
    }

    const endpoint = role === 'provider' 
        ? `${API_BASE}/provider/dashboard?provider_id=${userId}`
        : `${API_BASE}/client/dashboard?client_id=${userId}`;

    fetch(endpoint)
    .then(res => {
        if(!res.ok) {
            // Try to get error text if not JSON
            return res.text().then(text => {
                throw new Error(`Server returned ${res.status}: ${text.substring(0, 100)}`);
            });
        }
        return res.json();
    })
    .then(data => {
        if(data.success) {
            renderProfile(role, data);
        } else {
            console.error("Server message:", data.message);
            alert("Error loading profile data: " + (data.message || 'Unknown error'));
            document.getElementById('profileName').textContent = "Error Loading";
        }
    })
    .catch(err => {
        console.error("Profile error details:", err);
        alert("Connection Error. Please ensure server.py is running on port 3000.\n\nDetails: " + err.message);
        document.getElementById('profileName').textContent = "Connection Error";
    });
}

function renderProfile(role, data) {
    const user = role === 'provider' ? data.provider : data.client;
    const bookings = data.bookings || [];

    if(!user || Object.keys(user).length === 0) {
        console.error("User data not found in response:", data);
        alert("Account details not found. Please log in again.");
        window.location.href = 'index.html';
        return;
    }

    const nameEl = document.getElementById('profileName');
    if (nameEl) {
        nameEl.innerHTML = `${user.name} <span id="verificationBadge"></span>`;
    }
    document.getElementById('profileTagline').textContent = role === 'provider' ? 'Professional Partner' : 'Trusty Customer';
    
    // Show edit/delete buttons and store current user data globally for the modal
    const editBtn = document.getElementById('editProfileBtn');
    if (editBtn) editBtn.style.display = 'flex';
    
    const deleteBtn = document.getElementById('deleteProfileBtn');
    if (deleteBtn) deleteBtn.style.display = 'flex';

    window.currentUserData = user;
    window.currentUserRole = role;

    const infoGrid = document.getElementById('profileInfoGrid');
    let infoHtml = `
        <div class="info-item"><label>Email</label><span>${user.email}</span></div>
        <div class="info-item"><label>Phone</label><span>${user.phone}</span></div>
    `;

    if(role === 'provider') {
        const isVerified = data.provider.is_verified;
        const banner = document.getElementById('verificationWarning');
        const badgeContainer = document.getElementById('verificationBadge');
        
        if (banner) banner.style.display = isVerified ? 'none' : 'flex';
        
        if (badgeContainer) {
            badgeContainer.innerHTML = isVerified 
                ? '<span style="background: #DCFCE7; color: #15803D; padding: 0.2rem 0.6rem; border-radius: 1rem; font-size: 0.8rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem;"><i data-lucide="check-circle" style="width:14px;height:14px;"></i> Verified</span>'
                : '<span style="background: #FEF3C7; color: #92400E; padding: 0.2rem 0.6rem; border-radius: 1rem; font-size: 0.8rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem;"><i data-lucide="clock" style="width:14px;height:14px;"></i> Pending Review</span>';
        }

        infoHtml += `
            <div class="info-item"><label>Service</label><span>${user.service_type}</span></div>
            <div class="info-item"><label>Location</label><span>Pincode: ${user.pincode}</span></div>
            <div class="info-item"><label>Experience</label><span>${user.experience || 'N/A'}</span></div>
            <div class="info-item"><label>Rate</label><span>${user.rate || 'N/A'}</span></div>
        `;
    }

    infoGrid.innerHTML = infoHtml;

    const tableHeader = document.getElementById('tableHeaderRow');
    tableHeader.innerHTML = role === 'provider' 
        ? '<th>Service</th><th>Client</th><th>Date</th><th>Time</th><th>Status</th><th>Action</th>'
        : '<th>Service</th><th>Professional</th><th>Date</th><th>Time</th><th>Status</th><th>Action</th>';

    const tbody = document.getElementById('historyTableBody');
    const noHistory = document.getElementById('noHistory');
    tbody.innerHTML = '';

    if(bookings.length > 0) {
        noHistory.style.display = 'none';
        bookings.forEach(b => {
            const tr = document.createElement('tr');
            const partnerName = role === 'provider' ? b.client_name : (b.provider_name || 'Assigned');
            
            let actionsHtml = '';
            
            // Role-specific primary actions
            if (role === 'provider' && b.status.toLowerCase() === 'pending') {
                actionsHtml += `<button class="btn btn-primary btn-sm" onclick="markCompleted(${b.id})" style="margin-right: 0.5rem;">Complete Job</button>`;
            }
            
            if (role === 'client' && b.status.toLowerCase() === 'completed') {
                if (!b.has_reviewed) {
                    actionsHtml += `<button class="btn btn-primary btn-sm" onclick="openReviewModal(${b.id}, ${b.provider_id}, '${partnerName.replace(/'/g, "\\'")}')" style="margin-right: 0.5rem;">Leave Review</button>`;
                } else {
                    actionsHtml += `<span style="color: var(--clr-success); font-size: 0.85rem; font-weight: 600; margin-right: 0.5rem;"><i data-lucide="check-circle" style="width:14px;height:14px;vertical-align:middle;"></i> Reviewed</span>`;
                }
            }
            
            // Additional universal actions
            if (b.photo_url) {
                actionsHtml += `<a href="${b.photo_url}" target="_blank" class="btn btn-outline btn-sm" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;"><i data-lucide="image" style="width:14px;height:14px;vertical-align:middle;"></i> Photo</a>`;
            }
            
            // Fallback if absolutely no actions are applicable
            if (!actionsHtml) {
                actionsHtml = `<span style="color: var(--clr-text-muted); font-size: 0.85rem;">No Actions</span>`;
            }

            tr.innerHTML = `
                <td><strong>${b.service_type}</strong></td>
                <td>${partnerName}</td>
                <td>${b.date}</td>
                <td>${b.time}</td>
                <td><span class="status-badge status-${b.status.toLowerCase()}">${b.status}</span></td>
                <td>${actionsHtml}</td>
            `;
            tbody.appendChild(tr);
        });
        if(typeof lucide !== 'undefined') lucide.createIcons();
    } else {
        noHistory.style.display = 'block';
    }
}

function openEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    const fieldsContainer = document.getElementById('dynamicEditFields');
    const user = window.currentUserData;
    const role = window.currentUserRole;

    if (!user || !role) return;

    let html = `
        <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Full Name</label>
            <input type="text" id="editName" class="form-control" value="${user.name || ''}" required>
        </div>
        <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Email</label>
            <input type="email" id="editEmail" class="form-control" value="${user.email || ''}" required>
        </div>
        <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Phone</label>
            <input type="tel" id="editPhone" class="form-control" value="${user.phone || ''}" required>
        </div>
    `;

    if (role === 'provider') {
        html += `
            <div>
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Service Type</label>
                <select id="editServiceType" class="form-control" required>
                    <option value="Plumbing" ${user.service_type === 'Plumbing' ? 'selected' : ''}>Plumbing</option>
                    <option value="Electrical" ${user.service_type === 'Electrical' ? 'selected' : ''}>Electrical</option>
                    <option value="Carpentry" ${user.service_type === 'Carpentry' ? 'selected' : ''}>Carpentry</option>
                    <option value="Green Tech" ${user.service_type === 'Green Tech' ? 'selected' : ''}>Green Tech</option>
                    <option value="Automotive" ${user.service_type === 'Automotive' ? 'selected' : ''}>Automotive</option>
                </select>
            </div>
            <div>
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Pincode</label>
                <input type="text" id="editPincode" class="form-control" maxlength="6" value="${user.pincode || ''}" required>
            </div>
            <div>
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Experience</label>
                <input type="text" id="editExperience" class="form-control" value="${user.experience || ''}">
            </div>
            <div>
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Rate</label>
                <input type="text" id="editRate" class="form-control" placeholder="e.g. $50/hr" value="${user.rate || ''}">
            </div>
        `;
    }

    fieldsContainer.innerHTML = html;
    modal.classList.add('active');
}

function closeEditProfileModal() {
    document.getElementById('editProfileModal').classList.remove('active');
}

function saveProfileChanges(event) {
    event.preventDefault();
    
    const role = window.currentUserRole;
    const userId = localStorage.getItem(`${role}_id`);
    
    const btn = document.getElementById('saveProfileBtn');
    const originalText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;

    const data = {
        id: userId,
        name: document.getElementById('editName').value,
        email: document.getElementById('editEmail').value,
        phone: document.getElementById('editPhone').value
    };

    if (role === 'provider') {
        data.service_type = document.getElementById('editServiceType').value;
        data.pincode = document.getElementById('editPincode').value;
        data.experience = document.getElementById('editExperience').value;
        data.rate = document.getElementById('editRate').value;
    }

    const endpoint = role === 'provider' 
        ? `${API_BASE}/provider/update_profile`
        : `${API_BASE}/client/update_profile`;

    fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => {
        if (!res.ok) {
            return res.text().then(text => {
                throw new Error("Server returned " + res.status + ": " + text.substring(0, 100));
            });
        }
        return res.json();
    })
    .then(result => {
        if (result.success) {
            closeEditProfileModal();
            // Reload profile data with the updated details
            loadProfile(role);
        } else {
            alert('Failed to update profile: ' + (result.message || 'Unknown error'));
        }
    })
    .catch(err => {
        console.error('Update error:', err);
        if (err.message.includes('404')) {
            alert('Error 404: The server endpoint was not found. Have you restarted the backend Python server (server.py) since the new profile edit feature was added?');
        } else {
            alert('Error updating profile: ' + err.message);
        }
    })
    .finally(() => {
        btn.textContent = originalText;
        btn.disabled = false;
    });
}

// ------------------------------------------------------------------
// Review System
// ------------------------------------------------------------------
let currentReviewBookingId = null;
let currentReviewProviderId = null;

function openReviewModal(bookingId, providerId, providerName) {
    currentReviewBookingId = bookingId;
    currentReviewProviderId = providerId;
    document.getElementById('reviewProviderName').textContent = providerName;
    document.getElementById('reviewRating').value = '5';
    document.getElementById('reviewText').value = '';
    
    document.getElementById('reviewModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeReviewModal() {
    document.getElementById('reviewModal').classList.remove('active');
    document.body.style.overflow = '';
}

function submitReview() {
    const rating = document.getElementById('reviewRating').value;
    const text = document.getElementById('reviewText').value;
    const clientId = localStorage.getItem('client_id');
    const btn = document.getElementById('submitReviewBtn');

    if (!rating) return;
    
    const originalText = btn.textContent;
    btn.textContent = 'Submitting...';
    btn.disabled = true;

    fetch('/api/client/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            booking_id: currentReviewBookingId,
            client_id: clientId,
            provider_id: currentReviewProviderId,
            rating: rating,
            review_text: text
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            closeReviewModal();
            loadProfile('client'); // Reload to hide button
        } else {
            alert(data.message || 'Error submitting review');
        }
    })
    .catch(err => {
        console.error(err);
        alert('Could not submit review. Please try again later.');
    })
    .finally(() => {
        btn.textContent = originalText;
        btn.disabled = false;
    });
}

function deleteClientProfile() {
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
    
    if (!window.currentUserData || !window.currentUserRole) {
        alert("Session error. Please log in again.");
        closeConfirmModal();
        return;
    }

    const endpoint = window.currentUserRole === 'provider' ? '/provider/delete' : '/client/delete';
    const payload = window.currentUserRole === 'provider' 
        ? { provider_id: window.currentUserData.id } 
        : { client_id: window.currentUserData.id };

    btn.disabled = true;
    btn.textContent = "Deleting from Database...";
    
    fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            content.classList.add('success');
            title.textContent = "Successfully Deleted";
            text.textContent = "Your profile and all personal details have been permanently deleted from our database.";
            
            setTimeout(() => {
                localStorage.clear();
                const redirectUrl = window.currentUserRole === 'provider' ? 'provider.html?tab=register' : 'client-auth.html?tab=register';
                window.location.href = redirectUrl;
            }, 2500);
        } else {
            alert("Error: " + data.message);
            btn.disabled = false;
            btn.textContent = "Delete Profile";
        }
    })
    .catch(err => {
        console.error("Deletion error:", err);
        alert("Failed to reach the database. Please ensure the server is running.");
        btn.disabled = false;
        btn.textContent = "Delete Profile";
    });
}

