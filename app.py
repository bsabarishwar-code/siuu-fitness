"""Siuu Fitness — Flask API + static file server for Flutter web."""
import os
import hmac
import hashlib
import base64
import json
import time
import socket
import urllib.request
from datetime import datetime, timezone, timedelta
from functools import wraps
from zoneinfo import ZoneInfo

from flask import Flask, request, jsonify, send_from_directory, abort, make_response

# ── Force IPv4 (Render has no IPv6 route to Brevo) ───────────────────────
_orig_getaddrinfo = socket.getaddrinfo
def _ipv4_only(host, port, family=0, type=0, proto=0, flags=0):
    return _orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
socket.getaddrinfo = _ipv4_only

# ── Config ────────────────────────────────────────────────────────────────
SECRET_KEY        = os.environ.get("SECRET_KEY", "dev-secret-change-me")
APP_PASSWORD      = os.environ.get("APP_PASSWORD", "")
CRON_SECRET       = os.environ.get("CRON_SECRET", "cron-secret")
DATABASE_URL      = os.environ.get("DATABASE_URL", "")
APP_TZ            = ZoneInfo(os.environ.get("APP_TZ", "Asia/Kolkata"))
BREVO_API_KEY     = os.environ.get("BREVO_API_KEY", "")
SMTP_USER         = os.environ.get("SMTP_USER", "b.sabarishwar@gmail.com")
SMTP_PASS         = os.environ.get("SMTP_PASS", "")
VAPID_PUBLIC_KEY  = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
SMTP_HOST     = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT     = int(os.environ.get("SMTP_PORT", "587"))
EMAIL_ENABLED = os.environ.get("EMAIL_ENABLED", "1") == "1"
WATER_GOAL_ML = int(os.environ.get("WATER_GOAL_ML", "3000"))
REMINDER_START_HOUR = int(os.environ.get("REMINDER_START_HOUR", "7"))
REMINDER_END_HOUR   = int(os.environ.get("REMINDER_END_HOUR", "22"))
REPORT_HOUR         = int(os.environ.get("REPORT_HOUR", "21"))

# ── App setup ─────────────────────────────────────────────────────────────
STATIC = os.path.join(os.path.dirname(__file__), "static")
app = Flask(__name__, static_folder=STATIC, static_url_path="")

# ── Database helpers ──────────────────────────────────────────────────────
def get_db():
    if DATABASE_URL:
        import psycopg
        return psycopg.connect(DATABASE_URL)
    import sqlite3
    path = os.path.join(os.path.dirname(__file__), "siuu_fitness.db")
    conn = sqlite3.connect(path, detect_types=sqlite3.PARSE_DECLTYPES)
    conn.row_factory = sqlite3.Row
    return conn

def _pg():
    return bool(DATABASE_URL)

def init_db():
    with get_db() as conn:
        cur = conn.cursor()
        ai     = "SERIAL"      if _pg() else "INTEGER"
        ts     = "TIMESTAMPTZ" if _pg() else "DATETIME"
        now_fn = "NOW()"       if _pg() else "datetime('now')"

        cur.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        """)
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS nutrient_logs (
                id          {ai} PRIMARY KEY,
                nutrient_id TEXT NOT NULL,
                amount      REAL NOT NULL,
                logged_at   {ts} NOT NULL DEFAULT {now_fn}
            )
        """)
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS water_logs (
                id          {ai} PRIMARY KEY,
                amount_ml   INTEGER NOT NULL,
                logged_at   {ts} NOT NULL DEFAULT {now_fn}
            )
        """)
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id         {ai} PRIMARY KEY,
                endpoint   TEXT NOT NULL UNIQUE,
                p256dh     TEXT NOT NULL,
                auth_key   TEXT NOT NULL,
                created_at {ts} NOT NULL DEFAULT {now_fn}
            )
        """)
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS macro_logs (
                id        {ai} PRIMARY KEY,
                protein_g REAL NOT NULL DEFAULT 0,
                carbs_g   REAL NOT NULL DEFAULT 0,
                fat_g     REAL NOT NULL DEFAULT 0,
                calories  REAL NOT NULL DEFAULT 0,
                label     TEXT,
                logged_at {ts} NOT NULL DEFAULT {now_fn}
            )
        """)
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS progress_logs (
                id        {ai} PRIMARY KEY,
                weight_kg REAL,
                waist_cm  REAL,
                chest_cm  REAL,
                arm_cm    REAL,
                leg_cm    REAL,
                notes     TEXT,
                logged_at {ts} NOT NULL DEFAULT {now_fn}
            )
        """)
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS workout_logs (
                id           {ai} PRIMARY KEY,
                plan_id      TEXT NOT NULL,
                plan_name    TEXT NOT NULL,
                duration_min INTEGER NOT NULL DEFAULT 0,
                notes        TEXT,
                logged_at    {ts} NOT NULL DEFAULT {now_fn}
            )
        """)
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS food_logs (
                id          {ai} PRIMARY KEY,
                meal_name   TEXT NOT NULL,
                food_name   TEXT NOT NULL,
                calories    REAL NOT NULL DEFAULT 0,
                protein_g   REAL NOT NULL DEFAULT 0,
                carbs_g     REAL NOT NULL DEFAULT 0,
                fat_g       REAL NOT NULL DEFAULT 0,
                logged_at   {ts} NOT NULL DEFAULT {now_fn}
            )
        """)
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS custom_diet_plans (
                id          {ai} PRIMARY KEY,
                name        TEXT NOT NULL,
                goal        TEXT NOT NULL DEFAULT '',
                description TEXT NOT NULL DEFAULT '',
                calories    INTEGER NOT NULL DEFAULT 0,
                protein_g   INTEGER NOT NULL DEFAULT 0,
                carbs_g     INTEGER NOT NULL DEFAULT 0,
                fat_g       INTEGER NOT NULL DEFAULT 0,
                created_at  {ts} NOT NULL DEFAULT {now_fn}
            )
        """)
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS custom_diet_meals (
                id          {ai} PRIMARY KEY,
                plan_id     INTEGER NOT NULL,
                meal_name   TEXT NOT NULL,
                foods       TEXT NOT NULL DEFAULT '',
                calories    INTEGER NOT NULL DEFAULT 0,
                protein_g   INTEGER NOT NULL DEFAULT 0,
                carbs_g     INTEGER NOT NULL DEFAULT 0,
                fat_g       INTEGER NOT NULL DEFAULT 0,
                sort_order  INTEGER NOT NULL DEFAULT 0
            )
        """)
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS custom_workout_plans (
                id             {ai} PRIMARY KEY,
                name           TEXT NOT NULL,
                category       TEXT NOT NULL DEFAULT '',
                description    TEXT NOT NULL DEFAULT '',
                days_per_week  INTEGER NOT NULL DEFAULT 3,
                duration_weeks INTEGER NOT NULL DEFAULT 4,
                created_at     {ts} NOT NULL DEFAULT {now_fn}
            )
        """)
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS custom_workout_exercises (
                id               {ai} PRIMARY KEY,
                plan_id          INTEGER NOT NULL,
                day_name         TEXT NOT NULL DEFAULT '',
                exercise_name    TEXT NOT NULL,
                sets             INTEGER NOT NULL DEFAULT 3,
                reps_or_duration TEXT NOT NULL DEFAULT '10',
                rest_seconds     INTEGER NOT NULL DEFAULT 60,
                notes            TEXT NOT NULL DEFAULT '',
                sort_order       INTEGER NOT NULL DEFAULT 0
            )
        """)
        # Performance indexes on logged_at (speeds up every date-range query)
        for tbl in ['water_logs', 'macro_logs', 'food_logs', 'nutrient_logs',
                    'workout_logs', 'progress_logs']:
            cur.execute(f"CREATE INDEX IF NOT EXISTS idx_{tbl}_at ON {tbl}(logged_at)")
        conn.commit()

with app.app_context():
    try:
        init_db()
    except Exception as e:
        print(f"DB init: {e}")

# ── Settings helpers ──────────────────────────────────────────────────────
def get_setting(key: str, default: str = "") -> str:
    try:
        with get_db() as conn:
            cur = conn.cursor()
            ph = "%s" if _pg() else "?"
            cur.execute(f"SELECT value FROM settings WHERE key = {ph}", (key,))
            row = cur.fetchone()
            return row[0] if row else default
    except Exception:
        return default

