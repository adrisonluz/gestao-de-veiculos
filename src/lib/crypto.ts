import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getKey(): Buffer {
  const key = process.env.INTEGRATIONS_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('INTEGRATIONS_ENCRYPTION_KEY não configurada.');
  }
  const buffer = Buffer.from(key, 'base64');
  if (buffer.length !== 32) {
    throw new Error('INTEGRATIONS_ENCRYPTION_KEY deve ser uma chave de 32 bytes em base64.');
  }
  return buffer;
}

export function encryptSecret(plainText: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':');
}

export function decryptSecret(cipherText: string): string {
  const [ivB64, authTagB64, dataB64] = cipherText.split(':');
  if (!ivB64 || !authTagB64 || !dataB64) {
    throw new Error('Formato de segredo criptografado inválido.');
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
  return decrypted.toString('utf8');
}
