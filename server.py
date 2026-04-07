import http.server
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import sqlite3
import urllib.parse
import os
import random
import time as time_module
import base64
import smtplib
import socketserver
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
# Load environment variables (optional)
try:
    from dotenv import load_dotenv
    load_dotenv()
    print("Environment variables loaded from .env", flush=True)
except ImportError:
    pass

try:
    from twilio.rest import Client as TwilioClient
    print("Twilio library found.", flush=True)
except ImportError:
    TwilioClient = None
    print("Twilio library NOT found. Using simulation mode.", flush=True)

PORT = 3000
DB_PATH = 'swiftfix.db'
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'admin123')

# Twilio Credentials (Optional)
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID', 'your_twilio_account_sid_here')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN', 'your_twilio_auth_token_here')
TWILIO_PHONE_NUMBER = os.getenv('TWILIO_PHONE_NUMBER', 'your_twilio_phone_number_here')

# Email Credentials for OTP
EMAIL_USER = os.getenv('EMAIL_USER') or os.getenv('SMTP_EMAIL', '')
EMAIL_PASS = os.getenv('EMAIL_PASS') or os.getenv('SMTP_PASSWORD', '')
SMTP_SERVER = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', 587))

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def send_otp_email(to_email, otp_code):
    # Debug: Always print OTP for verification
    print(f"DEBUG: OTP for {to_email} is: {otp_code}", flush=True)
    
    if not EMAIL_USER or not EMAIL_PASS:
        print(f"Email credentials not set. OTP for {to_email} is: {otp_code}", flush=True)
        return True, ""
    
    try:
        msg = MIMEMultipart()
        msg['From'] = f"SwiftFix Support <{EMAIL_USER}>"
        msg['To'] = to_email
        msg['Subject'] = "SwiftFix Password Reset OTP"
        
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #ff6b00; text-align: center;">SwiftFix</h2>
                <p>Hello,</p>
                <p>You requested a password reset. Use the following dynamic code to verify your identity:</p>
                <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; color: #000; border-radius: 5px; margin: 20px 0;">
                    {otp_code}
                </div>
                <p>This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #777; text-align: center;">&copy; 2026 SwiftFix Platform. All rights reserved.</p>
            </div>
        </body>
        </html>
        """
        msg.attach(MIMEText(body, 'html'))
        
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASS)
        server.send_message(msg)
        server.quit()
        return True, ""
    except Exception as e:
        print("SMTP Error:", e)
        return False, str(e)

def send_booking_sms(to_phone, client_name, service_type, date, time):
    if not TwilioClient or not TWILIO_ACCOUNT_SID or 'your_twilio' in TWILIO_ACCOUNT_SID:
        print(f"SMS Simulation for {to_phone}: Hello {client_name}, your {service_type} booking is confirmed for {date} at {time}.", flush=True)
        return True
    
    try:
        client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        message = client.messages.create(
            body=f"Hello {client_name}, your SwiftFix {service_type} booking is confirmed for {date} at {time}. Thank you for choosing Trusty Services!",
            from_=TWILIO_PHONE_NUMBER,
            to=to_phone
        )
        print(f"SMS Sent successfully: {message.sid}", flush=True)
        return True
    except Exception as e:
        print(f"Twilio SMS Error: {e}", flush=True)
        return False

class SwiftFixServer(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Access-Control-Allow-Private-Network', 'true')
        self.end_headers()

    def do_GET(self):
        # API: Fetch Providers
        if self.path.startswith('/api/providers'):
            parsed_path = urllib.parse.urlparse(self.path)
            query = urllib.parse.parse_qs(parsed_path.query)
            service = query.get('service', [''])[0]
            pincode = query.get('pincode', [''])[0]
            provider_id = query.get('id', [''])[0]
            
            conn = get_db()
            cursor = conn.cursor()
            providers = None
            
            # Base query with aggregate stats for performance (AVOID N+1)
            base_select = """
                SELECT p.id, p.name, p.email, p.phone, p.service_type, p.pincode, p.experience, p.rate, p.bio, p.avatar_url, p.is_verified,
                       AVG(r.rating) as avg_rating, COUNT(r.id) as total_reviews
                FROM providers p
                LEFT JOIN reviews r ON p.id = r.provider_id
            """
            
            if provider_id:
                # CRITICAL: If querying by ID, still enforce verification to prevent direct link access to unverified pros
                cursor.execute(f"{base_select} WHERE p.id = ? GROUP BY p.id", (provider_id,))
                row = cursor.fetchone()
                if row:
                    p = dict(row)
                    if not p['is_verified']:
                        self.send_json_response(403, {'success': False, 'message': 'This professional account is currently under review.'})
                        conn.close()
                        return
                    providers = [p]
                else:
                    providers = []
            elif service and pincode:
                cursor.execute(f"{base_select} WHERE LOWER(p.service_type) = LOWER(?) AND p.pincode = ? AND p.is_verified = 1 GROUP BY p.id", (service, pincode))
            elif service:
                cursor.execute(f"{base_select} WHERE LOWER(p.service_type) = LOWER(?) AND p.is_verified = 1 GROUP BY p.id", (service,))
            elif pincode:
                cursor.execute(f"{base_select} WHERE p.pincode = ? AND p.is_verified = 1 GROUP BY p.id", (pincode,))
            else:
                cursor.execute(f"{base_select} WHERE p.is_verified = 1 GROUP BY p.id")
                
            if providers is None:
                providers = [dict(row) for row in cursor.fetchall()]
            
            # Apply rounding to the already fetched avg_rating
            for p in providers:
                p['avg_rating'] = round(p['avg_rating'], 1) if p['avg_rating'] is not None else 0
                
            conn.close()
            self.send_json_response(200, {'success': True, 'providers': providers})
        
        # API: Admin Dashboard Data
        elif self.path == '/api/admin/data':
            conn = get_db()
            cursor = conn.cursor()
            try:
                clients = [dict(row) for row in cursor.execute("SELECT id, name, email, phone FROM clients ORDER BY id DESC").fetchall()]
                providers = [dict(row) for row in cursor.execute("SELECT id, name, email, phone, service_type, pincode, is_verified FROM providers ORDER BY id DESC").fetchall()]
                # Enriched bookings for admin
                bookings_rows = cursor.execute("""
                    SELECT b.id, b.client_name, b.client_phone, b.service_type, b.date, b.time, b.status, p.name as provider_name 
                    FROM bookings b 
                    LEFT JOIN providers p ON b.provider_id = p.id 
                    ORDER BY b.id DESC
                """).fetchall()
                bookings = [dict(row) for row in bookings_rows]
                stats = {'total_clients': len(clients), 'total_providers': len(providers), 'total_bookings': len(bookings)}
                self.send_json_response(200, {'success': True, 'clients': clients, 'providers': providers, 'bookings': bookings, 'stats': stats})
            except Exception as e:
                print(f"ADMIN DATA ERROR: {e}", flush=True)
                self.send_json_response(500, {'success': False, 'message': str(e)})
            finally:
                conn.close()

        # API: Provider Dashboard Data
        elif self.path.startswith('/api/provider/dashboard'):
            parsed_path = urllib.parse.urlparse(self.path)
            query = urllib.parse.parse_qs(parsed_path.query)
            provider_id_raw = query.get('provider_id', [''])[0]
            if not provider_id_raw:
                self.send_json_response(400, {'success': False, 'message': 'Missing provider_id'})
                return
            try:
                provider_id = int(provider_id_raw)
            except (ValueError, TypeError):
                self.send_json_response(400, {'success': False, 'message': f'Invalid provider_id: {provider_id_raw}'})
                return

            try:
                conn = get_db()
                cursor = conn.cursor()
                cursor.execute("SELECT id, client_name, client_phone, service_type, date, time, status, photo_url FROM bookings WHERE provider_id = ? ORDER BY id DESC", (provider_id,))
                bookings = [dict(row) for row in cursor.fetchall()]
                row = cursor.execute("SELECT id, name, email, phone, service_type, pincode, experience, rate, bio, avatar_url, is_verified FROM providers WHERE id = ?", (provider_id,)).fetchone()
                provider = dict(row) if row else {}
                conn.close()
                self.send_json_response(200, {'success': True, 'bookings': bookings, 'provider': provider})
            except Exception as e:
                self.send_json_response(500, {'success': False, 'message': str(e)})

        # API: Client Dashboard Data
        elif self.path.startswith('/api/client/dashboard'):
            parsed_path = urllib.parse.urlparse(self.path)
            query = urllib.parse.parse_qs(parsed_path.query)
            client_id_raw = query.get('client_id', [''])[0]
            if not client_id_raw:
                self.send_json_response(400, {'success': False, 'message': 'Missing client_id'})
                return
            try:
                client_id = int(client_id_raw)
            except (ValueError, TypeError):
                self.send_json_response(400, {'success': False, 'message': f'Invalid client_id: {client_id_raw}'})
                return

            try:
                conn = get_db()
                cursor = conn.cursor()
                row = cursor.execute("SELECT id, name, email, phone FROM clients WHERE id = ?", (client_id,)).fetchone()
                client = dict(row) if row else {}
                if client:
                    cursor.execute("SELECT id, provider_id, service_type, date, time, status, photo_url FROM bookings WHERE client_id = ? OR client_phone = ? ORDER BY id DESC", (client['id'], client['phone']))
                    bookings = [dict(row) for row in cursor.fetchall()]
                    enriched_bookings = []
                    for b in bookings:
                        p_row = cursor.execute("SELECT name FROM providers WHERE id = ?", (b['provider_id'],)).fetchone()
                        b['provider_name'] = p_row['name'] if p_row else 'Unknown Provider'
                        rev_row = cursor.execute("SELECT id FROM reviews WHERE booking_id = ?", (b['id'],)).fetchone()
                        b['has_reviewed'] = True if rev_row else False
                        enriched_bookings.append(b)
                    self.send_json_response(200, {'success': True, 'bookings': enriched_bookings, 'client': client})
                else:
                    self.send_json_response(404, {'success': False, 'message': 'Client not found'})
                conn.close()
            except Exception as e:
                self.send_json_response(500, {'success': False, 'message': str(e)})
        
        # API: Fetch Reviews
        elif self.path.startswith('/api/reviews'):
            parsed_path = urllib.parse.urlparse(self.path)
            query = urllib.parse.parse_qs(parsed_path.query)
            provider_id_raw = query.get('provider_id', [''])[0]
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT r.id, r.rating, r.review_text, r.created_at, c.name as client_name FROM reviews r JOIN clients c ON r.client_id = c.id WHERE r.provider_id = ? ORDER BY r.id DESC", (provider_id_raw,))
            reviews = [dict(row) for row in cursor.fetchall()]
            conn.close()
            self.send_json_response(200, {'success': True, 'reviews': reviews})
            
        # Unified Static File Serving
        else:
            self.serve_static_file()

    def serve_static_file(self):
        path = self.path
        if path == '/': path = '/index.html'
        path = path.split('?')[0]
        filepath = os.path.join(os.getcwd(), path.lstrip('/'))
        
        if os.path.exists(filepath) and os.path.isfile(filepath):
            content_type = "text/plain"
            if filepath.endswith(".html"): content_type = "text/html"
            elif filepath.endswith(".js"): content_type = "application/javascript"
            elif filepath.endswith(".css"): content_type = "text/css"
            elif filepath.endswith(".png"): content_type = "image/png"
            elif filepath.endswith(".jpg") or filepath.endswith(".jpeg"): content_type = "image/jpeg"
            elif filepath.endswith(".svg"): content_type = "image/svg+xml"
            elif filepath.endswith(".webp"): content_type = "image/webp"
            
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Private-Network', 'true')
            self.end_headers()
            with open(filepath, 'rb') as f:
                self.wfile.write(f.read())
        else:
            self.send_error(404, "File not found")

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        try:
            data = json.loads(post_data.decode('utf-8')) if post_data else {}
        except:
            self.send_json_response(400, {'success': False, 'message': 'Invalid JSON.'})
            return

        if self.path == '/api/client/register':
            name, email, phone, password = data.get('name'), data.get('email'), data.get('phone'), data.get('password')
            if not all([name, email, phone, password]):
                self.send_json_response(400, {'success': False, 'message': 'Missing fields'})
                return
            conn = get_db()
            try:
                cursor = conn.cursor()
                cursor.execute("INSERT INTO clients (name, email, phone, password) VALUES (?, ?, ?, ?)", (name, email, phone, password))
                conn.commit()
                self.send_json_response(200, {'success': True, 'client_id': cursor.lastrowid})
            except Exception as e:
                self.send_json_response(400, {'success': False, 'message': str(e)})
            finally: conn.close()

        elif self.path == '/api/client/login':
            email, password = data.get('email'), data.get('password')
            conn = get_db()
            row = conn.execute("SELECT id, name, email, phone FROM clients WHERE email = ? AND password = ?", (email, password)).fetchone()
            conn.close()
            if row: 
                res = dict(row)
                res['client_id'] = res['id'] # Standardize for frontend
                self.send_json_response(200, {'success': True, **res})
            else: self.send_json_response(401, {'success': False, 'message': 'Invalid credentials'})

        elif self.path == '/api/provider/register':
            name, email, phone, password = data.get('name'), data.get('email'), data.get('phone'), data.get('password')
            service_type, pincode = data.get('service_type'), data.get('pincode')
            if not all([name, email, phone, password, service_type, pincode]):
                self.send_json_response(400, {'success': False, 'message': 'Missing fields'})
                return
            conn = get_db()
            try:
                cursor = conn.cursor()
                cursor.execute("INSERT INTO providers (name, email, phone, password, service_type, pincode) VALUES (?, ?, ?, ?, ?, ?)", (name, email, phone, password, service_type, pincode))
                conn.commit()
                self.send_json_response(200, {'success': True, 'provider_id': cursor.lastrowid})
            except Exception as e:
                self.send_json_response(400, {'success': False, 'message': str(e)})
            finally: conn.close()

        elif self.path == '/api/provider/login':
            email, password = data.get('email'), data.get('password')
            conn = get_db()
            row = conn.execute("SELECT id, name, email FROM providers WHERE email = ? AND password = ?", (email, password)).fetchone()
            conn.close()
            if row: 
                res = dict(row)
                res['provider_id'] = res['id'] # Standardize for frontend
                self.send_json_response(200, {'success': True, **res})
            else: self.send_json_response(401, {'success': False, 'message': 'Invalid credentials'})

        elif self.path == '/api/admin/login':
            password = data.get('password')
            if password == ADMIN_PASSWORD:
                self.send_json_response(200, {'success': True, 'token': 'admin_session_active'})
            else:
                self.send_json_response(401, {'success': False, 'message': 'Invalid admin password'})

        elif self.path == '/api/book':
            name, phone, service, provider_id, client_id = data.get('name'), data.get('phone'), data.get('service'), data.get('provider_id'), data.get('client_id')
            date, time = data.get('date'), data.get('time')
            conn = get_db()
            cursor = conn.cursor()
            
            # CRITICAL: Prevent booking unverified providers
            provider = cursor.execute("SELECT is_verified FROM providers WHERE id = ?", (provider_id,)).fetchone()
            if not provider or not provider['is_verified']:
                conn.close()
                self.send_json_response(403, {'success': False, 'message': 'This professional is currently under review and cannot accept new bookings.'})
                return

            cursor.execute("INSERT INTO bookings (client_name, client_phone, client_id, provider_id, service_type, date, time) VALUES (?, ?, ?, ?, ?, ?, ?)", (name, phone, client_id, provider_id, service, date, time))
            conn.commit()
            conn.close()
            
            # Send confirmation SMS
            send_booking_sms(phone, name, service, date, time)
            
            self.send_json_response(200, {'success': True, 'message': 'Booking confirmed'})

        elif self.path == '/api/booking/update_status':
            booking_id, status = data.get('booking_id'), data.get('status')
            conn = get_db()
            conn.execute("UPDATE bookings SET status = ? WHERE id = ?", (status, booking_id))
            conn.commit()
            conn.close()
            self.send_json_response(200, {'success': True})

        elif self.path == '/api/client/review':
            bid, cid, pid, rate, txt = data.get('booking_id'), data.get('client_id'), data.get('provider_id'), data.get('rating'), data.get('review_text', '')
            conn = get_db()
            try:
                conn.execute("INSERT INTO reviews (booking_id, client_id, provider_id, rating, review_text) VALUES (?, ?, ?, ?, ?)", (bid, cid, pid, rate, txt))
                conn.commit()
                self.send_json_response(200, {'success': True})
            except: self.send_json_response(400, {'success': False})
            finally: conn.close()

        elif self.path == '/api/forgot-password':
            email, role = data.get('email'), data.get('role')
            otp = str(random.randint(100000, 999999))
            expiry = int(time_module.time()) + 600
            conn = get_db()
            conn.execute("INSERT INTO otp_store (email, role, otp, expiry) VALUES (?, ?, ?, ?) ON CONFLICT(email, role) DO UPDATE SET otp=excluded.otp, expiry=excluded.expiry", (email, role, otp, expiry))
            conn.commit()
            conn.close()
            send_otp_email(email, otp)
            self.send_json_response(200, {'success': True})

        elif self.path == '/api/verify-otp':
            email, role, otp = data.get('email'), data.get('role'), data.get('otp')
            conn = get_db()
            row = conn.execute("SELECT otp FROM otp_store WHERE email = ? AND role = ? AND expiry > ?", (email, role, int(time_module.time()))).fetchone()
            conn.close()
            if row and str(row['otp']) == str(otp): self.send_json_response(200, {'success': True})
            else: self.send_json_response(400, {'success': False, 'message': 'Invalid or expired OTP'})

        elif self.path == '/api/reset-password':
            email, role, pwd = data.get('email'), data.get('role'), data.get('new_password')
            table = 'clients' if role == 'client' else 'providers'
            conn = get_db()
            conn.execute(f"UPDATE {table} SET password = ? WHERE email = ?", (pwd, email))
            conn.execute("DELETE FROM otp_store WHERE email = ? AND role = ?", (email, role))
            conn.commit()
            conn.close()
            self.send_json_response(200, {'success': True})

        elif self.path == '/api/client/update_profile':
            client_id = data.get('id')
            name, email, phone = data.get('name'), data.get('email'), data.get('phone')
            conn = get_db()
            conn.execute("UPDATE clients SET name = ?, email = ?, phone = ? WHERE id = ?", (name, email, phone, client_id))
            conn.commit()
            conn.close()
            self.send_json_response(200, {'success': True, 'message': 'Profile updated'})

        elif self.path == '/api/provider/update_profile':
            provider_id = data.get('id')
            name, email, phone = data.get('name'), data.get('email'), data.get('phone')
            service_type, pincode = data.get('service_type'), data.get('pincode')
            experience, rate = data.get('experience'), data.get('rate')
            conn = get_db()
            conn.execute("UPDATE providers SET name = ?, email = ?, phone = ?, service_type = ?, pincode = ?, experience = ?, rate = ? WHERE id = ?", 
                         (name, email, phone, service_type, pincode, experience, rate, provider_id))
            conn.commit()
            conn.close()
            self.send_json_response(200, {'success': True, 'message': 'Profile updated'})

        elif self.path == '/api/admin/verify_provider':
            pid, status = data.get('provider_id'), data.get('is_verified')
            conn = get_db()
            conn.execute("UPDATE providers SET is_verified = ? WHERE id = ?", (1 if status else 0, pid))
            conn.commit()
            conn.close()
            self.send_json_response(200, {'success': True})

        elif self.path == '/api/client/delete':
            cid = data.get('client_id')
            conn = get_db()
            # Also cleanup bookings for this client
            conn.execute("DELETE FROM bookings WHERE client_id = ?", (cid,))
            conn.execute("DELETE FROM clients WHERE id = ?", (cid,))
            conn.commit()
            conn.close()
            self.send_json_response(200, {'success': True, 'message': 'Client and associated bookings deleted'})

        elif self.path == '/api/provider/delete':
            pid = data.get('provider_id')
            conn = get_db()
            # Cleanup bookings and reviews for this provider
            conn.execute("DELETE FROM bookings WHERE provider_id = ?", (pid,))
            conn.execute("DELETE FROM reviews WHERE provider_id = ?", (pid,))
            conn.execute("DELETE FROM providers WHERE id = ?", (pid,))
            conn.commit()
            conn.close()
            self.send_json_response(200, {'success': True, 'message': 'Provider and all associated data deleted'})

        else:
            self.send_response(404)
            self.end_headers()

    def send_json_response(self, status_code, payload):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Access-Control-Allow-Private-Network', 'true')
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode('utf-8'))

if __name__ == '__main__':
    if not os.path.exists(DB_PATH):
        import database
        database.init_db()
    else:
        try:
            conn = get_db()
            conn.execute("ALTER TABLE bookings ADD COLUMN client_id INTEGER REFERENCES clients(id)")
            conn.commit()
            conn.close()
        except: pass
             
    class ThreadingHTTPServer(socketserver.ThreadingMixIn, HTTPServer):
        daemon_threads = True

    server = ThreadingHTTPServer(('0.0.0.0', PORT), SwiftFixServer)
    print(f"SwiftFix Unified Server running at http://127.0.0.1:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    server.server_close()
