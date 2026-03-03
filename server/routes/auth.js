'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const router = express.Router();

const config = require('../config');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { generateOTP, hashOTP, verifyOTP } = require('../utils/otp');
const { sendOTP } = require('../utils/email');
const authMiddleware = require('../middleware/auth');

async function verifyCaptcha(token) {
  if (!config.recaptchaSecret || !token) return false;
  try {
    const { data } = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      { params: { secret: config.recaptchaSecret, response: token } }
    );
    return data.success === true;
  } catch {
    return false;
  }
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

function safeUser(u) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, is_active: u.is_active };
}

// POST /api/auth/register/request
router.post('/register/request', async (req, res, next) => {
  try {
    const { email, name, captchaToken } = req.body;
    if (!email || !name) return res.status(400).json({ error: 'email and name are required' });

    const captchaOk = await verifyCaptcha(captchaToken);
    if (!captchaOk) return res.status(400).json({ error: 'CAPTCHA verification failed' });

    let user = await User.findByEmail(email);
    if (user && user.is_active) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    if (!user) {
      const role = req.body.role && ['admin', 'maker', 'checker'].includes(req.body.role)
        ? req.body.role : 'maker';
      user = await User.create({ email, name, role });
    }

    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await User.setOTP(user.id, otpHash, otpExpires);

    await sendOTP(email, otp);
    res.json({ message: 'OTP sent to ' + email });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/register/verify
router.post('/register/verify', async (req, res, next) => {
  try {
    const { email, otp, password } = req.body;
    if (!email || !otp || !password) {
      return res.status(400).json({ error: 'email, otp, and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const user = await User.findByEmail(email);
    if (!user) return res.status(400).json({ error: 'Invalid request' });
    if (!user.otp_hash || !user.otp_expires) {
      return res.status(400).json({ error: 'No pending OTP — request a new one' });
    }
    if (new Date() > new Date(user.otp_expires)) {
      return res.status(400).json({ error: 'OTP has expired — request a new one' });
    }

    const valid = await verifyOTP(otp, user.otp_hash);
    if (!valid) return res.status(400).json({ error: 'Incorrect OTP' });

    const passwordHash = await bcrypt.hash(password, 12);
    await User.activateWithPassword(user.id, passwordHash);

    const fresh = await User.findById(user.id);
    const token = signToken(fresh);

    await AuditLog.log({
      userId: fresh.id, userEmail: fresh.email, userRole: fresh.role,
      action: 'register', ip: req.ip,
    });

    res.json({ token, user: safeUser(fresh) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password, captchaToken } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

    const captchaOk = await verifyCaptcha(captchaToken);
    if (!captchaOk) return res.status(400).json({ error: 'CAPTCHA verification failed' });

    const user = await User.findByEmail(email);
    if (!user || !user.is_active || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials or account not activated' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);

    await AuditLog.log({
      userId: user.id, userEmail: user.email, userRole: user.role,
      action: 'login', ip: req.ip,
    });

    res.json({ token, user: safeUser(user) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.is_active) return res.status(401).json({ error: 'Account not found' });
    res.json({ user: safeUser(user) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
