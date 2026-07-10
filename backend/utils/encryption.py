import os
import hashlib
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding

ALGORITHM = 'aes-256-cbc'
ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY', 'my-super-secret-encryption-key-32')

def get_key():
    return hashlib.sha256(ENCRYPTION_KEY.encode('utf-8')).digest()

def encrypt(text: str) -> str:
    if not text:
        return ''
    key = get_key()
    iv = os.urandom(16)
    
    padder = padding.PKCS7(128).padder()
    padded_data = padder.update(text.encode('utf-8')) + padder.finalize()
    
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    encrypted = encryptor.update(padded_data) + encryptor.finalize()
    
    return iv.hex() + ':' + encrypted.hex()

def decrypt(encrypted_text: str) -> str:
    if not encrypted_text:
        return ''
    try:
        parts = encrypted_text.split(':')
        if len(parts) != 2:
            return encrypted_text
            
        iv = bytes.fromhex(parts[0])
        encrypted_data = bytes.fromhex(parts[1])
        key = get_key()
        
        cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        decrypted_padded = decryptor.update(encrypted_data) + decryptor.finalize()
        
        unpadder = padding.PKCS7(128).unpadder()
        decrypted = unpadder.update(decrypted_padded) + unpadder.finalize()
        
        return decrypted.decode('utf-8')
    except Exception as e:
        print(f"Decryption failed: {e}")
        return encrypted_text