def set_setting(key: str, value: str):
    with get_db() as conn:
        cur = conn.cursor()
        ph = "%s" if _pg() else "?"
        if _pg():
            cur.execute(
                "INSERT INTO settings (key,value) VALUES (%s,%s) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value",
                (key, value))
        else:
            cur.execute("INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)", (key, value))
        conn.commit()

def is_setup_done() -> bool:
    return bool(get_setting("password_hash"))

# ── Password hashing ──────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    salt = os.urandom(16)
    key  = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)
    return salt.hex() + ":" + key.hex()

def check_password(password: str, stored: str) -> bool:
    try:
        salt_hex, key_hex = stored.split(":")
        salt = bytes.fromhex(salt_hex)
        key  = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)
        return hmac.compare_digest(key.hex(), key_hex)
    except Exception:
        return False

# ── Token helpers ─────────────────────────────────────────────────────────
def make_token() -> str:
    payload = json.dumps({"ts": int(time.time()), "app": "siuu"})
    sig = hmac.new(SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return base64.urlsafe_b64encode(f"{payload}|{sig}".encode()).decode()

def verify_token(token: str, max_age: int = 86400 * 90) -> bool:
    try:
        decoded = base64.urlsafe_b64decode(token.encode()).decode()
        payload_str, sig = decoded.rsplit("|", 1)
        expected = hmac.new(SECRET_KEY.encode(), payload_str.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return False
        payload = json.loads(payload_str)
        return (int(time.time()) - payload["ts"]) < max_age
    except Exception:
        return False

def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "Unauthorised"}), 401
        if not verify_token(auth[7:]):
            return jsonify({"error": "Invalid or expired token"}), 401
        return f(*args, **kwargs)
    return wrapper

def _today_range():
    now_local  = datetime.now(APP_TZ)
    start_loc  = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
    end_loc    = start_loc + timedelta(days=1)
    return start_loc.astimezone(timezone.utc), end_loc.astimezone(timezone.utc)

# ── Setup routes ──────────────────────────────────────────────────────────
@app.route("/admin/reset")
def admin_reset():
    """Wipe all user data so a new user can do fresh first-time setup.
    Protected by CRON_SECRET so only the app owner can trigger it."""
    if request.args.get("key") != CRON_SECRET:
        return jsonify({"error": "forbidden"}), 403
    tables = [
        "settings", "push_subscriptions",
        "nutrient_logs", "water_logs", "macro_logs", "food_logs",
        "progress_logs", "workout_logs",
        "custom_diet_meals", "custom_diet_plans",
        "custom_workout_exercises", "custom_workout_plans",
    ]
    with get_db() as conn:
        cur = conn.cursor()
        for t in tables:
            cur.execute(f"DELETE FROM {t}")
        conn.commit()
    return jsonify({"ok": True, "reset": True, "message": "All data cleared. App is ready for fresh setup."})

@app.route("/api/setup/status")
def setup_status():
    return jsonify({"done": is_setup_done()})

@app.route("/api/setup", methods=["POST"])
def setup():
    if is_setup_done():
        return jsonify({"error": "Already set up"}), 400
    data     = request.get_json(silent=True) or {}
    name     = (data.get("name") or "").strip()
    email    = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not name or not email or not password:
        return jsonify({"error": "Name, email and password are required"}), 400
    if len(password) < 4:
        return jsonify({"error": "Password must be at least 4 characters"}), 400
    if "@" not in email:
        return jsonify({"error": "Enter a valid email address"}), 400

    set_setting("user_name",     name)
    set_setting("user_email",    email)
    set_setting("password_hash", hash_password(password))
    return jsonify({"token": make_token(), "name": name})

# ── Auth routes ───────────────────────────────────────────────────────────
@app.route("/api/auth/login", methods=["POST"])
def login():
    data     = request.get_json(silent=True) or {}
    password = (data.get("password") or "").strip()

    # Check against stored user password first
    stored = get_setting("password_hash")
    if stored and check_password(password, stored):
        return jsonify({"token": make_token()})
    # Admin override via APP_PASSWORD env var
    if APP_PASSWORD and password == APP_PASSWORD:
        return jsonify({"token": make_token()})
    return jsonify({"error": "Wrong access code"}), 401

@app.route("/api/auth/verify")
@require_auth
def verify():
    return jsonify({"ok": True})

# ── User profile ──────────────────────────────────────────────────────────
@app.route("/api/user/profile")
@require_auth
def user_profile():
    return jsonify({
        "name":          get_setting("user_name",      "Athlete"),
        "email":         get_setting("user_email",     ""),
        "water_message": get_setting("water_message",  ""),
        "height_cm":     get_setting("height_cm",      ""),
    })

# ── App config (public — used by Flutter before login) ───────────────────
@app.route("/api/config")
def app_config():
    return jsonify({"vapid_public_key": VAPID_PUBLIC_KEY})

# ── Push subscription ─────────────────────────────────────────────────────
@app.route("/api/push/subscribe", methods=["POST"])
def push_subscribe():
    data     = request.get_json(silent=True) or {}
    endpoint = (data.get("endpoint") or "").strip()
    keys     = data.get("keys") or {}
    p256dh   = (keys.get("p256dh") or "").strip()
    auth_key = (keys.get("auth") or "").strip()
    if not endpoint or not p256dh or not auth_key:
        return jsonify({"error": "endpoint, keys.p256dh and keys.auth required"}), 400
    ph = "%s" if _pg() else "?"
    with get_db() as conn:
        cur = conn.cursor()
        if _pg():
            cur.execute("""
                INSERT INTO push_subscriptions (endpoint, p256dh, auth_key)
                VALUES (%s, %s, %s)
                ON CONFLICT (endpoint) DO UPDATE SET p256dh=EXCLUDED.p256dh, auth_key=EXCLUDED.auth_key
            """, (endpoint, p256dh, auth_key))
        else:
            cur.execute("""
                INSERT OR REPLACE INTO push_subscriptions (endpoint, p256dh, auth_key)
                VALUES (?, ?, ?)
            """, (endpoint, p256dh, auth_key))
        conn.commit()
    return jsonify({"ok": True})

@app.route("/api/push/unsubscribe", methods=["POST"])
@require_auth
def push_unsubscribe():
    data     = request.get_json(silent=True) or {}
    endpoint = (data.get("endpoint") or "").strip()
    ph = "%s" if _pg() else "?"
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(f"DELETE FROM push_subscriptions WHERE endpoint = {ph}", (endpoint,))
        conn.commit()
    return jsonify({"ok": True})

# ── Nutrient routes ───────────────────────────────────────────────────────
@app.route("/api/nutrients/today")
@require_auth
def nutrients_today():
    start, end = _today_range()
    ph = "%s" if _pg() else "?"
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            f"SELECT nutrient_id, COALESCE(SUM(amount),0) FROM nutrient_logs "
            f"WHERE logged_at >= {ph} AND logged_at < {ph} GROUP BY nutrient_id",
            (start if _pg() else start.isoformat(), end if _pg() else end.isoformat()),
        )
        rows = cur.fetchall()
    return jsonify({
        "nutrients": [{"nutrient_id": r[0], "total_amount": r[1]} for r in rows],
        "date": datetime.now(APP_TZ).strftime("%Y-%m-%d"),
    })

@app.route("/api/nutrients/log", methods=["POST"])
@require_auth
def log_nutrient():
    data        = request.get_json(silent=True) or {}
    nutrient_id = (data.get("nutrient_id") or "").strip()
    amount      = data.get("amount")
    if not nutrient_id or amount is None:
        return jsonify({"error": "nutrient_id and amount required"}), 400
    try:
        amount = float(amount)
    except (TypeError, ValueError):
        return jsonify({"error": "amount must be numeric"}), 400
    if amount <= 0:
        return jsonify({"error": "amount must be positive"}), 400
    now_utc = datetime.now(timezone.utc)
    ph = "%s" if _pg() else "?"
    with get_db() as conn:
        cur = conn.cursor()
        if _pg():
            cur.execute(
                "INSERT INTO nutrient_logs (nutrient_id,amount,logged_at) VALUES (%s,%s,%s) RETURNING id",
                (nutrient_id, amount, now_utc))
            row_id = cur.fetchone()[0]
        else:
            cur.execute(
                "INSERT INTO nutrient_logs (nutrient_id,amount,logged_at) VALUES (?,?,?)",
                (nutrient_id, amount, now_utc.isoformat()))
            row_id = cur.lastrowid
        conn.commit()
    return jsonify({"id": row_id, "nutrient_id": nutrient_id, "amount": amount})

