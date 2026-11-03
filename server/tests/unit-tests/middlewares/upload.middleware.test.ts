import express from 'express';
import supertest from 'supertest';
import { uploadReceipt } from '../../../src/middlewares/upload.middleware.js';

const app = express();
app.post('/upload', uploadReceipt, (req, res) => {
  res.status(200).json({
    body: { ...req.body },
    file: req.file ? { originalname: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size } : null,
  });
});

const request = supertest(app);

describe('upload.middleware uploadReceipt', () => {
  it('keeps the receipt in memory and parses the other fields', async () => {
    const response = await request
      .post('/upload')
      .field('vendor', 'Acme')
      .attach('receipt', Buffer.from('%PDF-1.4'), { filename: 'invoice.pdf', contentType: 'application/pdf' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      body: { vendor: 'Acme' },
      file: { originalname: 'invoice.pdf', mimetype: 'application/pdf', size: 8 },
    });
  });

  it.each(['image/jpeg', 'image/png', 'image/webp'])('accepts %s', async (contentType) => {
    const response = await request.post('/upload').attach('receipt', Buffer.from('img'), { filename: 'photo', contentType });

    expect(response.status).toBe(200);
    expect(response.body.file.mimetype).toBe(contentType);
  });

  it('passes through a request without a file', async () => {
    const response = await request.post('/upload').field('vendor', 'Acme');

    expect(response.status).toBe(200);
    expect(response.body.file).toBeNull();
  });

  it('rejects a file type that is not allowed', async () => {
    const response = await request
      .post('/upload')
      .attach('receipt', Buffer.from('MZ'), { filename: 'run.exe', contentType: 'application/x-msdownload' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Receipt must be a PDF, JPEG, PNG or WebP file.' });
  });

  it('rejects a file over 5 MB', async () => {
    const response = await request
      .post('/upload')
      .attach('receipt', Buffer.alloc(5 * 1024 * 1024 + 1), { filename: 'big.pdf', contentType: 'application/pdf' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Receipt must be 5 MB or smaller.' });
  });

  it('rejects a file sent under another field name', async () => {
    const response = await request
      .post('/upload')
      .attach('invoice', Buffer.from('%PDF'), { filename: 'invoice.pdf', contentType: 'application/pdf' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Send one receipt file in the "receipt" field.' });
  });
});
