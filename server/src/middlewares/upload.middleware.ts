import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { getMaxReceiptSize, getReceiptTypes } from '../storage/receipt.storage.js';

const receiptUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: getMaxReceiptSize(), files: 1 },
    fileFilter: (_req, file, callback) => {
        if (getReceiptTypes().includes(file.mimetype)) {
            callback(null, true);
        } else {
            callback(new Error('Receipt must be a PDF, JPEG, PNG or WebP file.'));
        }
    },
}).single('receipt');

export const uploadReceipt = (req: Request, res: Response, next: NextFunction) => {
    receiptUpload(req, res, (error: unknown) => {
        if (!error) return next();

        if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'Receipt must be 5 MB or smaller.' });
        }
        if (error instanceof multer.MulterError) {
            return res.status(400).json({ message: 'Send one receipt file in the "receipt" field.' });
        }
        res.status(400).json({ message: (error as Error).message });
    });
};
