import os

env_local_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env.local')
print("Looking for .env.local at:", env_local_path)
print("Exists:", os.path.exists(env_local_path))

if os.path.exists(env_local_path):
    with open(env_local_path, 'r') as f:
        content = f.read()
        print("File read success.")
        for line in content.splitlines():
            if line.startswith('DATABASE_URL='):
                print("Found line:", line)
