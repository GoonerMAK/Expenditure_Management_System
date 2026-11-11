import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const receiptExtensions: Record<string, string> = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
};

export const getReceiptTypes = () => Object.keys(receiptExtensions);

export const getMaxReceiptSize = () => 5 * 1024 * 1024;

const getReceiptDir = () => path.resolve(process.env.UPLOAD_DIR ?? 'uploads', 'receipts');

export const getReceiptPath = (file: string) => path.join(getReceiptDir(), path.basename(file));

export const saveReceipt = async (buffer: Buffer, mimetype: string) => {
    await fs.mkdir(getReceiptDir(), { recursive: true });
    const file = `${randomUUID()}${receiptExtensions[mimetype] ?? ''}`;
    await fs.writeFile(getReceiptPath(file), buffer);
    return file;
};

export const deleteReceipt = async (file: string) => {
    try {
        await fs.unlink(getReceiptPath(file));
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }
};
