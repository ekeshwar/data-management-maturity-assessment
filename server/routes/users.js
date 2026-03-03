'use strict';
const express = require('express');
const router = express.Router();

const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const authMiddleware = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const { generateOTP, hashOTP } = require('../utils/otp');
const { sendOTP } = require('../utils/email');

// All /api/users routes require a valid JWT
router.use(authMiddleware);

function safeUser(u) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, is_active: u.is_active };
}

// GET /api/users — list all (admin only)
router.get('/', rbac('admin'), async (req, res, next) => {
  try {
    const users = await User.listAll();
    res.json({ users: users.map(safeUser) });
  } catch (err) {
    next(err);
  }
});

// POST /api/users/invite — create user + send OTP (admin only)
router.post('/invite', rbac('admin'), async (req, res, next) => {
  try {
    const { email, name, role } = req.body;
    if (!email || !name) return res.status(400).json({ error: 'email and name are required' });

    const validRoles = ['admin', 'maker', 'checker'];
    const assignRole = validRoles.includes(role) ? role : 'maker';

    let user = await User.findByEmail(email);
    if (user && user.is_active) {
      return res.status(409).json({ error: 'User already exists and is active' });
    }

    if (!user) {
      user = await User.create({ email, name, role: assignRole });
    }

    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await User.setOTP(user.id, otpHash, otpExpires);
    await sendOTP(email, otp);

    await AuditLog.log({
      userId: req.user.id, userEmail: req.user.email, userRole: req.user.role,
      action: 'invite_user', entityType: 'user', entityId: user.id,
      detail: { invitedEmail: email, role: assignRole }, ip: req.ip,
    });

    res.status(201).json({ message: 'Invitation sent', user: safeUser(user) });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id/role — change role (admin only)
router.patch('/:id/role', rbac('admin'), async (req, res, next) => {
  try {
    const { role } = req.body;
    const validRoles = ['admin', 'maker', 'checker'];
    if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });

    const user = await User.updateRole(parseInt(req.params.id, 10), role);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await AuditLog.log({
      userId: req.user.id, userEmail: req.user.email, userRole: req.user.role,
      action: 'update_role', entityType: 'user', entityId: user.id,
      detail: { newRole: role }, ip: req.ip,
    });

    res.json({ user: safeUser(user) });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id/active — activate/deactivate (admin only)
router.patch('/:id/active', rbac('admin'), async (req, res, next) => {
  try {
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') return res.status(400).json({ error: 'is_active must be boolean' });

    const user = await User.updateActive(parseInt(req.params.id, 10), is_active);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await AuditLog.log({
      userId: req.user.id, userEmail: req.user.email, userRole: req.user.role,
      action: is_active ? 'activate_user' : 'deactivate_user',
      entityType: 'user', entityId: user.id, ip: req.ip,
    });

    res.json({ user: safeUser(user) });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id/access — list client/master access (admin only)
router.get('/:id/access', rbac('admin'), async (req, res, next) => {
  try {
    const access = await User.getAccess(parseInt(req.params.id, 10));
    res.json({ access });
  } catch (err) {
    next(err);
  }
});

// POST /api/users/:id/access — grant access (admin only)
router.post('/:id/access', rbac('admin'), async (req, res, next) => {
  try {
    const { client_name, master_name } = req.body;
    if (!client_name) return res.status(400).json({ error: 'client_name is required' });

    const record = await User.grantAccess(
      parseInt(req.params.id, 10),
      client_name,
      master_name || '*'
    );

    await AuditLog.log({
      userId: req.user.id, userEmail: req.user.email, userRole: req.user.role,
      action: 'grant_access', entityType: 'user', entityId: parseInt(req.params.id, 10),
      detail: { client_name, master_name: master_name || '*' }, ip: req.ip,
    });

    res.status(201).json({ access: record });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id/access/:aid — revoke access (admin only)
router.delete('/:id/access/:aid', rbac('admin'), async (req, res, next) => {
  try {
    await User.revokeAccess(parseInt(req.params.aid, 10), parseInt(req.params.id, 10));

    await AuditLog.log({
      userId: req.user.id, userEmail: req.user.email, userRole: req.user.role,
      action: 'revoke_access', entityType: 'user', entityId: parseInt(req.params.id, 10),
      detail: { accessId: parseInt(req.params.aid, 10) }, ip: req.ip,
    });

    res.json({ message: 'Access revoked' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
