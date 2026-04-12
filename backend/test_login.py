import sys
from pathlib import Path

# Add the backend directory to sys.path so we can import app modules
curr_dir = Path(__file__).resolve().parent
backend_dir = curr_dir
if backend_dir.name != 'backend':
    print("Run inside backend")
    sys.exit(1)

sys.path.append(str(backend_dir))

try:
    from app.services import auth_utils
    db = auth_utils.read_db()
    
    print("Users in DB:", [u['email'] for u in db['users']])
    
    user = next((u for u in db["users"] if u["email"].strip() == "shreya.nipunge@gmail.com"), None)
    if user:
        print("Found user:", user['email'])
        print("Testing common passwords...")
        common_passwords = ["123456", "password", "shreya123", "shreya", "12345678"]
        for p in common_passwords:
            if auth_utils.verify_password(p, user['password']):
                print(f"SUCCESS: password is {p}")
                break
        else:
            print("Password did not match common ones.")
    else:
        print("User not found.")
except Exception as e:
    import traceback
    traceback.print_exc()
