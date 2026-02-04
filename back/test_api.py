#!/usr/bin/env python3

import requests
import json

BASE_URL = "http://localhost:8000"

def test_api():
    """Test the API endpoints"""
    print("Testing API endpoints...")
    
    # Test health endpoint
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print("✓ Backend server is running")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to backend: {str(e)}")
        return False
    
    # Register a test user
    try:
        user_data = {
            "email": "admin@jobcard.com",
            "password": "admin123",
            "full_name": "System Administrator"
        }
        response = requests.post(f"{BASE_URL}/auth/register", json=user_data)
        if response.status_code == 200:
            print("✓ Registered admin user successfully")
        else:
            print(f"⚠️ Registration response: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"⚠️ Registration failed: {str(e)}")
    
    # Login to get token
    try:
        login_data = {
            "email": "admin@jobcard.com",
            "password": "admin123"
        }
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        if response.status_code == 200:
            token_data = response.json()
            token = token_data["access_token"]
            user_info = token_data["user"]
            print(f"✓ Login successful")
            print(f"  User: {user_info['email']}")
            print(f"  Admin: {user_info['is_admin']}")
            return token
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Login error: {str(e)}")
        return None

def test_admin_endpoints(token):
    """Test admin-only endpoints"""
    if not token:
        print("❌ No token available for admin tests")
        return False
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test /me endpoint
    try:
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        if response.status_code == 200:
            user_data = response.json()
            print(f"✓ Current user info retrieved: {user_data['email']}")
        else:
            print(f"❌ Failed to get current user: {response.status_code}")
    except Exception as e:
        print(f"❌ Error getting current user: {str(e)}")
    
    return True

if __name__ == "__main__":
    token = test_api()
    if token:
        test_admin_endpoints(token)
