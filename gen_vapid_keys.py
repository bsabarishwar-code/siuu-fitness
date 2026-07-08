"""
Run this ONCE to generate VAPID keys for Siuu Fitness web push notifications.
Paste the output into Render Environment variables.

Usage:
    pip install py-vapid
    python gen_vapid_keys.py
"""
try:
    from py_vapid import Vapid
except ImportError:
    import subprocess, sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "py-vapid"])
    from py_vapid import Vapid

v = Vapid()
v.generate_keys()

pub  = v.public_key.public_bytes(
    __import__("cryptography.hazmat.primitives.serialization", fromlist=["Encoding","PublicFormat"]).Encoding.X962,
    __import__("cryptography.hazmat.primitives.serialization", fromlist=["PublicFormat"]).PublicFormat.UncompressedPoint,
)
import base64
pub_b64 = base64.urlsafe_b64encode(pub).rstrip(b"=").decode()
priv_pem = v.private_key.private_bytes(
    __import__("cryptography.hazmat.primitives.serialization", fromlist=["Encoding","PrivateFormat","NoEncryption"]).Encoding.PEM,
    __import__("cryptography.hazmat.primitives.serialization", fromlist=["PrivateFormat"]).PrivateFormat.TraditionalOpenSSL,
    __import__("cryptography.hazmat.primitives.serialization", fromlist=["NoEncryption"]).NoEncryption(),
).decode()

print("=" * 60)
print("Copy these into Render → Environment Variables")
print("=" * 60)
print()
print(f"VAPID_PUBLIC_KEY  = {pub_b64}")
print()
print("VAPID_PRIVATE_KEY (paste the full PEM including header/footer):")
print(priv_pem)
print("=" * 60)
print()
print("Also paste VAPID_PUBLIC_KEY into Flutter:")
print(f"  lib/services/push_service.dart  →  const _vapidKey = '{pub_b64}';")
input("Press Enter to close...")
