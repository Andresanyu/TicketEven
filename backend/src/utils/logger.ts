import fs from 'fs';
import path from 'path';

const LOG_DIR = path.resolve(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'payments.log');

function ensureLogDir() {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

function timestamp(): string {
  return new Date().toISOString();
}

function writeLine(line: string) {
  try {
    ensureLogDir();
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch (e) {
    // fallback to console if file write fails
    // eslint-disable-next-line no-console
    console.error('Logger write failed', e);
  }
}

function maskPan(pan?: string) {
  if (!pan) return undefined;
  const digits = String(pan).replace(/\s+/g, '');
  if (digits.length <= 4) return '****';
  const last4 = digits.slice(-4);
  return '**** **** **** ' + last4;
}

const logger = {
  info: (msg: string, meta?: any) => {
    const line = `[INFO] ${timestamp()} - ${msg} ${meta ? JSON.stringify(maskMeta(meta)) : ''}`;
    writeLine(line);
  },
  result: (msg: string, meta?: any) => {
    const line = `[RESULTADO] ${timestamp()} - ${msg} ${meta ? JSON.stringify(maskMeta(meta)) : ''}`;
    writeLine(line);
  },
  error: (msg: string, meta?: any) => {
    const line = `[ERROR] ${timestamp()} - ${msg} ${meta ? JSON.stringify(maskMeta(meta)) : ''}`;
    writeLine(line);
  },
};

function maskMeta(meta: any) {
  try {
    const clone = JSON.parse(JSON.stringify(meta));
    if (clone?.tarjeta?.pan_number) clone.tarjeta.pan_number = maskPan(clone.tarjeta.pan_number);
    if (clone?.tarjeta?.cvv) clone.tarjeta.cvv = '***';
    return clone;
  } catch (e) {
    return meta;
  }
}

export default logger;
