/**
 * Trusty Services Interaction Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Sticky Header Logic
    const header = document.querySelector('.header');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // 2. Service Area Checker
    const zipInput = document.getElementById('zipCode');
    const checkBtn = document.querySelector('.service-area-checker button');
    
    // Allow pressing Enter to check zip code
    if (zipInput) {
        zipInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchProviders();
            }
        });
    }

    // Set minimum date for booking to today
    const dateInput = document.getElementById('booking-date');
    if (dateInput) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateInput.min = `${yyyy}-${mm}-${dd}`;
    }

    // 3. About Us Modal Revealer
    const aboutLinks = document.querySelectorAll('a[href="#about-us"]');
    aboutLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault(); // prevent scroll
            openAboutModal();
        });
    });

    // 4. Contact Us Modal Revealer
    const contactLinks = document.querySelectorAll('a[href="#contact-us"]');
    contactLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault(); // prevent scroll
            openContactModal();
        });
    });

    // 5. Auth State Checking for Navigation
    let providerEmail = localStorage.getItem('provider_email');
    let clientEmail = localStorage.getItem('client_email');
    const authLink = document.querySelector('a[onclick="openAuthSelectionModal(event)"]');
    
    // Safety check just in case it saved the literal string "undefined"
    if (providerEmail === 'undefined' || providerEmail === 'null') {
        localStorage.removeItem('provider_id');
        localStorage.removeItem('provider_name');
        localStorage.removeItem('provider_email');
        providerEmail = null;
    }
    
    if (clientEmail === 'undefined' || clientEmail === 'null') {
        localStorage.removeItem('client_id');
        localStorage.removeItem('client_name');
        localStorage.removeItem('client_email');
        localStorage.removeItem('client_phone');
        clientEmail = null;
    }
    
    if (authLink) {
        if (providerEmail) {
            const providerId = localStorage.getItem('provider_id');
            authLink.outerHTML = `
                <div class="nav-dropdown-container" style="position: relative; display: inline-block;">
                    <a href="#" id="providerDropdownToggle" style="font-weight: 700; color: var(--clr-trust-blue); display: flex; align-items: center; gap: 0.5rem; text-decoration: none;">
                        ${providerEmail} <i data-lucide="chevron-down" style="width: 16px; height: 16px;"></i>
                    </a>
                    <div id="providerDropdownMenu" style="display: none; position: absolute; top: 100%; right: 0; background: white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border-radius: 0.5rem; border: 1px solid #E2E8F0; padding: 0.5rem; min-width: 150px; z-index: 50; margin-top: 0.5rem;">
                        <a href="provider.html?filter=pending" style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 1rem; color: var(--clr-text); text-decoration: none; border-radius: 0.25rem; transition: background 0.2s;" onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='transparent'">
                            <span>Dashboard</span>
                            <span id="pendingBadge" class="notification-badge" style="display: none;">0</span>
                        </a>
                        <a href="profile.html?role=provider" style="display: block; padding: 0.5rem 1rem; color: var(--clr-text); text-decoration: none; border-radius: 0.25rem; transition: background 0.2s;" onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='transparent'">Profile</a>
                        <a href="#" id="providerLogoutBtn" style="display: block; padding: 0.5rem 1rem; color: #ef4444; text-decoration: none; border-radius: 0.25rem; transition: background 0.2s;" onmouseover="this.style.background='#FEF2F2'" onmouseout="this.style.background='transparent'">Log Out</a>
                    </div>
                </div>
            `;
            setTimeout(() => {
                setupDropdown('provider');
                updatePendingBadge(providerId);
            }, 0);
        } else if (clientEmail) {
            authLink.outerHTML = `
                <div class="nav-dropdown-container" style="position: relative; display: inline-block;">
                    <a href="#" id="clientDropdownToggle" style="font-weight: 700; color: var(--clr-trust-blue); display: flex; align-items: center; gap: 0.5rem; text-decoration: none;">
                        ${clientEmail} <i data-lucide="chevron-down" style="width: 16px; height: 16px;"></i>
                    </a>
                    <div id="clientDropdownMenu" style="display: none; position: absolute; top: 100%; right: 0; background: white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border-radius: 0.5rem; border: 1px solid #E2E8F0; padding: 0.5rem; min-width: 150px; z-index: 50; margin-top: 0.5rem;">
                        <a href="profile.html?role=client" style="display: block; padding: 0.5rem 1rem; color: var(--clr-text); text-decoration: none; border-radius: 0.25rem; transition: background 0.2s;" onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='transparent'">Profile</a>
                        <a href="#" id="clientLogoutBtn" style="display: block; padding: 0.5rem 1rem; color: #ef4444; text-decoration: none; border-radius: 0.25rem; transition: background 0.2s;" onmouseover="this.style.background='#FEF2F2'" onmouseout="this.style.background='transparent'">Log Out</a>
                    </div>
                </div>
            `;
            setTimeout(() => setupDropdown('client'), 0);
        }
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
});

function setupDropdown(type) {
    const toggle = document.getElementById(`${type}DropdownToggle`);
    const menu = document.getElementById(`${type}DropdownMenu`);
    const logoutBtn = document.getElementById(`${type}LogoutBtn`);

    if(toggle && menu) {
        toggle.onclick = (e) => {
            e.preventDefault();
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        };

        document.addEventListener('click', (e) => {
            if (!toggle.contains(e.target) && !menu.contains(e.target)) {
                menu.style.display = 'none';
            }
        });
    }

    if(logoutBtn) {
        logoutBtn.onclick = (e) => {
            e.preventDefault();
            if(type === 'provider') {
                localStorage.removeItem('provider_id');
                localStorage.removeItem('provider_name');
                localStorage.removeItem('provider_email');
            } else {
                localStorage.removeItem('client_id');
                localStorage.removeItem('client_name');
                localStorage.removeItem('client_email');
                localStorage.removeItem('client_phone');
            }
            window.location.reload();
        };
    }
}

// Service Area Dynamic Checking Function
function searchProviders() {
    const pincode = document.getElementById('zipCode') ? document.getElementById('zipCode').value.trim() : '';
    let serviceRaw = document.getElementById('searchService') ? document.getElementById('searchService').value.trim() : '';
    let match = serviceRaw.match(/\(([^)]+)\)$/);
    let service = match ? match[1].trim() : serviceRaw;
    
    const resultDiv = document.getElementById('service-area-result');
    const resultsSection = document.getElementById('search-results-section');
    const resultsGrid = document.getElementById('provider-results-grid');
    
    if (pincode && pincode.length !== 6) {
        resultDiv.textContent = "Pincode must be exactly 6 digits.";
        resultDiv.style.color = "var(--clr-danger)";
        return;
    }
    
    if (!service && !pincode) {
        resultDiv.textContent = "Please enter a service or pincode.";
        resultDiv.style.color = "var(--clr-danger)";
        return;
    }
    
    resultDiv.innerHTML = '<i data-lucide="loader" class="spin"></i> Searching for professionals...';
    resultDiv.style.color = 'var(--clr-text-main)';
    if(typeof lucide !== 'undefined') lucide.createIcons();
    
    fetch(`/api/providers?pincode=${pincode}&service=${service}`)
        .then(res => res.json())
        .then(data => {
            if (data.success && data.providers && data.providers.length > 0) {
                resultDiv.textContent = `Found ${data.providers.length} professional(s) nearby!`;
                resultDiv.style.color = 'var(--clr-success)';
                
                // Show results section
                if(resultsSection) resultsSection.style.display = 'block';
                if(resultsGrid) {
                    resultsGrid.innerHTML = ''; // clear previous
                    
                    data.providers.forEach(pro => {
                        const card = document.createElement('div');
                        card.className = 'service-card';
                        card.innerHTML = `
                            <div class="service-icon" style="background: var(--clr-bg-light); color: var(--clr-trust-blue);">
                                <i data-lucide="user-check"></i>
                            </div>
                            <h3>${pro.name}</h3>
                            <p style="min-height: auto; margin-bottom: 1rem; font-size: 0.95rem; line-height: 1.5;">
                               <strong>Expertise:</strong> ${pro.service_type}<br>
                               <strong>Area:</strong> ${pro.pincode}<br>
                               ${pro.experience ? `<strong>Experience:</strong> ${pro.experience}<br>` : ''}
                               ${pro.rate ? `<strong>Rate:</strong> ${pro.rate}<br>` : ''}
                               ${pro.bio ? `<em style="color: var(--clr-text-muted); display: block; margin-top: 0.5rem; font-size: 0.9rem;">"${pro.bio}"</em>` : ''}
                            </p>
                            <div class="service-footer" style="margin-top: auto; border-top: 1px solid #F1F5F9; padding-top: 1rem;">
                                <span class="price">Available</span>
                                <a href="professional.html?id=${pro.id}" class="book-link" style="cursor: pointer; text-decoration: none;">View Profile <i data-lucide="chevron-right"></i></a>
                            </div>
                        `;
                        resultsGrid.appendChild(card);
                    });
                    if(typeof lucide !== 'undefined') lucide.createIcons(); 
                    resultsSection.scrollIntoView({ behavior: 'smooth' });
                }
            } else {
                resultDiv.textContent = 'Sorry, no professionals found for this area/service. Be the first to join as a Provider!';
                resultDiv.style.color = 'var(--clr-safety-orange)';
                if(resultsSection) resultsSection.style.display = 'none';
            }
        })
        .catch(err => {
            console.error(err);
            resultDiv.textContent = 'Network error. Please make sure the backend server and Database are running.';
            resultDiv.style.color = 'var(--clr-danger)';
        });
}

// 3. Multi-step Booking Modal Logic
const modal = document.getElementById('bookingModal');
const serviceSelect = document.getElementById('modal-service-select');
let currentStep = 1;

function openBookingModal(preSelectedService = '', providerId = '') {
    // Check client login condition first
    const clientEmail = localStorage.getItem('client_email');
    if (!clientEmail || clientEmail === 'null' || clientEmail === 'undefined') {
        window.location.href = 'client-auth.html';
        return;
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    
    const providerIdInput = document.getElementById('selected-provider-id');
    if (providerIdInput) {
        providerIdInput.value = providerId;
    }
    
    // Reset to step 1
    showStep(1);
    
    if (preSelectedService) {
        // Set the dropdown to match the selected service block
        const options = Array.from(serviceSelect.options);
        const optionToSelect = options.find(opt => opt.value.includes(preSelectedService));
        if (optionToSelect) {
            optionToSelect.selected = true;
        }
    }
}

function closeBookingModal() {
    modal.classList.remove('active');
    document.body.style.overflow = ''; // Restore background scrolling
    
    // Reset forms after a delay so user doesn't see it reset while fading out
    setTimeout(() => {
        showStep(1);
        const inputs = modal.querySelectorAll('input, textarea');
        inputs.forEach(input => input.value = '');
    }, 300);
}

const aboutModal = document.getElementById('aboutModal');

function openAboutModal() {
    if(aboutModal) aboutModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAboutModal() {
    if(aboutModal) aboutModal.classList.remove('active');
    checkModalsAndRestoreScroll();
}

const contactModal = document.getElementById('contactModal');

function openContactModal() {
    if(contactModal) contactModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeContactModal() {
    if(contactModal) contactModal.classList.remove('active');
    checkModalsAndRestoreScroll();
}

function openAuthSelectionModal(e) {
    if(e) e.preventDefault();
    const modal = document.getElementById('authSelectionModal');
    if(modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    } else {
        console.error('Modal "authSelectionModal" not found in DOM.');
    }
}

function closeAuthSelectionModal() {
    if(authSelectionModal) authSelectionModal.classList.remove('active');
    checkModalsAndRestoreScroll();
}

function handleClientSelection() {
    closeAuthSelectionModal();
    window.location.href = 'client-auth.html';
}

function checkModalsAndRestoreScroll() {
    const activeModals = document.querySelectorAll('.modal-overlay.active');
    if (activeModals.length === 0) {
        document.body.style.overflow = '';
    }
}

// Close modal on outside click
window.addEventListener('click', (e) => {
    if (e.target === modal) closeBookingModal();
    if (e.target === aboutModal) closeAboutModal();
    if (e.target === contactModal) closeContactModal();
    if (e.target === authSelectionModal) closeAuthSelectionModal();
});

function nextStep(step) {
    // Add simple validation before moving forward
    if (currentStep === 2 && step === 3) {
        const dateInput = document.getElementById('booking-date').value;
        if (!dateInput) {
            alert('Please select a date first.');
            return;
        }
    }
    showStep(step);
}

function showStep(stepIndex) {
    // Hide all steps
    document.querySelectorAll('.booking-step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Show target step
    document.getElementById(`step${stepIndex}`).classList.add('active');
    
    // Update progress dots (only for steps 1-3)
    if (stepIndex <= 3) {
        document.getElementById('booking-progress').style.display = 'flex';
        const dots = document.querySelectorAll('.dot');
        dots.forEach((dot, index) => {
            if (index < stepIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    } else {
        // Hide progress dots on success step
        document.getElementById('booking-progress').style.display = 'none';
    }
    
    currentStep = stepIndex;
}

function confirmBooking() {
    const serviceName = document.getElementById('modal-service-select').value;
    const dateInput = document.getElementById('booking-date').value;
    const timeInput = document.getElementById('booking-time').value;
    
    // Get fields from step 3
    const step3Inputs = document.querySelectorAll('#step3 .form-control');
    const name = step3Inputs[0].value;
    const phone = step3Inputs[1].value;
    const photoInput = document.getElementById('booking-photo');
    
    if (!name || !phone) {
        alert("Please provide your name and phone number so we can text you the confirmation.");
        return;
    }

    // Prevent double-clicking by disabling the confirm button
    const confirmBtn = document.querySelector('#step3 .btn-primary:not(.mt-4.w-full)'); // The confirm button specifically
    if (confirmBtn) {
        if (confirmBtn.disabled) return; // Ignore if already processing
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Confirming...';
    }

    const providerId = document.getElementById('selected-provider-id') ? document.getElementById('selected-provider-id').value : null;
    
    let photoDataUrl = '';
    if (photoInput && photoInput.files && photoInput.files[0]) {
        const file = photoInput.files[0];
        if (file.size > 5 * 1024 * 1024) {
            alert("Photo is too large. Please select an image under 5MB.");
            if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Confirm Booking'; }
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            photoDataUrl = e.target.result;
            executeBookingCall(name, phone, serviceName, dateInput, timeInput, providerId, photoDataUrl, confirmBtn);
        };
        reader.readAsDataURL(file);
    } else {
        executeBookingCall(name, phone, serviceName, dateInput, timeInput, providerId, '', confirmBtn);
    }
}

function executeBookingCall(name, phone, serviceName, dateInput, timeInput, providerId, photoDataUrl, confirmBtn) {
    fetch('/api/book', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: name,
            phone: phone,
            service: serviceName,
            date: dateInput,
            time: timeInput,
            provider_id: providerId,
            client_id: localStorage.getItem('client_id'),
            photo_url: photoDataUrl
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log("Backend response:", data);
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirm Booking';
        }
        showStep(4);
    })
    .catch(error => {
        console.error("Error communicating with backend:", error);
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirm Booking';
        }
        // Show success anyway for demo purposes if backend isn't running
        showStep(4);
    });
}


function openEmergencySOS() {
    openBookingModal();
    const emergencyOption = Array.from(serviceSelect.options).find(opt => opt.value === 'Plumbing' || opt.text.includes('Emergency'));
    // Fallback to setting a custom emergency text or selecting first
    
    // Quick skip to the details form to save time
    showStep(3);
    
    const detailsHeader = document.querySelector('#step3 h3');
    detailsHeader.innerHTML = '<span style="color:red">EMERGENCY DISPATCH</span>';
    detailsHeader.style.color = 'var(--clr-danger)';
    
    // Add red border to modal for implication of emergency
    document.querySelector('.modal-content').style.borderTop = '5px solid var(--clr-danger)';
}

async function detectLocation() {
    const zipInput = document.getElementById('zipCode');
    const resultDiv = document.getElementById('service-area-result');
    const locateBtn = document.querySelector('.btn-icon i[data-lucide="locate-fixed"]');

    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
    }

    if (locateBtn) locateBtn.classList.add('spin');
    if (resultDiv) {
        resultDiv.textContent = "Detecting your location...";
        resultDiv.style.color = "var(--clr-trust-blue)";
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
            // Using free Nominatim API for reverse geocoding
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
            const data = await response.json();
            
            if (data && data.address && data.address.postcode) {
                const postcode = data.address.postcode.replace(/\s+/g, '').slice(0, 6);
                zipInput.value = postcode;
                if (resultDiv) {
                    resultDiv.textContent = `Location detected: ${data.address.suburb || data.address.city || ''} (${postcode})`;
                    resultDiv.style.color = "var(--clr-success)";
                }
            } else {
                throw new Error("Pincode not found for this location.");
            }
        } catch (error) {
            console.error("Location error:", error);
            if (resultDiv) {
                resultDiv.textContent = "Could not detect pincode. Please enter it manually.";
                resultDiv.style.color = "var(--clr-danger)";
            }
        } finally {
            if (locateBtn) locateBtn.classList.remove('spin');
        }
    }, (error) => {
        console.error("Geolocation error:", error);
        if (resultDiv) {
            resultDiv.textContent = "Location access denied. Please enter pincode manually.";
            resultDiv.style.color = "var(--clr-danger)";
        }
        if (locateBtn) locateBtn.classList.remove('spin');
    });
}

function updatePendingBadge(providerId) {
    if(!providerId) return;
    fetch(`/api/provider/dashboard?provider_id=${providerId}`)
    .then(res => res.json())
    .then(data => {
        if(data.success && data.bookings) {
            const pendingCount = data.bookings.filter(b => b.status.toLowerCase() !== 'completed' && b.status.toLowerCase() !== 'cancelled').length;
            const badge = document.getElementById('pendingBadge');
            if(badge) {
                if(pendingCount > 0) {
                    badge.textContent = pendingCount;
                    badge.style.display = 'inline-flex';
                } else {
                    badge.style.display = 'none';
                }
            }
        }
    })
    .catch(err => console.error("Error updating badge", err));
}
