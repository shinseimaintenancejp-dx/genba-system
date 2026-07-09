import os
import asyncio
from app.core.database import async_session_factory, engine
from app.modules.auth.schemas import CreateUserRequest
from app.modules.auth.service import auth_service
from app.modules.auth.repository import user_repository

async def main():
    try:
        async with async_session_factory() as session:
            # check if admin exists
            user = await user_repository.get_by_username(session, "admin")
            if user:
                print("Admin user already exists.")
                return
            
            password = os.getenv("ADMIN_PASSWORD", "Shinsei@2026!")
            req = CreateUserRequest(
                username="admin",
                password=password,
                full_name="System Administrator",
                role="ADMIN",
                email="admin@example.com"
            )
            await auth_service.create_user(session, req)
            await session.commit()
            print("Admin user created successfully.")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
