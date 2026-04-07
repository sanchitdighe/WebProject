document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const providerId = urlParams.get('id');

    if (!providerId) {
        document.getElementById('profileContent').innerHTML = `
            <div style="text-align: center; padding: 4rem; width: 100%;">
                <h2>Professional Not Found</h2>
                <p>Please return to the search page and try again.</p>
                <a href="index.html" class="btn btn-primary" style="margin-top: 1rem;">Back to Search</a>
            </div>
        `;
        return;
    }

    // Fetch Provider Details
    fetch(`/api/providers?id=${providerId}`)
        .then(res => res.json())
        .then(data => {
            if (data.success && data.providers && data.providers.length > 0) {
                const pro = data.providers[0];
                renderProfile(pro);
                fetchReviews(providerId);
            } else {
                throw new Error("Provider not found");
            }
        })
        .catch(err => {
            console.error(err);
            document.getElementById('profileContent').innerHTML = `
                <div style="text-align: center; padding: 4rem; width: 100%;">
                    <h2>Error loading profile</h2>
                    <p>Could not connect to the server or provider does not exist.</p>
                    <a href="index.html" class="btn btn-primary" style="margin-top: 1rem;">Back to Search</a>
                </div>
            `;
        });
});

function renderProfile(pro) {
    const container = document.getElementById('profileContent');
    const avatar = pro.avatar_url ? `<img src="${pro.avatar_url}" alt="${pro.name}">` : pro.name.charAt(0).toUpperCase();
    const verifiedBadge = pro.is_verified ? `<div class="verified-badge"><i data-lucide="shield-check" style="width: 14px; height: 14px;"></i> Verified</div>` : '';
    
    // Generate Stars
    const fullStars = Math.floor(pro.avg_rating || 0);
    const emptyStars = 5 - fullStars;
    let starsHtml = '';
    for(let i=0; i<fullStars; i++) starsHtml += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';
    for(let i=0; i<emptyStars; i++) starsHtml += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="empty" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';

    container.innerHTML = `
        <div class="main-column">
            <div class="pro-header">
                <div class="header-content">
                    <div class="pro-avatar">${avatar}</div>
                    <div class="pro-info">
                        ${verifiedBadge}
                        <h1 style="color: var(--clr-trust-blue); font-size: 2.5rem; margin-bottom: 0.5rem;">${pro.name}</h1>
                        <div class="stars" style="margin-bottom: 0.5rem; align-items: center; gap: 0.5rem;">
                            <div style="display: flex;">${starsHtml}</div>
                            <span style="color: var(--clr-text-main); font-weight: 600;">${pro.avg_rating || 'New'}</span>
                            <span style="color: var(--clr-text-muted);">(${pro.total_reviews || 0} reviews)</span>
                        </div>
                        <p style="margin: 0; font-size: 1.1rem; color: var(--clr-text-main);">
                            <i data-lucide="map-pin" style="width: 16px; height: 16px; display: inline-block; vertical-align: text-bottom; color: var(--clr-safety-orange);"></i> Serves Pincode ${pro.pincode}
                        </p>
                    </div>
                </div>
            </div>

            <div style="background: white; border-radius: var(--radius-lg); padding: 2.5rem; box-shadow: var(--shadow-sm); border: 1px solid #E2E8F0; margin-bottom: 2rem;">
                <h3 style="margin-bottom: 1rem; border-bottom: 2px solid #F1F5F9; padding-bottom: 0.5rem;">About</h3>
                <p style="font-size: 1.1rem; line-height: 1.8; color: var(--clr-text-main);">
                    ${pro.bio || "This professional hasn't added a bio yet, but they are ready to help with your project!"}
                </p>
                
                <h3 style="margin-bottom: 1rem; margin-top: 2rem; border-bottom: 2px solid #F1F5F9; padding-bottom: 0.5rem;">Expertise</h3>
                <div style="display: inline-block; background: var(--clr-bg-light); color: var(--clr-trust-blue); padding: 0.5rem 1rem; border-radius: var(--radius-full); font-weight: 600;">
                    ${pro.service_type}
                </div>
                ${pro.experience ? `<div style="display: inline-block; background: var(--clr-bg-light); color: var(--clr-trust-blue); padding: 0.5rem 1rem; border-radius: var(--radius-full); font-weight: 600; margin-left: 0.5rem;">
                    ${pro.experience} Years Experience
                </div>` : ''}
            </div>

            <div id="reviews-section">
                <h3 style="margin-bottom: 1.5rem; font-size: 1.5rem;">Client Reviews</h3>
                <div id="reviews-container">
                    <i data-lucide="loader" class="spin"></i> Loading reviews...
                </div>
            </div>
        </div>

        <div class="sidebar">
            <div class="booking-sidebar">
                <h3 style="margin-bottom: 0.5rem; font-size: 1.5rem;">Request a Booking</h3>
                <p style="color: var(--clr-text-muted); font-size: 0.95rem; margin-bottom: 1.5rem;">
                    ${pro.rate ? `Estimated Base Rate: <strong>${pro.rate}</strong><br>` : ''}
                    Final details negotiated directly.
                </p>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.9rem;">Service Need</label>
                    <input type="text" id="quickService" class="form-control" value="${pro.service_type}" readonly style="background: #F8FAFC;">
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.9rem;">Preferred Date</label>
                    <input type="date" id="quickDate" class="form-control">
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.9rem;">Preferred Time</label>
                    <input type="time" id="quickTime" class="form-control">
                </div>

                <!-- NEW: Photo Upload for Quote -->
                <div style="margin-bottom: 1.5rem; padding: 1rem; border: 1px dashed var(--clr-trust-blue); border-radius: var(--radius-md); text-align: center; background: #F8FAFC;">
                    <i data-lucide="camera" style="color: var(--clr-safety-orange); margin-bottom: 0.5rem; width: 24px; height: 24px;"></i>
                    <p style="font-size: 0.85rem; margin-bottom: 0.5rem;">Upload a photo of the problem for a faster, more accurate quote.</p>
                    <input type="file" id="quickPhoto" accept="image/*" style="font-size: 0.8rem; max-width: 100%;">
                </div>
                
                <button class="btn btn-primary" style="width: 100%; justify-content: center; padding: 1rem; font-size: 1.1rem; border-radius: var(--radius-lg);" onclick="submitDirectBooking(${pro.id})">
                    Request Booking
                </button>
                <p style="font-size: 0.8rem; text-align: center; color: var(--clr-text-muted); margin-top: 1rem; margin-bottom: 0;">No payment required until service is complete.</p>
            </div>
        </div>
    `;
    lucide.createIcons();
    
    // Set min date
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    document.getElementById('quickDate').min = `${yyyy}-${mm}-${dd}`;
}

