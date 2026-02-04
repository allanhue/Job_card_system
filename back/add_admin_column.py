#!/usr/bin/env python3

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from db import engine

load_dotenv()

def add_admin_column():
    """Add is_admin column to users table"""
    try:
        print("Adding is_admin column to users table...")
        
        with engine.connect() as connection:
            # Check if column exists
            result = connection.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'is_admin'
            """))
            
            if result.fetchone():
                print("✓ is_admin column already exists")
            else:
                # Add the column
                connection.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN is_admin BOOLEAN DEFAULT FALSE
                """))
                connection.commit()
                print("✓ Added is_admin column to users table")
            
        print("✅ Admin column addition completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Failed to add admin column: {str(e)}")
        return False

if __name__ == "__main__":
    add_admin_column()