@app.route("/api/nutrients/log/<int:log_id>", methods=["DELETE"])
@require_auth
def delete_nutrient_log(log_id):
    ph = "%s" if _pg() else "?"
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(f"DELETE FROM nutrient_logs WHERE id = {ph}", (log_id,))
        conn.commit()
    return jsonify({"ok": True})

@app.route("/api/nutrients/logs/<nutrient_id>")
@require_auth
def get_nutrient_logs(nutrient_id):
    start, end = _today_range()
    ph = "%s" if _pg() else "?"
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            f"SELECT id,nutrient_id,amount,logged_at FROM nutrient_logs "
            f"WHERE nutrient_id={ph} AND logged_at>={ph} AND logged_at<{ph} ORDER BY logged_at DESC",
            (nutrient_id, start if _pg() else start.isoformat(), end if _pg() else end.isoformat()),
        )
        rows = cur.fetchall()
    return jsonify({"logs": [{"id": r[0], "nutrient_id": r[1], "amount": r[2], "logged_at": str(r[3])} for r in rows]})

# ── Water routes ──────────────────────────────────────────────────────────
@app.route("/api/water/today")
@require_auth
def water_today():
    start, end = _today_range()
    ph = "%s" if _pg() else "?"
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            f"SELECT COALESCE(SUM(amount_ml),0) FROM water_logs WHERE logged_at>={ph} AND logged_at<{ph}",
            (start if _pg() else start.isoformat(), end if _pg() else end.isoformat()),
        )
        total = int(cur.fetchone()[0] or 0)
    return jsonify({"total_ml": total, "goal_ml": WATER_GOAL_ML})

@app.route("/api/water/log", methods=["POST"])
@require_auth
def log_water():
    data      = request.get_json(silent=True) or {}
    amount_ml = data.get("amount_ml")
    try:
        amount_ml = int(amount_ml)
    except (TypeError, ValueError):
        return jsonify({"error": "amount_ml must be integer"}), 400
    if amount_ml <= 0:
        return jsonify({"error": "amount_ml must be positive"}), 400
    now_utc = datetime.now(timezone.utc)
    with get_db() as conn:
        cur = conn.cursor()
        if _pg():
            cur.execute(
                "INSERT INTO water_logs (amount_ml,logged_at) VALUES (%s,%s) RETURNING id",
                (amount_ml, now_utc))
            row_id = cur.fetchone()[0]
        else:
            cur.execute("INSERT INTO water_logs (amount_ml,logged_at) VALUES (?,?)",
                        (amount_ml, now_utc.isoformat()))
            row_id = cur.lastrowid
        conn.commit()
    return jsonify({"id": row_id, "amount_ml": amount_ml})

@app.route("/api/water/log/last", methods=["DELETE"])
@require_auth
def delete_last_water():
    start, end = _today_range()
    ph = "%s" if _pg() else "?"
    with get_db() as conn:
        cur = conn.cursor()
        # Find most recent entry today
        cur.execute(
            f"SELECT id, amount_ml FROM water_logs "
            f"WHERE logged_at>={ph} AND logged_at<{ph} ORDER BY logged_at DESC LIMIT 1",
            (start if _pg() else start.isoformat(), end if _pg() else end.isoformat()))
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "No water log to undo"}), 404
        entry_id, amount_ml = row[0], int(row[1])
        cur.execute(f"DELETE FROM water_logs WHERE id = {ph}", (entry_id,))
        conn.commit()
    return jsonify({"ok": True, "removed_ml": amount_ml})

@app.route("/api/score/today")
@require_auth
def score_today():
    start, end = _today_range()
    ph = "%s" if _pg() else "?"
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            f"SELECT nutrient_id, COALESCE(SUM(amount),0) FROM nutrient_logs "
            f"WHERE logged_at>={ph} AND logged_at<{ph} GROUP BY nutrient_id",
            (start if _pg() else start.isoformat(), end if _pg() else end.isoformat()),
        )
        return jsonify({"nutrients": dict(cur.fetchall())})

# ── Push notification helpers ─────────────────────────────────────────────
def _get_all_subscriptions():
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT endpoint, p256dh, auth_key FROM push_subscriptions")
        return [{"endpoint": r[0], "keys": {"p256dh": r[1], "auth": r[2]}} for r in cur.fetchall()]

def _send_push_all(title: str, body: str, icon: str = "/icons/Icon-192.png"):
    if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
        return 0
    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        return 0
    subs = _get_all_subscriptions()
    dead = []
    sent = 0
    for sub in subs:
        try:
            webpush(
                subscription_info=sub,
                data=json.dumps({"title": title, "body": body, "icon": icon}),
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": f"mailto:{SMTP_USER}"},
            )
            sent += 1
        except Exception as ex:
            code = getattr(getattr(ex, "response", None), "status_code", 0)
            if code in (404, 410):
                dead.append(sub["endpoint"])
            print(f"Push error: {ex}")
    # Remove dead subscriptions
    if dead:
        ph = "%s" if _pg() else "?"
        with get_db() as conn:
            cur = conn.cursor()
            for ep in dead:
                cur.execute(f"DELETE FROM push_subscriptions WHERE endpoint = {ph}", (ep,))
            conn.commit()
    return sent

# ── Email helpers ─────────────────────────────────────────────────────────
def _send_brevo(to_list, subject, html_body):
    payload = json.dumps({
        "sender":      {"name": "SIUU FITNESS", "email": SMTP_USER},
        "to":          [{"email": e} for e in to_list],
        "subject":     subject,
        "htmlContent": html_body,
    }).encode()
    req = urllib.request.Request(
        "https://api.brevo.com/v3/smtp/email",
        data=payload, method="POST",
        headers={"Content-Type": "application/json",
                 "Accept": "application/json",
                 "api-key": BREVO_API_KEY},
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())

def _send_smtp(to_list, subject, html_body):
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = SMTP_USER
    msg["To"]      = ", ".join(to_list)
    msg.attach(MIMEText(html_body, "html"))
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
        s.starttls()
        s.login(SMTP_USER, SMTP_PASS)
        s.sendmail(SMTP_USER, to_list, msg.as_string())

def _send_email(to_list, subject, html_body):
    if not EMAIL_ENABLED or not to_list:
        return
    if BREVO_API_KEY:
        _send_brevo(to_list, subject, html_body)
    elif SMTP_PASS:
        _send_smtp(to_list, subject, html_body)

def _user_recipients():
    """Return list with the user's stored email (set during setup)."""
    email = get_setting("user_email", "")
    return [email] if email else []

def _user_name():
    return get_setting("user_name", "Athlete")

