use wasm_bindgen::prelude::*;
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce
}; // Pure Rust AES-GCM implementation
use sha2::{Sha256, Digest};
use rand::Rng;

#[wasm_bindgen]
pub fn encrypt_file(data: &[u8], password: &str) -> Result<Vec<u8>, JsValue> {
    // 1. Derive Key from Password (SHA-256)
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    let key = hasher.finalize();
    let cipher = Aes256Gcm::new(&key);

    // 2. Generate Random Nonce (12 bytes)
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    // 3. Encrypt
    let ciphertext = cipher.encrypt(nonce, data)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    // 4. Combine Nonce + Ciphertext
    let mut result = Vec::with_capacity(12 + ciphertext.len());
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);

    Ok(result)
}

#[wasm_bindgen]
pub fn decrypt_file(data: &[u8], password: &str) -> Result<Vec<u8>, JsValue> {
    if data.len() < 12 {
        return Err(JsValue::from_str("Invalid data length"));
    }

    // 1. Extract Nonce
    let (nonce_bytes, ciphertext) = data.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    // 2. Derive Key
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    let key = hasher.finalize();
    let cipher = Aes256Gcm::new(&key);

    // 3. Decrypt
    let plaintext = cipher.decrypt(nonce, ciphertext)
        .map_err(|_| JsValue::from_str("Decryption failed (Wrong password?)"))?;

    Ok(plaintext)
}