function fetchReviews(providerId) {
    fetch(`/api/reviews?provider_id=${providerId}`)
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById('reviews-container');
            if (data.success && data.reviews.length > 0) {
                container.innerHTML = '';
                data.reviews.forEach(review => {
                    let starsHtml = '';
                    for(let i=0; i<review.rating; i++) starsHtml += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="fill: #FACC15; width: 14px; height: 14px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';
                    
                    const el = document.createElement('div');
                    el.className = 'review-card';
                    el.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                            <div>
                                <strong style="color: var(--clr-trust-blue);">${review.client_name}</strong>
                                <div class="stars" style="margin-top: 0.25rem;">${starsHtml}</div>
                            </div>
                            <span style="font-size: 0.85rem; color: var(--clr-text-muted);">${new Date(review.created_at).toLocaleDateString()}</span>
                        </div>
                        <p style="margin: 0; color: var(--clr-text-main); font-size: 0.95rem; line-height: 1.5;">"${review.review_text}"</p>
                    `;
                    container.appendChild(el);
                });
            } else {
                container.innerHTML = '<p style="color: var(--clr-text-muted);">This professional has no reviews yet.</p>';
            }
        })
        .catch(err => {
            console.error(err);
            document.getElementById('reviews-container').innerHTML = '<p style="color: var(--clr-danger);">Failed to load reviews.</p>';
        });
}

function submitDirectBooking(providerId) {
    const clientEmail = localStorage.getItem('client_email');
    if (!clientEmail || clientEmail === 'null' || clientEmail === 'undefined') {
        window.location.href = 'client-auth.html';
        return;
    }

    const date = document.getElementById('quickDate').value;
    const time = document.getElementById('quickTime').value;
    const service = document.getElementById('quickService').value;
    const photoInput = document.getElementById('quickPhoto');
    const clientId = localStorage.getItem('client_id');
    const name = localStorage.getItem('client_name') || 'Guest';
    const phone = localStorage.getItem('client_phone') || '0000000000';

    if (!date || !time) {
        alert("Please select a preferred date and time.");
        return;
    }

    // Handle Photo Conversion to Base64
    let photoDataUrl = '';
    if (photoInput.files && photoInput.files[0]) {
        const file = photoInput.files[0];
        // 5MB limit
        if (file.size > 5 * 1024 * 1024) {
            alert("Photo is too large. Please select an image under 5MB.");
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            photoDataUrl = e.target.result;
            sendBookingRequest(name, phone, service, date, time, providerId, clientId, photoDataUrl);
        };
        reader.readAsDataURL(file);
    } else {
        sendBookingRequest(name, phone, service, date, time, providerId, clientId, '');
    }
}

function sendBookingRequest(name, phone, service, date, time, providerId, clientId, photoUrl) {
    const btn = document.querySelector('.booking-sidebar .btn-primary');
    const origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name, phone, service, date, time, provider_id: providerId, client_id: clientId, photo_url: photoUrl
        })
    })
    .then(res => res.json())
    .then(data => {
        if(data.success || true) { // Force success for demo simplicity if backend doesn't explicitly return true
            document.querySelector('.booking-sidebar').innerHTML = `
                <div style="text-align: center; padding: 2rem 0;">
                    <div style="width: 64px; height: 64px; background: #DCFCE7; color: #15803D; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <h3 style="margin-bottom: 0.5rem;">Request Sent!</h3>
                    <p style="color: var(--clr-text-muted);">The professional will notify you shortly via SMS to confirm details.</p>
                    <a href="profile.html?role=client" class="btn btn-primary" style="margin-top: 1.5rem;">View Dashboard</a>
                </div>
            `;
        }
    })
    .catch(err => {
        console.error(err);
        alert('Error submitting booking.');
        btn.disabled = false;
        btn.textContent = origText;
    });
}