# ── Cron routes ───────────────────────────────────────────────────────────
@app.route("/tasks/water-reminder")
def water_reminder():
    if not hmac.compare_digest(request.args.get("key",""), CRON_SECRET):
        abort(403)
    now_local = datetime.now(APP_TZ)
    hour = now_local.hour
    if not (REMINDER_START_HOUR <= hour < REMINDER_END_HOUR):
        return jsonify({"status": "outside_hours", "hour": hour})

    name = _user_name()
    time_str = now_local.strftime("%I:%M %p")

    # ── Web push (primary: reaches the phone directly) ────────────────────
    custom_msg = get_setting("water_message", "")
    push_body  = custom_msg if custom_msg else f"It's {time_str} — drink 250ml right now. Goal: {WATER_GOAL_ML}ml/day"
    push_sent = _send_push_all(
        title=f"💧 Water Break, {name}!",
        body=push_body,
        icon="/icons/Icon-192.png",
    )

    # ── Email (backup / daily report style) ──────────────────────────────
    email_sent = 0
    to = _user_recipients()
    if to:
        subject = f"💧 SIUU FITNESS — Hydration Reminder, {name}!"
        html = f"""
        <div style="background:#0A0A0A;color:#E8E8E8;font-family:sans-serif;padding:32px;max-width:480px;margin:auto">
          <h1 style="color:#CC0000;letter-spacing:4px;font-size:28px;margin:0">SIUU FITNESS</h1>
          <hr style="border:1px solid #CC0000;margin:16px 0">
          <h2 style="color:#E8E8E8;letter-spacing:2px">WATER BREAK, {name.upper()}!</h2>
          <p style="font-size:18px;color:#888">It's {time_str} — time to hydrate!</p>
          <p style="background:#1C1C1C;padding:16px;border-left:3px solid #CC0000">
            Daily goal: <strong style="color:#CC0000">{WATER_GOAL_ML}ml</strong><br>
            Drink at least <strong>250ml</strong> right now.
          </p>
          <p style="color:#CC0000;font-weight:bold;letter-spacing:2px;margin-top:24px">TRACK. DOMINATE. REPEAT.</p>
        </div>"""
        try:
            _send_email(to, subject, html)
            email_sent = len(to)
        except Exception as e:
            print(f"Water reminder email error: {e}")

    return jsonify({"status": "sent", "push_sent": push_sent, "email_sent": email_sent, "hour": hour})

@app.route("/tasks/daily-report")
def daily_report():
    if not hmac.compare_digest(request.args.get("key",""), CRON_SECRET):
        abort(403)
    now_local = datetime.now(APP_TZ)
    if now_local.hour != REPORT_HOUR:
        return jsonify({"status": "wrong_hour", "hour": now_local.hour})
    start, end = _today_range()
    ph = "%s" if _pg() else "?"
    sv = start if _pg() else start.isoformat()
    ev = end   if _pg() else end.isoformat()
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(f"SELECT nutrient_id, COALESCE(SUM(amount),0) FROM nutrient_logs WHERE logged_at>={ph} AND logged_at<{ph} GROUP BY nutrient_id", (sv,ev))
        nutrient_data = dict(cur.fetchall())
        cur.execute(f"SELECT COALESCE(SUM(amount_ml),0) FROM water_logs WHERE logged_at>={ph} AND logged_at<{ph}", (sv,ev))
        total_water = int(cur.fetchone()[0] or 0)
        cur.execute(f"SELECT COALESCE(SUM(calories),0),COALESCE(SUM(protein_g),0),COALESCE(SUM(carbs_g),0),COALESCE(SUM(fat_g),0) FROM macro_logs WHERE logged_at>={ph} AND logged_at<{ph}", (sv,ev))
        mr = cur.fetchone()
        cur.execute(f"SELECT COALESCE(SUM(calories),0),COALESCE(SUM(protein_g),0),COALESCE(SUM(carbs_g),0),COALESCE(SUM(fat_g),0) FROM food_logs WHERE logged_at>={ph} AND logged_at<{ph}", (sv,ev))
        fr = cur.fetchone()
        cur.execute(f"SELECT COUNT(*) FROM workout_logs WHERE logged_at>={ph} AND logged_at<{ph}", (sv,ev))
        workout_count = int(cur.fetchone()[0] or 0)
        cur.execute(f"SELECT weight_kg FROM progress_logs WHERE logged_at>={ph} AND logged_at<{ph} ORDER BY logged_at DESC LIMIT 1", (sv,ev))
        wrow = cur.fetchone(); weight_kg = float(wrow[0]) if wrow and wrow[0] else None
    to = _user_recipients()
    if not to:
        return jsonify({"status": "no_recipients"})
    name = _user_name()
    date_str = now_local.strftime("%A, %B %d %Y").upper()
    total_cal = float(mr[0] or 0) + float(fr[0] or 0)
    protein   = float(mr[1] or 0) + float(fr[1] or 0)
    carbs     = float(mr[2] or 0) + float(fr[2] or 0)
    fat       = float(mr[3] or 0) + float(fr[3] or 0)
    water_pct  = min(100, int(total_water / WATER_GOAL_ML * 100))
    micro_met  = len(nutrient_data)
    micro_pct  = min(100, int(micro_met / 28 * 100))
    cal_goal   = int(get_setting("cal_goal", "2500"))
    cal_pct    = min(100, int(total_cal / cal_goal * 100)) if cal_goal else 0

    def bar(pct, color):
        filled = max(0, min(100, pct))
        return f'<div style="background:#1C1C1C;height:10px;border-radius:5px;overflow:hidden"><div style="background:{color};height:10px;width:{filled}%;border-radius:5px"></div></div>'

    def kpi(title, value, sub, color, pct):
        return f'''
        <td style="padding:8px;width:25%">
          <div style="background:#1C1C1C;padding:16px;border-top:3px solid {color};border-radius:4px">
            <div style="color:#666;font-size:10px;letter-spacing:2px;margin-bottom:4px">{title}</div>
            <div style="color:#E8E8E8;font-size:28px;font-weight:900;line-height:1">{value}</div>
            <div style="color:#666;font-size:11px;margin:4px 0 8px">{sub}</div>
            {bar(pct, color)}
          </div>
        </td>'''

    subject = f"SIUU FITNESS — {name}'s Report · {now_local.strftime('%d %b %Y')}"
    body = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">
  <!-- Header -->
  <div style="border-bottom:2px solid #CC0000;padding-bottom:16px;margin-bottom:20px">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="color:#CC0000;font-size:24px;font-weight:900;letter-spacing:4px">SIUU FITNESS</div>
        <div style="color:#555;font-size:11px;letter-spacing:2px">DAILY PERFORMANCE REPORT</div>
      </div>
      <div style="text-align:right">
        <div style="color:#888;font-size:12px">{date_str}</div>
        <div style="color:#E8E8E8;font-size:16px;font-weight:700">{name.upper()}</div>
      </div>
    </div>
  </div>

  <!-- KPI Cards -->
  <div style="font-size:11px;color:#666;letter-spacing:2px;margin-bottom:8px">TODAY'S PERFORMANCE</div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
    <tr>
      {kpi('WATER', f'{total_water}ml', f'Goal: {WATER_GOAL_ML}ml', '#1E88E5', water_pct)}
      {kpi('CALORIES', f'{int(total_cal)} kcal', f'Goal: {cal_goal} kcal', '#CC0000', cal_pct)}
      {kpi('MICROS', f'{micro_met}/28', 'nutrients met', '#2ECC71', micro_pct)}
      {kpi('WORKOUTS', str(workout_count), 'sessions today', '#FF9800', 100 if workout_count > 0 else 0)}
    </tr>
  </table>

  <!-- Macros -->
  <div style="background:#111;padding:16px;margin-bottom:16px;border-radius:4px">
    <div style="color:#888;font-size:11px;letter-spacing:2px;margin-bottom:12px">MACRONUTRIENTS</div>
    <table style="width:100%">
      <tr>
        <td style="padding:6px 0">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="color:#E53935;font-size:12px;font-weight:700">PROTEIN</span>
            <span style="color:#888;font-size:11px">{int(protein)}g</span>
          </div>
          {bar(min(100,int(protein/150*100)), '#E53935')}
        </td>
      </tr>
      <tr>
        <td style="padding:6px 0">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="color:#FF9800;font-size:12px;font-weight:700">CARBOHYDRATES</span>
            <span style="color:#888;font-size:11px">{int(carbs)}g</span>
          </div>
          {bar(min(100,int(carbs/250*100)), '#FF9800')}
        </td>
      </tr>
      <tr>
        <td style="padding:6px 0">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="color:#9C27B0;font-size:12px;font-weight:700">FAT</span>
            <span style="color:#888;font-size:11px">{int(fat)}g</span>
          </div>
          {bar(min(100,int(fat/70*100)), '#9C27B0')}
        </td>
      </tr>
    </table>
  </div>

  <!-- Weight -->
  {'<div style="background:#111;padding:16px;margin-bottom:16px;border-radius:4px"><div style="color:#888;font-size:11px;letter-spacing:2px;margin-bottom:8px">BODY WEIGHT</div><div style="color:#E8E8E8;font-size:36px;font-weight:900">'+str(weight_kg)+' kg</div></div>' if weight_kg else ''}

  <!-- Footer -->
  <div style="border-top:1px solid #1C1C1C;padding-top:16px;text-align:center">
    <div style="color:#CC0000;font-weight:700;letter-spacing:2px;font-size:13px">TRACK. DOMINATE. REPEAT.</div>
    <div style="color:#333;font-size:10px;margin-top:8px">SIUU FITNESS · Powered by dedication</div>
  </div>
