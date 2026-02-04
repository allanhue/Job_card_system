#!/usr/bin/env python3

import requests
import json

BASE_URL = "http://localhost:8000"

def test_frontend_api_connection():
    """Test that frontend can connect to backend API"""
    print("Testing frontend API connection...")
    
    # Test health endpoint
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print("✓ Backend health check successful")
            print(f"  Response: {response.json()}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to backend: {str(e)}")
        return False
    
    # Test auth endpoints
    try:
        login_data = {
            "email": "admin@jobcard.com",
            "password": "admin123"
        }
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        if response.status_code == 200:
            token_data = response.json()
            print("✓ Auth login successful")
            print(f"  User: {token_data['user']['email']}")
            print(f"  Admin: {token_data['user']['is_admin']}")
        else:
            print(f"❌ Auth login failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Auth login error: {str(e)}")
        return False
    
    # Test invoice endpoints
    try:
        response = requests.get(f"{BASE_URL}/invoices/")
        if response.status_code == 401:
            print("✓ Invoice endpoint requires authentication (expected)")
        else:
            print(f"⚠️ Invoice endpoint response: {response.status_code}")
    except Exception as e:
        print(f"❌ Invoice endpoint error: {str(e)}")
        return False
    
    print("✅ Frontend API connection test completed successfully!")
    return True

if __name__ == "__main__":
    test_frontend_api_connection()
