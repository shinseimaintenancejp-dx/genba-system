import asyncio
import logging
from passlib.context import CryptContext

from app.core.database import async_session_factory
from app.core.environment_guard import block_in_production
from app.modules.auth.models import UserModel
from app.core.permissions import Role

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

async def seed_preview_users(count: int = 5):
    """Create multiple preview users with INTERNAL_STAFF role for testing."""
    # Guard: will raise RuntimeError if ENVIRONMENT=production
    block_in_production("seed_preview_users")
    async with async_session_factory() as db:
        try:
            from sqlalchemy import select
            
            # Loop to create multiple accounts
            for i in range(1, count + 1):
                username = f"preview_tester_{i}"
                
                # Check if user already exists
                result = await db.execute(select(UserModel).where(UserModel.username == username))
                user = result.scalar_one_or_none()
                
                if user:
                    logger.info(f"Preview user '{username}' already exists.")
                    continue

                # Create new user
                new_user = UserModel(
                    username=username,
                    email=f"preview_{i}@shinsei.example.com",
                    full_name=f"Preview Tester {i} (プレビュー用)",
                    hashed_password=get_password_hash("Preview2026!"),
                    role=Role.INTERNAL_STAFF,
                    is_active=True,
                )
                
                db.add(new_user)
                
            await db.commit()
            logger.info(f"Successfully created {count} preview users (e.g., preview_tester_1 to preview_tester_{count}). Password for all: 'Preview2026!'")
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error seeding preview users: {e}")

if __name__ == "__main__":
    import sys
    # Read count from arguments if provided
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    asyncio.run(seed_preview_users(count))

