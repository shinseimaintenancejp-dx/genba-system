import asyncio
import logging
import sys
from passlib.context import CryptContext

from app.core.database import async_session_factory
from app.modules.auth.models import UserModel
from app.core.permissions import Role

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

async def create_admin():
    """Create the initial ADMIN user for production."""
    async with async_session_factory() as db:
        try:
            from sqlalchemy import select
            
            # Check if any admin exists
            result = await db.execute(select(UserModel).where(UserModel.role == Role.ADMIN))
            existing_admin = result.scalar_one_or_none()
            
            if existing_admin:
                logger.info("An ADMIN user already exists. Initial setup is not required.")
                return

            print("\n--- 管理者（ADMIN）アカウントの初期設定 ---")
            username = input("ユーザー名を入力してください [admin]: ").strip() or "admin"
            
            while True:
                password = input("パスワードを入力してください（8文字以上）: ").strip()
                if len(password) >= 8:
                    break
                print("⚠️ パスワードは8文字以上である必要があります。")
                
            full_name = input("氏名を入力してください [システム管理者]: ").strip() or "システム管理者"

            # Create new user
            new_user = UserModel(
                username=username,
                email=None,
                full_name=full_name,
                hashed_password=get_password_hash(password),
                role=Role.ADMIN,
                is_active=True,
            )
            
            db.add(new_user)
            await db.commit()
            logger.info(f"✅ 管理者アカウント '{username}' の作成に成功しました。")
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error creating admin user: {e}")

if __name__ == "__main__":
    asyncio.run(create_admin())
