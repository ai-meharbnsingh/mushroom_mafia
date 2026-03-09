import asyncio
from app.database import async_session_factory
from app.models.device import Device
from sqlalchemy import select

async def check():
    macs = ["C8:F0:9E:A0:F2:D0", "C8:F0:9E:A6:2A:84"]
    async with async_session_factory() as db:
        for mac in macs:
            res = await db.execute(select(Device).where(Device.mac_address == mac))
            d = res.scalar_one_or_none()
            if d:
                print(f"Device MAC: {d.mac_address} | Key: {d.license_key}")
                print(f"  Online: {d.is_online}")
                print(f"  Last Seen: {d.last_seen}")
                print(f"  IP: {d.device_ip}")
            else:
                print(f"MAC {mac} not found in DB")

if __name__ == "__main__":
    asyncio.run(check())
