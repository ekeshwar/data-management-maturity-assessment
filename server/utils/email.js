'use strict';
const nodemailer = require('nodemailer');
const config = require('../config');

function createTransport() {
  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });
}

async function sendOTP(toEmail, otp) {
  const transport = createTransport();
  await transport.sendMail({
    from: config.smtp.from,
    to: toEmail,
    subject: 'Your EDM Platform verification code',
    html: `
      <div style="font-family:Montserrat,Arial,sans-serif;max-width:480px;margin:0 auto;background:#FAF2F7;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#482A7A 0%,#B31F7E 100%);padding:28px 32px;">
          <h2 style="color:#fff;margin:0;font-size:1.3rem;font-weight:700;">EDM Platform</h2>
          <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:0.82rem;">Enterprise Data Management</p>
        </div>
        <div style="padding:32px;">
          <p style="color:#334;font-size:0.95rem;margin:0 0 18px;">Your one-time verification code is:</p>
          <div style="background:#482A7A;color:#fff;font-size:2.2rem;font-weight:800;letter-spacing:0.18em;text-align:center;border-radius:10px;padding:18px 0;margin-bottom:18px;">
            ${otp}
          </div>
          <p style="color:#667;font-size:0.82rem;margin:0;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
        </div>
      </div>
    `,
  });
}

module.exports = { sendOTP };
