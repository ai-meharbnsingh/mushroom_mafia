#!/usr/bin/env python3
# DEPRECATED: This script is superseded by the FlashDevice web interface.
# Use dashboard.mushroomkimandi.com for device provisioning.
"""
QR Code Generator for Mushroom Farm IoT Devices

Usage:
    python tools/generate_qr.py --mac AA:BB:CC:DD:EE:FF --name "Sensor-Room1"
    python tools/generate_qr.py --mac AA:BB:CC:DD:EE:FF --name "Sensor-Room1" --api-url https://protective-enjoyment-production-2320.up.railway.app/api/v1

This script:
1. Calls backend POST /devices/provision to create a device and get a license key
2. Derives AP name from MAC: MUSH_ + last 4 hex chars of MAC address
3. Uses fixed AP password: 123456 (matches firmware captive portal)
4. Generates a QR code PNG containing JSON payload
5. Saves the PNG locally and uploads it to the backend DB

Dependencies: pip install qrcode Pillow requests
"""

import argparse
import base64
import json
import os
import sys
from io import BytesIO

try:
    import qrcode
    from PIL import Image
    import requests
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Install with: pip install qrcode Pillow requests")
    sys.exit(1)


DEFAULT_API_URL = "https://protective-enjoyment-production-2320.up.railway.app/api/v1"
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "qr_codes")


def get_auth_token(api_url: str, username: str, password: str) -> str:
    """Authenticate with the backend and return a JWT token."""
    resp = requests.post(
        f"{api_url}/auth/login",
        json={"email": username, "password": password},
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    return data.get("access_token") or data.get("token")


def provision_device(api_url: str, token: str, mac_address: str, device_name: str) -> dict:
    """Call POST /devices/provision to create a new device."""
    resp = requests.post(
        f"{api_url}/devices/provision",
        json={
            "mac_address": mac_address,
            "device_name": device_name,
            "device_type": "ESP32",
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()


def upload_qr_image(api_url: str, token: str, device_id: int, image_base64: str) -> None:
    """Upload the QR code image to the backend for DB storage."""
    resp = requests.post(
        f"{api_url}/devices/{device_id}/qr-image",
        json={"image": image_base64},
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    resp.raise_for_status()


def derive_ap_name(mac_address: str) -> str:
    """Derive AP name from MAC: MUSH_ + last 4 hex chars (no colons)."""
    clean = mac_address.replace(":", "").replace("-", "").upper()
    return f"MUSH_{clean[-4:]}"


def derive_ap_password() -> str:
    """Fixed AP password matching firmware captive portal default."""
    return "123456"


def generate_qr_png(payload: dict, size: int = 10) -> bytes:
    """Generate a QR code PNG as bytes from a JSON payload."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=size,
        border=4,
    )
    qr.add_data(json.dumps(payload, separators=(",", ":")))
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def main():
    parser = argparse.ArgumentParser(
        description="Generate QR code for Mushroom Farm IoT device onboarding"
    )
    parser.add_argument("--mac", required=True, help="Device MAC address (e.g. AA:BB:CC:DD:EE:FF)")
    parser.add_argument("--name", required=True, help="Device name (e.g. Sensor-Room1)")
    parser.add_argument("--api-url", default=DEFAULT_API_URL, help=f"Backend API URL (default: {DEFAULT_API_URL})")
    parser.add_argument("--username", default=None, help="Admin email for auth (will prompt if not provided)")
    parser.add_argument("--password", default=None, help="Admin password for auth (will prompt if not provided)")
    parser.add_argument("--token", default=None, help="JWT token (skip login if provided)")

    args = parser.parse_args()

    # Authenticate
    token = args.token
    if not token:
        username = args.username
        password = args.password
        if not username:
            username = input("Admin email: ")
        if not password:
            import getpass
            password = getpass.getpass("Admin password: ")

        print(f"Authenticating with {args.api_url}...")
        try:
            token = get_auth_token(args.api_url, username, password)
            print("Authenticated successfully")
        except requests.HTTPError as e:
            print(f"Authentication failed: {e.response.status_code} {e.response.text}")
            sys.exit(1)

    # Provision device
    print(f"Provisioning device: MAC={args.mac}, Name={args.name}...")
    try:
        result = provision_device(args.api_url, token, args.mac, args.name)
    except requests.HTTPError as e:
        print(f"Provisioning failed: {e.response.status_code} {e.response.text}")
        sys.exit(1)

    device_id = result["device_id"]
    license_key = result["license_key"]
    print(f"Device provisioned: ID={device_id}, Key={license_key}")

    # Derive AP credentials
    ap_name = derive_ap_name(args.mac)
    ap_password = derive_ap_password()

    # Build QR payload (matches firmware captive portal expectations)
    qr_payload = {
        "v": 1,
        "lic": license_key,
        "mac": args.mac.replace(":", "").replace("-", "").upper(),
        "ap": ap_name,
        "pw": ap_password,
    }
    print(f"QR payload: {json.dumps(qr_payload)}")

    # Generate QR code PNG
    png_bytes = generate_qr_png(qr_payload)
    image_base64 = f"data:image/png;base64,{base64.b64encode(png_bytes).decode()}"

    # Save locally
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    output_path = os.path.join(OUTPUT_DIR, f"{license_key}.png")
    with open(output_path, "wb") as f:
        f.write(png_bytes)
    print(f"QR code saved: {output_path}")

    # Upload to backend DB
    print("Uploading QR image to backend...")
    try:
        upload_qr_image(args.api_url, token, device_id, image_base64)
        print("QR image uploaded to DB successfully")
    except requests.HTTPError as e:
        print(f"Warning: QR image upload failed: {e.response.status_code} {e.response.text}")
        print("The local file was saved — you can upload manually later.")

    # Summary
    print("\n" + "=" * 50)
    print("DEVICE ONBOARDING SUMMARY")
    print("=" * 50)
    print(f"  Device ID:    {device_id}")
    print(f"  License Key:  {license_key}")
    print(f"  MAC Address:  {args.mac}")
    print(f"  Device Name:  {args.name}")
    print(f"  AP Name:      {ap_name}")
    print(f"  AP Password:  {ap_password}")
    print(f"  QR Code File: {output_path}")
    print(f"  Status:       PENDING (awaiting room link + admin approval)")
    print("=" * 50)
    print("\nNext steps:")
    print("  1. Print the QR code and attach to the device")
    print("  2. Flash firmware to the ESP32")
    print("  3. User scans QR in the web app to link to a room")
    print("  4. Admin approves the device in the Devices page")


if __name__ == "__main__":
    main()
