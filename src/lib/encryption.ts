import CryptoJS from "crypto-js";

/**
 * Encrypts plaintext using AES with the Local Master Key.
 * The LMK never leaves the browser — only ciphertext is stored in Supabase.
 */
export function encryptWithLMK(plaintext: string, lmk: string): string {
  return CryptoJS.AES.encrypt(plaintext, lmk).toString();
}

/**
 * Decrypts ciphertext using AES with the Local Master Key.
 * Only the admin who signed the original message can decrypt.
 */
export function decryptWithLMK(ciphertext: string, lmk: string): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, lmk);
  return bytes.toString(CryptoJS.enc.Utf8);
}