</div>
</body></html>"""
    try:
        _send_email(to, subject, body)
        return jsonify({"status": "sent", "to": to})
    except Exception as ex:
        return jsonify({"status": "error", "error": str(ex)}), 500

# ── Macros routes ─────────────────────────────────────────────────────────────
@app.route("/api/macros/today")
@require_auth
def macros_today():
    start, end = _today_range()
    ph = "%s" if _pg() else "?"
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            f"SELECT id,protein_g,carbs_g,fat_g,calories,label,logged_at FROM macro_logs "
            f"WHERE logged_at>={ph} AND logged_at<{ph} ORDER BY logged_at DESC",
            (start if _pg() else start.isoformat(), end if _pg() else end.isoformat()))
        rows = cur.fetchall()
    return jsonify({
        "entries": [{"id": r[0], "protein_g": r[1], "carbs_g": r[2],
                     "fat_g": r[3], "calories": r[4], "label": r[5],
                     "logged_at": str(r[6])} for r in rows]
    })

@app.route("/api/macros/log", methods=["POST"])
@require_auth
def log_macro():
    data      = request.get_json(silent=True) or {}
    protein_g = float(data.get("protein_g") or 0)
    carbs_g   = float(data.get("carbs_g")   or 0)
    fat_g     = float(data.get("fat_g")     or 0)
    label     = (data.get("label") or "").strip() or None
    calories  = protein_g * 4 + carbs_g * 4 + fat_g * 9
    now_utc   = datetime.now(timezone.utc)
    ph = "%s" if _pg() else "?"
    with get_db() as conn:
        cur = conn.cursor()
        if _pg():
            cur.execute(
                "INSERT INTO macro_logs (protein_g,carbs_g,fat_g,calories,label,logged_at) "
                "VALUES (%s,%s,%s,%s,%s,%s) RETURNING id",
                (protein_g, carbs_g, fat_g, calories, label, now_utc))
            row_id = cur.fetchone()[0]
        else:
            cur.execute(
                "INSERT INTO macro_logs (protein_g,carbs_g,fat_g,calories,label,logged_at) "
                "VALUES (?,?,?,?,?,?)",
                (protein_g, carbs_g, fat_g, calories, label, now_utc.isoformat()))
            row_id = cur.lastrowid
        conn.commit()
    return jsonify({"id": row_id, "calories": calories})

# ── Settings (diet plan, etc.) ─────────────────────────────────────────────────
@app.route("/api/settings/diet-plan", methods=["POST"])
@require_auth
def save_diet_plan():
    data    = request.get_json(silent=True) or {}
    plan_id = (data.get("plan_id") or "").strip()
    set_setting("diet_plan_id", plan_id)
    return jsonify({"ok": True})

# ── Progress routes ────────────────────────────────────────────────────────────
@app.route("/api/progress/log", methods=["POST"])
@require_auth
def log_progress():
    data      = request.get_json(silent=True) or {}
    weight_kg = data.get("weight_kg")
    waist_cm  = data.get("waist_cm")
    chest_cm  = data.get("chest_cm")
    arm_cm    = data.get("arm_cm")
    leg_cm    = data.get("leg_cm")
    notes     = (data.get("notes") or "").strip() or None
    now_utc   = datetime.now(timezone.utc)
    with get_db() as conn:
        cur = conn.cursor()
        if _pg():
            cur.execute(
                "INSERT INTO progress_logs (weight_kg,waist_cm,chest_cm,arm_cm,leg_cm,notes,logged_at) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                (weight_kg, waist_cm, chest_cm, arm_cm, leg_cm, notes, now_utc))
            row_id = cur.fetchone()[0]
        else:
            cur.execute(
                "INSERT INTO progress_logs (weight_kg,waist_cm,chest_cm,arm_cm,leg_cm,notes,logged_at) "
                "VALUES (?,?,?,?,?,?,?)",
                (weight_kg, waist_cm, chest_cm, arm_cm, leg_cm, notes, now_utc.isoformat()))
            row_id = cur.lastrowid
        conn.commit()
    return jsonify({"id": row_id})

@app.route("/api/progress/history")
@require_auth
def progress_history():
    days  = int(request.args.get("days", 30))
    limit = int(request.args.get("limit", 60))
    ph = "%s" if _pg() else "?"
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            f"SELECT id,weight_kg,waist_cm,chest_cm,arm_cm,leg_cm,notes,logged_at "
            f"FROM progress_logs WHERE logged_at>={ph} ORDER BY logged_at DESC LIMIT {ph}",
            (cutoff if _pg() else cutoff.isoformat(), limit))
        rows = cur.fetchall()
    return jsonify({
        "entries": [{"id": r[0], "weight_kg": r[1], "waist_cm": r[2],
                     "chest_cm": r[3], "arm_cm": r[4], "leg_cm": r[5],
                     "notes": r[6], "logged_at": str(r[7])} for r in rows]
    })

# ── Workout log routes ─────────────────────────────────────────────────────────
@app.route("/api/workout/log", methods=["POST"])
@require_auth
def log_workout():
    data         = request.get_json(silent=True) or {}
    plan_id      = (data.get("plan_id")   or "").strip()
    plan_name    = (data.get("plan_name") or "").strip()
    duration_min = int(data.get("duration_min") or 0)
    notes        = (data.get("notes") or "").strip() or None
    now_utc      = datetime.now(timezone.utc)
    with get_db() as conn:
        cur = conn.cursor()
        if _pg():
            cur.execute(
                "INSERT INTO workout_logs (plan_id,plan_name,duration_min,notes,logged_at) "
                "VALUES (%s,%s,%s,%s,%s) RETURNING id",
                (plan_id, plan_name, duration_min, notes, now_utc))
            row_id = cur.fetchone()[0]
        else:
            cur.execute(
                "INSERT INTO workout_logs (plan_id,plan_name,duration_min,notes,logged_at) "
                "VALUES (?,?,?,?,?)",
                (plan_id, plan_name, duration_min, notes, now_utc.isoformat()))
            row_id = cur.lastrowid
        conn.commit()
    return jsonify({"id": row_id})

@app.route("/api/workout/history")
@require_auth
def workout_history():
    limit = int(request.args.get("limit", 10))
    ph = "%s" if _pg() else "?"
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            f"SELECT id,plan_id,plan_name,duration_min,notes,logged_at "
            f"FROM workout_logs ORDER BY logged_at DESC LIMIT {ph}", (limit,))
        rows = cur.fetchall()
    return jsonify({
        "logs": [{"id": r[0], "plan_id": r[1], "plan_name": r[2],
                  "duration_min": r[3], "notes": r[4],
                  "logged_at": str(r[5])} for r in rows]
    })

# ── Food diary routes ─────────────────────────────────────────────────────────
@app.route("/api/food/today")
@require_auth
def food_today():
    start, end = _today_range()
    ph = "%s" if _pg() else "?"
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            f"SELECT id,meal_name,food_name,calories,protein_g,carbs_g,fat_g,logged_at "
            f"FROM food_logs WHERE logged_at>={ph} AND logged_at<{ph} ORDER BY logged_at ASC",
            (start if _pg() else start.isoformat(), end if _pg() else end.isoformat()))
        rows = cur.fetchall()
    return jsonify({
        "entries": [{"id": r[0], "meal_name": r[1], "food_name": r[2],
                     "calories": r[3], "protein_g": r[4], "carbs_g": r[5],
                     "fat_g": r[6], "logged_at": str(r[7])} for r in rows]
    })

@app.route("/api/food/log", methods=["POST"])
@require_auth
def log_food():
    data      = request.get_json(silent=True) or {}
    meal_name = (data.get("meal_name") or "Meal").strip()
    food_name = (data.get("food_name") or "").strip()
    if not food_name:
        return jsonify({"error": "food_name required"}), 400
    calories  = float(data.get("calories")  or 0)
    protein_g = float(data.get("protein_g") or 0)
    carbs_g   = float(data.get("carbs_g")   or 0)
    fat_g     = float(data.get("fat_g")     or 0)
    now_utc   = datetime.now(timezone.utc)
    with get_db() as conn:
        cur = conn.cursor()
        if _pg():
            cur.execute(
                "INSERT INTO food_logs (meal_name,food_name,calories,protein_g,carbs_g,fat_g,logged_at) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                (meal_name, food_name, calories, protein_g, carbs_g, fat_g, now_utc))
            row_id = cur.fetchone()[0]
        else:
            cur.execute(
                "INSERT INTO food_logs (meal_name,food_name,calories,protein_g,carbs_g,fat_g,logged_at) "
                "VALUES (?,?,?,?,?,?,?)",
                (meal_name, food_name, calories, protein_g, carbs_g, fat_g, now_utc.isoformat()))
            row_id = cur.lastrowid
        conn.commit()
    return jsonify({"id": row_id})

@app.route("/api/food/log/<int:log_id>", methods=["DELETE"])
@require_auth
def delete_food_log(log_id):
    ph = "%s" if _pg() else "?"
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(f"DELETE FROM food_logs WHERE id = {ph}", (log_id,))
        conn.commit()
    return jsonify({"ok": True})

# ── Logs / analytics routes ───────────────────────────────────────────────────
@app.route("/api/logs/range")
@require_auth
def logs_range():
    days = min(int(request.args.get("days", 30)), 90)
    ph = "%s" if _pg() else "?"
    now_local = datetime.now(APP_TZ)
    tz_str = os.environ.get("APP_TZ", "Asia/Kolkata")

    start_local = (now_local - timedelta(days=days - 1)).replace(
        hour=0, minute=0, second=0, microsecond=0)
    end_local = now_local.replace(hour=23, minute=59, second=59, microsecond=999999)
    sv = start_local.astimezone(timezone.utc)
    ev = end_local.astimezone(timezone.utc)
    if not _pg():
        sv, ev = sv.isoformat(), ev.isoformat()

    date_range = [(start_local + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days)]

    # Local-date expression for grouping
    if _pg():
        d = f"(logged_at AT TIME ZONE '{tz_str}')::date"
        dt = f"{d}::text"
    else:
        d = dt = "DATE(logged_at)"

    water_map, macro_map, food_map, micro_map, workout_map, weight_map = \
        {}, {}, {}, {}, {}, {}

    with get_db() as conn:
        cur = conn.cursor()

        cur.execute(f"SELECT {dt}, COALESCE(SUM(amount_ml),0) FROM water_logs "
                    f"WHERE logged_at>={ph} AND logged_at<{ph} GROUP BY {d}", (sv, ev))
        water_map = {str(r[0]): int(r[1]) for r in cur.fetchall()}

        cur.execute(f"SELECT {dt}, COALESCE(SUM(calories),0), COALESCE(SUM(protein_g),0), "
                    f"COALESCE(SUM(carbs_g),0), COALESCE(SUM(fat_g),0) FROM macro_logs "
                    f"WHERE logged_at>={ph} AND logged_at<{ph} GROUP BY {d}", (sv, ev))
        macro_map = {str(r[0]): (float(r[1]), float(r[2]), float(r[3]), float(r[4]))
                     for r in cur.fetchall()}

        cur.execute(f"SELECT {dt}, COALESCE(SUM(calories),0), COALESCE(SUM(protein_g),0), "
                    f"COALESCE(SUM(carbs_g),0), COALESCE(SUM(fat_g),0) FROM food_logs "
                    f"WHERE logged_at>={ph} AND logged_at<{ph} GROUP BY {d}", (sv, ev))
        food_map = {str(r[0]): (float(r[1]), float(r[2]), float(r[3]), float(r[4]))
                    for r in cur.fetchall()}

        cur.execute(f"SELECT {dt}, COUNT(DISTINCT nutrient_id) FROM nutrient_logs "
                    f"WHERE logged_at>={ph} AND logged_at<{ph} GROUP BY {d}", (sv, ev))
        micro_map = {str(r[0]): int(r[1]) for r in cur.fetchall()}

        cur.execute(f"SELECT {dt}, COUNT(*) FROM workout_logs "
                    f"WHERE logged_at>={ph} AND logged_at<{ph} GROUP BY {d}", (sv, ev))
        workout_map = {str(r[0]): int(r[1]) for r in cur.fetchall()}

        if _pg():
            cur.execute(f"SELECT DISTINCT ON ({d}) {dt}, weight_kg FROM progress_logs "
                        f"WHERE logged_at>={ph} AND logged_at<{ph} "
                        f"ORDER BY {d}, logged_at DESC", (sv, ev))
        else:
            cur.execute(f"SELECT {dt}, weight_kg FROM progress_logs "
                        f"WHERE logged_at>={ph} AND logged_at<{ph} GROUP BY {d}", (sv, ev))
        weight_map = {str(r[0]): (float(r[1]) if r[1] else None) for r in cur.fetchall()}

    result = []
    for date_str in date_range:
        m_cal, m_p, m_c, m_f = macro_map.get(date_str, (0.0, 0.0, 0.0, 0.0))
        f_cal, f_p, f_c, f_f = food_map.get(date_str, (0.0, 0.0, 0.0, 0.0))
        result.append({
            "date":          date_str,
            "water_ml":      water_map.get(date_str, 0),
            "water_goal":    WATER_GOAL_ML,
            "total_calories": round(m_cal + f_cal, 1),
            "protein_g":     round(m_p + f_p, 1),
            "carbs_g":       round(m_c + f_c, 1),
            "fat_g":         round(m_f + f_f, 1),
            "micro_count":   micro_map.get(date_str, 0),
            "workout_count": workout_map.get(date_str, 0),
            "weight_kg":     weight_map.get(date_str),
        })
    return jsonify({"days": result})

@app.route("/api/logs/day")
@require_auth
def logs_day():
    date_str = request.args.get("date", "")
    try:
        day_local = datetime.strptime(date_str, "%Y-%m-%d").replace(
            hour=0, minute=0, second=0, microsecond=0, tzinfo=APP_TZ)
    except ValueError:
        day_local = datetime.now(APP_TZ).replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_local + timedelta(days=1)
    s = day_local.astimezone(timezone.utc)
    e = day_end.astimezone(timezone.utc)
    sv = s if _pg() else s.isoformat()
    ev = e if _pg() else e.isoformat()
    ph = "%s" if _pg() else "?"
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(f"SELECT COALESCE(SUM(amount_ml),0) FROM water_logs WHERE logged_at>={ph} AND logged_at<{ph}", (sv,ev))
        water = int(cur.fetchone()[0] or 0)
        cur.execute(f"SELECT COALESCE(SUM(calories),0),COALESCE(SUM(protein_g),0),COALESCE(SUM(carbs_g),0),COALESCE(SUM(fat_g),0) FROM macro_logs WHERE logged_at>={ph} AND logged_at<{ph}", (sv,ev))
        mr = cur.fetchone()
        cur.execute(f"SELECT COALESCE(SUM(calories),0),COALESCE(SUM(protein_g),0),COALESCE(SUM(carbs_g),0),COALESCE(SUM(fat_g),0) FROM food_logs WHERE logged_at>={ph} AND logged_at<{ph}", (sv,ev))
        fr = cur.fetchone()
        cur.execute(f"SELECT nutrient_id,COALESCE(SUM(amount),0) FROM nutrient_logs WHERE logged_at>={ph} AND logged_at<{ph} GROUP BY nutrient_id", (sv,ev))
        nutrients = {r[0]: float(r[1]) for r in cur.fetchall()}
        cur.execute(f"SELECT plan_name,duration_min FROM workout_logs WHERE logged_at>={ph} AND logged_at<{ph}", (sv,ev))
        workouts = [{"plan_name": r[0], "duration_min": r[1]} for r in cur.fetchall()]
        cur.execute(f"SELECT id,meal_name,food_name,calories,protein_g,carbs_g,fat_g FROM food_logs WHERE logged_at>={ph} AND logged_at<{ph} ORDER BY logged_at ASC", (sv,ev))
        food_entries = [{"id": r[0],"meal_name":r[1],"food_name":r[2],"calories":r[3],"protein_g":r[4],"carbs_g":r[5],"fat_g":r[6]} for r in cur.fetchall()]
        cur.execute(f"SELECT weight_kg,waist_cm,chest_cm FROM progress_logs WHERE logged_at>={ph} AND logged_at<{ph} ORDER BY logged_at DESC LIMIT 1", (sv,ev))
        prow = cur.fetchone()
        progress = {"weight_kg": float(prow[0]) if prow and prow[0] else None, "waist_cm": float(prow[1]) if prow and prow[1] else None, "chest_cm": float(prow[2]) if prow and prow[2] else None} if prow else {}
    total_cal = float((mr[0] or 0)) + float((fr[0] or 0))
    return jsonify({
        "date": day_local.strftime("%Y-%m-%d"),
        "water_ml": water, "water_goal": WATER_GOAL_ML,
        "total_calories": round(total_cal, 1),
        "protein_g": round(float(mr[1] or 0) + float(fr[1] or 0), 1),
        "carbs_g": round(float(mr[2] or 0) + float(fr[2] or 0), 1),
        "fat_g": round(float(mr[3] or 0) + float(fr[3] or 0), 1),
        "nutrients": nutrients,
        "workouts": workouts,
        "food_entries": food_entries,
        "progress": progress,
    })

# ── Profile update ─────────────────────────────────────────────────────────────
@app.route("/api/user/profile", methods=["POST"])
@require_auth
def update_profile():
    data = request.get_json(silent=True) or {}
    if "water_message" in data:
        set_setting("water_message", (data["water_message"] or "").strip())
    if "height_cm" in data:
        set_setting("height_cm", str(data["height_cm"]))
    return jsonify({"ok": True})

# ── Custom diet plans ─────────────────────────────────────────────────────────
def _plan_row_to_dict(row, meals):
    return {
        "id":          row[0],
        "name":        row[1],
        "goal":        row[2],
        "description": row[3],
        "calories":    row[4],
        "protein_g":   row[5],
        "carbs_g":     row[6],
        "fat_g":       row[7],
        "meals": [
            {"id": m[0], "meal_name": m[1], "foods": m[2],
             "calories": m[3], "protein_g": m[4], "carbs_g": m[5], "fat_g": m[6]}
            for m in meals
        ],
    }

@app.route("/api/diet-plans/custom")
@require_auth
def get_custom_plans():
    ph = "%s" if _pg() else "?"
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id,name,goal,description,calories,protein_g,carbs_g,fat_g FROM custom_diet_plans ORDER BY id ASC")
        plans = cur.fetchall()
        result = []
        for p in plans:
            cur.execute(
                f"SELECT id,meal_name,foods,calories,protein_g,carbs_g,fat_g FROM custom_diet_meals WHERE plan_id={ph} ORDER BY sort_order ASC",
                (p[0],))
            meals = cur.fetchall()
            result.append(_plan_row_to_dict(p, meals))
    return jsonify({"plans": result})

@app.route("/api/diet-plans/custom", methods=["POST"])
@require_auth
def create_custom_plan():
    data     = request.get_json(silent=True) or {}
    name     = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name required"}), 400
    goal        = (data.get("goal")        or "").strip()
    description = (data.get("description") or "").strip()
    calories    = int(data.get("calories",  0) or 0)
    protein_g   = int(data.get("protein_g", 0) or 0)
    carbs_g     = int(data.get("carbs_g",   0) or 0)
    fat_g       = int(data.get("fat_g",     0) or 0)
    meals_data  = data.get("meals") or []

    with get_db() as conn:
        cur = conn.cursor()
        if _pg():
            cur.execute(
                "INSERT INTO custom_diet_plans (name,goal,description,calories,protein_g,carbs_g,fat_g) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                (name, goal, description, calories, protein_g, carbs_g, fat_g))
            plan_id = cur.fetchone()[0]
        else:
            cur.execute(
                "INSERT INTO custom_diet_plans (name,goal,description,calories,protein_g,carbs_g,fat_g) "
                "VALUES (?,?,?,?,?,?,?)",
                (name, goal, description, calories, protein_g, carbs_g, fat_g))
            plan_id = cur.lastrowid

        for i, m in enumerate(meals_data):
            mn   = (m.get("meal_name") or "Meal").strip()
            mf   = (m.get("foods")     or "").strip()
            mcal = int(m.get("calories",  0) or 0)
            mp   = int(m.get("protein_g", 0) or 0)
            mc   = int(m.get("carbs_g",   0) or 0)
            mft  = int(m.get("fat_g",     0) or 0)
            if _pg():
                cur.execute(
                    "INSERT INTO custom_diet_meals (plan_id,meal_name,foods,calories,protein_g,carbs_g,fat_g,sort_order) "
                    "VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                    (plan_id, mn, mf, mcal, mp, mc, mft, i))
            else:
                cur.execute(
                    "INSERT INTO custom_diet_meals (plan_id,meal_name,foods,calories,protein_g,carbs_g,fat_g,sort_order) "
                    "VALUES (?,?,?,?,?,?,?,?)",
                    (plan_id, mn, mf, mcal, mp, mc, mft, i))
        conn.commit()
    return jsonify({"id": plan_id})

@app.route("/api/diet-plans/custom/<int:plan_id>", methods=["PUT"])
@require_auth
def update_custom_plan(plan_id):
    data        = request.get_json(silent=True) or {}
    name        = (data.get("name")        or "").strip()
    goal        = (data.get("goal")        or "").strip()
    description = (data.get("description") or "").strip()
    calories    = int(data.get("calories",  0) or 0)
    protein_g   = int(data.get("protein_g", 0) or 0)
    carbs_g     = int(data.get("carbs_g",   0) or 0)
    fat_g       = int(data.get("fat_g",     0) or 0)
    meals_data  = data.get("meals") or []
    ph = "%s" if _pg() else "?"
    with get_db() as conn:
        cur = conn.cursor()
        if _pg():
            cur.execute(
                "UPDATE custom_diet_plans SET name=%s,goal=%s,description=%s,calories=%s,protein_g=%s,carbs_g=%s,fat_g=%s WHERE id=%s",
                (name, goal, description, calories, protein_g, carbs_g, fat_g, plan_id))
        else:
            cur.execute(
                "UPDATE custom_diet_plans SET name=?,goal=?,description=?,calories=?,protein_g=?,carbs_g=?,fat_g=? WHERE id=?",
                (name, goal, description, calories, protein_g, carbs_g, fat_g, plan_id))
        cur.execute(f"DELETE FROM custom_diet_meals WHERE plan_id={ph}", (plan_id,))
        for i, m in enumerate(meals_data):
            mn = (m.get("meal_name") or "Meal").strip()
            mf = (m.get("foods") or "").strip()
            mcal = int(m.get("calories", 0) or 0)
            mp = int(m.get("protein_g", 0) or 0)
            mc = int(m.get("carbs_g", 0) or 0)
            mft = int(m.get("fat_g", 0) or 0)
            if _pg():
                cur.execute(
                    "INSERT INTO custom_diet_meals (plan_id,meal_name,foods,calories,protein_g,carbs_g,fat_g,sort_order) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                    (plan_id, mn, mf, mcal, mp, mc, mft, i))
            else:
                cur.execute(
                    "INSERT INTO custom_diet_meals (plan_id,meal_name,foods,calories,protein_g,carbs_g,fat_g,sort_order) VALUES (?,?,?,?,?,?,?,?)",
                    (plan_id, mn, mf, mcal, mp, mc, mft, i))
        conn.commit()
    return jsonify({"ok": True})

@app.route("/api/diet-plans/custom/<int:plan_id>", methods=["DELETE"])
@require_auth
def delete_custom_plan(plan_id):
    ph = "%s" if _pg() else "?"
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(f"DELETE FROM custom_diet_meals WHERE plan_id={ph}", (plan_id,))
        cur.execute(f"DELETE FROM custom_diet_plans WHERE id={ph}", (plan_id,))
        conn.commit()
    return jsonify({"ok": True})

# ── Custom workout plans ──────────────────────────────────────────────────────
def _wplan_row_to_dict(row, exercises):
    return {
        "id":             row[0],
        "name":           row[1],
        "category":       row[2],
        "description":    row[3],
        "days_per_week":  row[4],
        "duration_weeks": row[5],
        "exercises": [
            {
                "id":               e[0],
                "day_name":         e[1],
                "exercise_name":    e[2],
                "sets":             e[3],
                "reps_or_duration": e[4],
                "rest_seconds":     e[5],
                "notes":            e[6],
                "sort_order":       e[7],
            }
            for e in exercises
        ],
    }

@app.route("/api/workout-plans/custom")
@require_auth
def get_custom_workout_plans():
    ph = "%s" if _pg() else "?"
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id,name,category,description,days_per_week,duration_weeks FROM custom_workout_plans ORDER BY id ASC")
        plans = cur.fetchall()
        result = []
        for p in plans:
            cur.execute(
                f"SELECT id,day_name,exercise_name,sets,reps_or_duration,rest_seconds,notes,sort_order "
                f"FROM custom_workout_exercises WHERE plan_id={ph} ORDER BY day_name ASC, sort_order ASC",
                (p[0],))
            exercises = cur.fetchall()
            result.append(_wplan_row_to_dict(p, exercises))
    return jsonify({"plans": result})

@app.route("/api/workout-plans/custom", methods=["POST"])
@require_auth
def create_custom_workout_plan():
    data          = request.get_json(silent=True) or {}
    name          = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name required"}), 400
    category       = (data.get("category")    or "").strip()
    description    = (data.get("description") or "").strip()
    days_per_week  = int(data.get("days_per_week",  3) or 3)
    duration_weeks = int(data.get("duration_weeks", 4) or 4)
    exercises_data = data.get("exercises") or []

    with get_db() as conn:
        cur = conn.cursor()
        if _pg():
            cur.execute(
                "INSERT INTO custom_workout_plans (name,category,description,days_per_week,duration_weeks) "
                "VALUES (%s,%s,%s,%s,%s) RETURNING id",
                (name, category, description, days_per_week, duration_weeks))
            plan_id = cur.fetchone()[0]
        else:
            cur.execute(
                "INSERT INTO custom_workout_plans (name,category,description,days_per_week,duration_weeks) "
                "VALUES (?,?,?,?,?)",
                (name, category, description, days_per_week, duration_weeks))
            plan_id = cur.lastrowid

        for i, ex in enumerate(exercises_data):
            dn   = (ex.get("day_name")         or "Day 1").strip()
            en   = (ex.get("exercise_name")    or "Exercise").strip()
            sets = int(ex.get("sets",           3) or 3)
            rod  = (ex.get("reps_or_duration") or "10").strip()
            rest = int(ex.get("rest_seconds",  60) or 60)
            note = (ex.get("notes")            or "").strip()
            if _pg():
                cur.execute(
                    "INSERT INTO custom_workout_exercises "
                    "(plan_id,day_name,exercise_name,sets,reps_or_duration,rest_seconds,notes,sort_order) "
                    "VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                    (plan_id, dn, en, sets, rod, rest, note, i))
            else:
                cur.execute(
                    "INSERT INTO custom_workout_exercises "
                    "(plan_id,day_name,exercise_name,sets,reps_or_duration,rest_seconds,notes,sort_order) "
                    "VALUES (?,?,?,?,?,?,?,?)",
                    (plan_id, dn, en, sets, rod, rest, note, i))
        conn.commit()
    return jsonify({"id": plan_id})

@app.route("/api/workout-plans/custom/<int:plan_id>", methods=["PUT"])
@require_auth
def update_custom_workout_plan(plan_id):
    data          = request.get_json(silent=True) or {}
    name          = (data.get("name")        or "").strip()
    category      = (data.get("category")    or "").strip()
    description   = (data.get("description") or "").strip()
    days_per_week  = int(data.get("days_per_week",  3) or 3)
    duration_weeks = int(data.get("duration_weeks", 4) or 4)
    exercises_data = data.get("exercises") or []
    ph = "%s" if _pg() else "?"
    with get_db() as conn:
        cur = conn.cursor()
        if _pg():
            cur.execute(
                "UPDATE custom_workout_plans SET name=%s,category=%s,description=%s,"
                "days_per_week=%s,duration_weeks=%s WHERE id=%s",
                (name, category, description, days_per_week, duration_weeks, plan_id))
        else:
            cur.execute(
                "UPDATE custom_workout_plans SET name=?,category=?,description=?,"
                "days_per_week=?,duration_weeks=? WHERE id=?",
                (name, category, description, days_per_week, duration_weeks, plan_id))
        cur.execute(f"DELETE FROM custom_workout_exercises WHERE plan_id={ph}", (plan_id,))
        for i, ex in enumerate(exercises_data):
            dn   = (ex.get("day_name")         or "Day 1").strip()
            en   = (ex.get("exercise_name")    or "Exercise").strip()
            sets = int(ex.get("sets",           3) or 3)
            rod  = (ex.get("reps_or_duration") or "10").strip()
            rest = int(ex.get("rest_seconds",  60) or 60)
            note = (ex.get("notes")            or "").strip()
            if _pg():
                cur.execute(
                    "INSERT INTO custom_workout_exercises "
                    "(plan_id,day_name,exercise_name,sets,reps_or_duration,rest_seconds,notes,sort_order) "
                    "VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                    (plan_id, dn, en, sets, rod, rest, note, i))
            else:
                cur.execute(
                    "INSERT INTO custom_workout_exercises "
                    "(plan_id,day_name,exercise_name,sets,reps_or_duration,rest_seconds,notes,sort_order) "
                    "VALUES (?,?,?,?,?,?,?,?)",
                    (plan_id, dn, en, sets, rod, rest, note, i))
        conn.commit()
    return jsonify({"ok": True})

@app.route("/api/workout-plans/custom/<int:plan_id>", methods=["DELETE"])
@require_auth
def delete_custom_workout_plan(plan_id):
    ph = "%s" if _pg() else "?"
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(f"DELETE FROM custom_workout_exercises WHERE plan_id={ph}", (plan_id,))
        cur.execute(f"DELETE FROM custom_workout_plans WHERE id={ph}", (plan_id,))
        conn.commit()
    return jsonify({"ok": True})

# ── Health + Flutter SPA ──────────────────────────────────────────────────
@app.route("/healthz")
def healthz():
    return jsonify({"ok": True, "setup": is_setup_done()})

@app.route("/flutter_bootstrap.js")
def flutter_bootstrap_js():
    """Patch flutter_bootstrap.js on every request:
    1. Strip serviceWorkerSettings  — prevents 4s freeze waiting for Flutter's blank SW
    2. Set canvasKitBaseUrl to /canvaskit — loads CanvasKit WASM from our own server
       instead of Google CDN, eliminating the CDN roundtrip that freezes the app on open
    """
    path = os.path.join(STATIC, "flutter_bootstrap.js")
    try:
        with open(path, encoding="utf-8") as f:
            content = f.read()
        idx = content.rfind("_flutter.loader.load(")
        if idx >= 0:
            content = content[:idx] + '_flutter.loader.load({"canvasKitBaseUrl":"/canvaskit"});'
        resp = make_response(content)
        resp.headers["Content-Type"] = "application/javascript; charset=utf-8"
        resp.headers["Cache-Control"] = "no-cache, must-revalidate"
        return resp
    except Exception:
        return send_from_directory(STATIC, "flutter_bootstrap.js")

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_flutter(path):
    if path.startswith(("api/", "tasks/", "healthz")):
        abort(404)
    static_path = os.path.join(STATIC, path)
    if path and os.path.isfile(static_path):
        resp = make_response(send_from_directory(STATIC, path))
        if path.startswith("canvaskit/") and path.endswith((".wasm", ".js")):
            # CanvasKit assets are content-addressed — cache forever
            resp.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        elif path.endswith((".html", ".js")):
            resp.headers["Cache-Control"] = "no-cache, must-revalidate"
        return resp
    index = os.path.join(STATIC, "index.html")
    if os.path.isfile(index):
        resp = make_response(send_from_directory(STATIC, "index.html"))
        resp.headers["Cache-Control"] = "no-cache, must-revalidate"
        return resp
    return jsonify({"error": "Flutter build not found. Run Build_Flutter.bat first."}), 404

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
