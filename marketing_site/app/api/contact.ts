import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone, farmSize, message, inquiryType } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const farmSizeLabel: Record<string, string> = {
    hobby: 'Home / Hobby (1-2 rooms)',
    small: 'Small Farm (3-5 rooms)',
    medium: 'Medium Farm (6-15 rooms)',
    large: 'Large Commercial (16-50 rooms)',
    enterprise: 'Enterprise (50+ rooms)',
  };

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0891b2; border-bottom: 2px solid #0891b2; padding-bottom: 10px;">
        ${inquiryType && inquiryType !== 'GENERAL' ? `New ${inquiryType} Request` : 'New Contact Form Submission'}
      </h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; color: #334155; width: 120px;">Name:</td>
          <td style="padding: 8px 0; color: #1e293b;">${name}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold; color: #334155;">Email:</td>
          <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #0891b2;">${email}</a></td>
        </tr>
        ${phone ? `<tr>
          <td style="padding: 8px 0; font-weight: bold; color: #334155;">Phone:</td>
          <td style="padding: 8px 0;"><a href="tel:${phone}" style="color: #0891b2;">${phone}</a></td>
        </tr>` : ''}
        ${farmSize ? `<tr>
          <td style="padding: 8px 0; font-weight: bold; color: #334155;">Farm Size:</td>
          <td style="padding: 8px 0; color: #1e293b;">${farmSizeLabel[farmSize] || farmSize}</td>
        </tr>` : ''}
        ${inquiryType ? `<tr>
          <td style="padding: 8px 0; font-weight: bold; color: #334155;">Type:</td>
          <td style="padding: 8px 0;"><span style="background: #0891b2; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${inquiryType}</span></td>
        </tr>` : ''}
      </table>
      <div style="margin-top: 16px; padding: 16px; background: #f1f5f9; border-radius: 8px;">
        <h3 style="margin: 0 0 8px 0; color: #334155;">Message:</h3>
        <p style="margin: 0; color: #475569; white-space: pre-wrap;">${message}</p>
      </div>
      <p style="margin-top: 20px; font-size: 12px; color: #94a3b8;">
        Sent from Mushroom Ki Mandi contact form at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Mushroom Ki Mandi" <${process.env.GMAIL_USER}>`,
      to: process.env.CONTACT_TO_EMAIL || process.env.GMAIL_USER,
      replyTo: email,
      subject: `[MKM ${inquiryType || 'Contact'}] ${name} - ${farmSize ? farmSizeLabel[farmSize] || farmSize : 'General Inquiry'}`,
      html: htmlBody,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Email send error:', error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
