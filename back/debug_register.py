#!/usr/bin/env python3

import os
from dotenv import load_dotenv
from sqlalchemy.orm import sessionmaker
from db import engine, Base
from routes.auth import User, get_password_hash

load_dotenv()

def debug_registration():
    """Debug the registration process"""
    try:
        print("Debugging registration process...")
        
        # Create session
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        try:
            # Check if user already exists
            existing_user = db.query(User).filter(User.email == "admin@jobcard.com").first()
            if existing_user:
                print(f"✓ User already exists: {existing_user.email}")
                print(f"  Admin: {existing_user.is_admin}")
                return existing_user
            
            # Create new user
            print("Creating new admin user...")
            hashed_password = get_password_hash("admin123")
            new_user = User(
                email="admin@jobcard.com",
                password=hashed_password,
                full_name="System Administrator",
                is_admin=True
            )
            
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            
            print(f"✓ Created admin user: {new_user.email}")
            print(f"  Admin: {new_user.is_admin}")
            return new_user
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Debug registration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    debug_registration()
