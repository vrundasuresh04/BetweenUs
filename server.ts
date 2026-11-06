import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { db } from './server/db.ts';
import { calculatePGS, type AssessmentRatings } from './src/utils/pgs.ts';
import { analyzeCommunication } from './src/utils/communicationIntelligence.ts';
import { classifyEmotion } from './src/utils/nlpClassifier.ts';
import { queryHadoopResults, getHadoopCouple, getHadoopSummary } from './server/hadoopResults.ts';

const execFileAsync = promisify(execFile);

const JWT_SECRET = process.env.JWT_SECRET || 'betweenus-jwt-secret-key-2026-mca-bda';
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

const app = express();
app.use(express.json({ limit: '1mb' }));

// ----------------------------------------------------
// SECURITY HEADERS, CORS & RATE LIMITING
// ----------------------------------------------------

app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// In-memory sliding-window rate limiter
const ipRateLimits = new Map<string, { count: number; resetTime: number }>();

function rateLimiter(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = ipRateLimits.get(ip);

    if (!entry || now > entry.resetTime) {
      ipRateLimits.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Please wait a moment before trying again.'
      });
    }

    entry.count++;
    return next();
  };
}

// Health check with comprehensive component diagnostics
app.get('/api/health', (_req: Request, res: Response) => {
  let dbStatus = 'ok';
  let userCount = 0;
  let coupleCount = 0;
  try {
    userCount = (db.prepare('SELECT count(*) as c FROM users').get() as any)?.c || 0;
    coupleCount = (db.prepare('SELECT count(*) as c FROM couples').get() as any)?.c || 0;
  } catch {
    dbStatus = 'error';
  }

  const modelPath = path.resolve(process.cwd(), 'results/nlp_model_artifact.json');
  const hadoopPath = path.resolve(process.cwd(), 'results/hadoop_pgs_results.tsv');

  return res.json({
    status: 'ok',
    server: 'BetweenUs',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    components: {
      database: { status: dbStatus, registeredUsers: userCount, activeCouples: coupleCount },
      nlp_model: { status: fs.existsSync(modelPath) ? 'loaded' : 'missing' },
      hadoop_results: { status: fs.existsSync(hadoopPath) ? 'available' : 'missing' }
    }
  });
});

// Helper: JWT verification middleware
interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  });
}

// ----------------------------------------------------
// 1. AUTHENTICATION ROUTES
// ----------------------------------------------------

app.post('/api/auth/register', rateLimiter(30, 60 * 1000), (req: Request, res: Response) => {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);
    const userId = 'usr_' + crypto.randomUUID().slice(0, 8);
    const avatarColors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];
    const avatar_color = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    db.prepare(`
      INSERT INTO users (id, full_name, email, password_hash, avatar_color)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, full_name.trim(), email.toLowerCase().trim(), password_hash, avatar_color);

    const token = jwt.sign({ userId, email: email.toLowerCase().trim() }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: userId,
        full_name: full_name.trim(),
        email: email.toLowerCase().trim(),
        avatar_color
      }
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
});

app.post('/api/auth/login', rateLimiter(30, 60 * 1000), (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        avatar_color: user.avatar_color
      }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

const handleGetMe = (req: AuthRequest, res: Response) => {
  try {
    const user: any = db.prepare('SELECT id, full_name, email, avatar_color, created_at FROM users WHERE id = ?').get(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Look for active couple
    const couple: any = db.prepare(`
      SELECT c.*, 
        uA.full_name as partner_a_name, uA.email as partner_a_email, uA.avatar_color as partner_a_avatar,
        uB.full_name as partner_b_name, uB.email as partner_b_email, uB.avatar_color as partner_b_avatar
      FROM couples c
      JOIN users uA ON c.partner_a_id = uA.id
      JOIN users uB ON c.partner_b_id = uB.id
      WHERE (c.partner_a_id = ? OR c.partner_b_id = ?) AND c.status = 'active'
    `).get(req.userId, req.userId);

    let partnerInfo = null;
    if (couple) {
      const isPartnerA = couple.partner_a_id === req.userId;
      partnerInfo = {
        id: isPartnerA ? couple.partner_b_id : couple.partner_a_id,
        full_name: isPartnerA ? couple.partner_b_name : couple.partner_a_name,
        email: isPartnerA ? couple.partner_b_email : couple.partner_a_email,
        avatar_color: isPartnerA ? couple.partner_b_avatar : couple.partner_a_avatar
      };
    }

    return res.json({
      user,
      couple: couple ? { id: couple.id, created_at: couple.created_at } : null,
      partner: partnerInfo
    });
  } catch (err: any) {
    console.error('Me error:', err);
    return res.status(500).json({ error: 'Failed to retrieve user profile' });
  }
};

app.get('/api/auth/me', authenticateToken, handleGetMe);
app.get('/api/me', authenticateToken, handleGetMe);

// ----------------------------------------------------
// 2. PARTNER CONNECTION ROUTES (EMAIL-BASED REQUESTS)
// ----------------------------------------------------

// Find registered user by exact email
app.get('/api/partner/find', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const searchEmail = (req.query.email as string || '').toLowerCase().trim();

    if (!searchEmail) {
      return res.status(400).json({ error: 'Please enter an email address to find' });
    }

    if (searchEmail === req.userEmail?.toLowerCase()) {
      return res.status(400).json({ error: 'You cannot connect with your own email address' });
    }

    // Check if caller is already linked
    const activeCouple = db.prepare(`
      SELECT id FROM couples WHERE (partner_a_id = ? OR partner_b_id = ?) AND status = 'active'
    `).get(userId, userId);

    if (activeCouple) {
      return res.status(400).json({ error: 'You are already connected with a partner. Unlink first to connect with someone else.' });
    }

    const targetUser: any = db.prepare('SELECT id, full_name, email, avatar_color FROM users WHERE email = ?').get(searchEmail);
    if (!targetUser) {
      return res.status(404).json({ error: 'No registered user found with this exact email address.' });
    }

    // Check if target user is already linked with someone
    const targetCouple = db.prepare(`
      SELECT id FROM couples WHERE (partner_a_id = ? OR partner_b_id = ?) AND status = 'active'
    `).get(targetUser.id, targetUser.id);

    // Check if there is an existing pending request
    const pendingRequest: any = db.prepare(`
      SELECT * FROM connection_requests 
      WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
        AND status = 'pending'
    `).get(userId, targetUser.id, targetUser.id, userId);

    return res.json({
      user: targetUser,
      already_linked: !!targetCouple,
      existing_request: pendingRequest ? {
        id: pendingRequest.id,
        is_incoming: pendingRequest.receiver_id === userId,
        status: pendingRequest.status,
        created_at: pendingRequest.created_at
      } : null
    });
  } catch (err: any) {
    console.error('Find partner error:', err);
    return res.status(500).json({ error: 'Failed to search for user' });
  }
});

// Send connection request
app.post('/api/partner/request', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Recipient email is required' });
    }

    const targetEmail = email.toLowerCase().trim();
    if (targetEmail === req.userEmail?.toLowerCase()) {
      return res.status(400).json({ error: 'You cannot connect with your own email address' });
    }

    // Check if caller is already linked
    const activeCouple = db.prepare(`
      SELECT id FROM couples WHERE (partner_a_id = ? OR partner_b_id = ?) AND status = 'active'
    `).get(userId, userId);

    if (activeCouple) {
      return res.status(400).json({ error: 'You are already linked with a partner.' });
    }

    const targetUser: any = db.prepare('SELECT id, full_name, email, avatar_color FROM users WHERE email = ?').get(targetEmail);
    if (!targetUser) {
      return res.status(404).json({ error: 'No registered user found with this exact email address.' });
    }

    // Check if target user is already linked
    const targetCouple = db.prepare(`
      SELECT id FROM couples WHERE (partner_a_id = ? OR partner_b_id = ?) AND status = 'active'
    `).get(targetUser.id, targetUser.id);

    if (targetCouple) {
      return res.status(400).json({ error: 'This user is already connected with another partner.' });
    }

    // Check if caller already sent a pending request
    const existingOut: any = db.prepare(`
      SELECT * FROM connection_requests WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'
    `).get(userId, targetUser.id);

    if (existingOut) {
      return res.status(400).json({ error: 'A connection request has already been sent to this user.' });
    }

    // Check if target user already sent a pending request to caller -> mutual auto-accept
    const existingIn: any = db.prepare(`
      SELECT * FROM connection_requests WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'
    `).get(targetUser.id, userId);

    if (existingIn) {
      const coupleId = 'cpl_' + crypto.randomUUID().slice(0, 8);
      db.prepare(`
        INSERT INTO couples (id, partner_a_id, partner_b_id, status)
        VALUES (?, ?, ?, 'active')
      `).run(coupleId, targetUser.id, userId);

      db.prepare("UPDATE connection_requests SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(existingIn.id);

      return res.json({
        message: 'Mutual connection request detected. You are now linked!',
        connected: true,
        coupleId,
        partner: targetUser
      });
    }

    const reqId = 'req_' + crypto.randomUUID().slice(0, 8);
    db.prepare(`
      INSERT INTO connection_requests (id, sender_id, receiver_id, status)
      VALUES (?, ?, ?, 'pending')
    `).run(reqId, userId, targetUser.id);

    return res.status(201).json({
      success: true,
      message: `Connection request sent to ${targetUser.full_name}`,
      requestId: reqId,
      request_id: reqId,
      targetUser
    });
  } catch (err: any) {
    console.error('Send request error:', err);
    return res.status(500).json({ error: 'Failed to send connection request' });
  }
});

// Get incoming and outgoing connection requests
app.get('/api/partner/requests', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const incoming = db.prepare(`
      SELECT cr.id, cr.status, cr.created_at,
             u.id as user_id, u.full_name, u.email, u.avatar_color,
             u.full_name as sender_name, u.email as sender_email, u.avatar_color as sender_avatar_color
      FROM connection_requests cr
      JOIN users u ON cr.sender_id = u.id
      WHERE cr.receiver_id = ? AND cr.status = 'pending'
      ORDER BY cr.created_at DESC
    `).all(userId);

    const outgoing = db.prepare(`
      SELECT cr.id, cr.status, cr.created_at,
             u.id as user_id, u.full_name, u.email, u.avatar_color,
             u.full_name as recipient_name, u.email as recipient_email, u.avatar_color as recipient_avatar_color
      FROM connection_requests cr
      JOIN users u ON cr.receiver_id = u.id
      WHERE cr.sender_id = ? AND cr.status = 'pending'
      ORDER BY cr.created_at DESC
    `).all(userId);

    return res.json({ incoming, outgoing });
  } catch (err: any) {
    console.error('Fetch requests error:', err);
    return res.status(500).json({ error: 'Failed to retrieve connection requests' });
  }
});

// Accept connection request
app.post('/api/partner/request/:id/accept', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const requestId = req.params.id;

    const request: any = db.prepare(`
      SELECT * FROM connection_requests WHERE id = ? AND receiver_id = ? AND status = 'pending'
    `).get(requestId, userId);

    if (!request) {
      return res.status(404).json({ error: 'Connection request not found or already processed' });
    }

    const callerCouple = db.prepare(`
      SELECT id FROM couples WHERE (partner_a_id = ? OR partner_b_id = ?) AND status = 'active'
    `).get(userId, userId);
    if (callerCouple) {
      return res.status(400).json({ error: 'You are already connected with a partner.' });
    }

    const senderCouple = db.prepare(`
      SELECT id FROM couples WHERE (partner_a_id = ? OR partner_b_id = ?) AND status = 'active'
    `).get(request.sender_id, request.sender_id);
    if (senderCouple) {
      return res.status(400).json({ error: 'The sender is already connected with another partner.' });
    }

    const coupleId = 'cpl_' + crypto.randomUUID().slice(0, 8);
    db.prepare(`
      INSERT INTO couples (id, partner_a_id, partner_b_id, status)
      VALUES (?, ?, ?, 'active')
    `).run(coupleId, request.sender_id, userId);

    db.prepare("UPDATE connection_requests SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(requestId);

    // Cancel other pending requests
    db.prepare("UPDATE connection_requests SET status = 'cancelled' WHERE (sender_id = ? OR receiver_id = ? OR sender_id = ? OR receiver_id = ?) AND status = 'pending'").run(userId, userId, request.sender_id, request.sender_id);

    const partner: any = db.prepare('SELECT id, full_name, email, avatar_color FROM users WHERE id = ?').get(request.sender_id);

    return res.json({
      success: true,
      message: `Connected with ${partner.full_name}!`,
      coupleId,
      partner
    });
  } catch (err: any) {
    console.error('Accept request error:', err);
    return res.status(500).json({ error: 'Failed to accept connection request' });
  }
});

// Decline connection request
app.post('/api/partner/request/:id/decline', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const requestId = req.params.id;

    const request: any = db.prepare(`
      SELECT * FROM connection_requests WHERE id = ? AND receiver_id = ? AND status = 'pending'
    `).get(requestId, userId);

    if (!request) {
      return res.status(404).json({ error: 'Connection request not found' });
    }

    db.prepare("UPDATE connection_requests SET status = 'declined', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(requestId);

    return res.json({ success: true, message: 'Connection request declined' });
  } catch (err: any) {
    console.error('Decline request error:', err);
    return res.status(500).json({ error: 'Failed to decline request' });
  }
});

// Cancel outgoing connection request
app.post('/api/partner/request/:id/cancel', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const requestId = req.params.id;

    const request: any = db.prepare(`
      SELECT * FROM connection_requests WHERE id = ? AND sender_id = ? AND status = 'pending'
    `).get(requestId, userId);

    if (!request) {
      return res.status(404).json({ error: 'Connection request not found' });
    }

    db.prepare("UPDATE connection_requests SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(requestId);

    return res.json({ success: true, message: 'Connection request cancelled' });
  } catch (err: any) {
    console.error('Cancel request error:', err);
    return res.status(500).json({ error: 'Failed to cancel request' });
  }
});

app.post('/api/partner/unlink', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const couple: any = db.prepare(`
      SELECT id FROM couples WHERE (partner_a_id = ? OR partner_b_id = ?) AND status = 'active'
    `).get(userId, userId);

    if (!couple) {
      return res.status(400).json({ error: 'No active couple link found' });
    }

    db.prepare("UPDATE couples SET status = 'unlinked' WHERE id = ?").run(couple.id);
    return res.json({ message: 'Couple unlinked successfully' });
  } catch (err: any) {
    console.error('Unlink error:', err);
    return res.status(500).json({ error: 'Failed to unlink' });
  }
});

// ----------------------------------------------------
// 3. TWO-WAY MESSAGING ROUTES
// ----------------------------------------------------

app.get('/api/messages', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const couple: any = db.prepare(`
      SELECT id FROM couples WHERE (partner_a_id = ? OR partner_b_id = ?) AND status = 'active'
    `).get(userId, userId);

    if (!couple) {
      return res.status(403).json({ error: 'You must be linked to view messages' });
    }

    const messages = db.prepare(`
      SELECT m.*, u.full_name as sender_name, u.avatar_color as sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.couple_id = ?
      ORDER BY m.created_at ASC
    `).all(couple.id);

    // Mark messages from the other partner as read
    db.prepare(`
      UPDATE messages SET read_by_recipient = 1 
      WHERE couple_id = ? AND sender_id != ? AND read_by_recipient = 0
    `).run(couple.id, userId);

    return res.json({ messages });
  } catch (err: any) {
    console.error('Fetch messages error:', err);
    return res.status(500).json({ error: 'Failed to load conversation' });
  }
});

app.post('/api/messages', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { text, client_msg_id } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    if (text.length > 2000) {
      return res.status(400).json({ error: 'Message is too long (maximum 2,000 characters)' });
    }

    const couple: any = db.prepare(`
      SELECT id FROM couples WHERE (partner_a_id = ? OR partner_b_id = ?) AND status = 'active'
    `).get(userId, userId);

    if (!couple) {
      return res.status(403).json({ error: 'You must be linked to send messages' });
    }

    // Idempotency check for retried message sends
    if (client_msg_id) {
      const existingMsg: any = db.prepare('SELECT * FROM messages WHERE client_msg_id = ?').get(client_msg_id);
      if (existingMsg) {
        return res.json({ message: existingMsg, deduplicated: true });
      }
    }

    const msgId = 'msg_' + crypto.randomUUID().slice(0, 8);
    const trimmedText = text.trim();

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO messages (id, couple_id, sender_id, text, client_msg_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(msgId, couple.id, userId, trimmedText, client_msg_id || null, now);

    const sender: any = db.prepare('SELECT full_name, avatar_color FROM users WHERE id = ?').get(userId);

    const savedMsg = {
      id: msgId,
      couple_id: couple.id,
      sender_id: userId,
      sender_name: sender.full_name,
      sender_avatar: sender.avatar_color,
      text: trimmedText,
      client_msg_id: client_msg_id || null,
      read_by_recipient: 0,
      created_at: now
    };

    return res.status(201).json({ message: savedMsg });
  } catch (err: any) {
    console.error('Send message error:', err);
    return res.status(500).json({ error: 'Failed to send message' });
  }
});

// Incremental polling endpoint for real-time natural two-way chat sync
app.get('/api/messages/poll', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const after = (req.query.after as string) || (req.query.since as string); // timestamp or id

    const couple: any = db.prepare(`
      SELECT id FROM couples WHERE (partner_a_id = ? OR partner_b_id = ?) AND status = 'active'
    `).get(userId, userId);

    if (!couple) {
      return res.status(403).json({ error: 'Not linked' });
    }

    let newMessages = [];
    if (after) {
      newMessages = db.prepare(`
        SELECT m.*, u.full_name as sender_name, u.avatar_color as sender_avatar
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.couple_id = ? AND m.created_at > ?
        ORDER BY m.created_at ASC
      `).all(couple.id, after);
    } else {
      newMessages = db.prepare(`
        SELECT m.*, u.full_name as sender_name, u.avatar_color as sender_avatar
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.couple_id = ?
        ORDER BY m.created_at ASC
      `).all(couple.id);
    }

    // Mark as read
    db.prepare(`
      UPDATE messages SET read_by_recipient = 1 
      WHERE couple_id = ? AND sender_id != ? AND read_by_recipient = 0
    `).run(couple.id, userId);

    return res.json({ messages: newMessages });
  } catch (err: any) {
    console.error('Poll messages error:', err);
    return res.status(500).json({ error: 'Failed to poll messages' });
  }
});

app.delete('/api/messages/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const messageId = req.params.id;

    const message: any = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const couple: any = db.prepare(`
      SELECT id FROM couples 
      WHERE (partner_a_id = ? OR partner_b_id = ?) AND status = 'active'
    `).get(userId, userId);

    if (!couple || couple.id !== message.couple_id) {
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }

    // Only the author can delete their own message from the shared conversation
    if (message.sender_id !== userId) {
      return res.status(403).json({ error: 'You can only delete messages you sent.' });
    }

    // Delete message from SQLite
    db.prepare('DELETE FROM messages WHERE id = ?').run(messageId);

    // Also clean up any saved analysis associated with this message
    db.prepare('DELETE FROM saved_message_analyses WHERE message_id = ?').run(messageId);

    return res.json({
      success: true,
      message: 'Message permanently deleted from conversation history',
      deletedId: messageId
    });
  } catch (err: any) {
    console.error('Delete message error:', err);
    return res.status(500).json({ error: 'Failed to delete message' });
  }
});

// ----------------------------------------------------
// 4. COMMUNICATION INTELLIGENCE ROUTES
// ----------------------------------------------------

const handleReviewMessage = (req: AuthRequest, res: Response) => {
  try {
    const { text, previous_message } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text to review is required' });
    }

    // 1. Perform restrained, evidence-based communication cue analysis
    const feedback = analyzeCommunication(text, 'sender_review', previous_message);

    // 2. Connect trained GoEmotions NLP Model Artifact for tone observation
    const nlpResult = classifyEmotion(text);
    feedback.nlpEmotion = {
      topEmotion: nlpResult.topEmotion,
      predicted_emotion: nlpResult.topEmotion,
      confidence: nlpResult.confidence,
      isPotentiallyHostileOrDismissive: nlpResult.isPotentiallyHostileOrDismissive,
      is_experimental: true,
      advisoryNote: nlpResult.advisoryNote,
      probabilities: nlpResult.probabilities,
      modelStatus: nlpResult.modelStatus,
    };

    // If hostile/dismissive tone is detected by model, provide conservative non-diagnostic guidance
    if (nlpResult.isPotentiallyHostileOrDismissive && !feedback.constructiveSuggestion && nlpResult.advisoryNote) {
      feedback.constructiveSuggestion = nlpResult.advisoryNote;
    }

    // Optional private log
    const logId = 'cf_' + crypto.randomUUID().slice(0, 8);
    db.prepare(`
      INSERT INTO communication_feedback (id, user_id, input_text, perspective, summary, suggestion)
      VALUES (?, ?, ?, 'sender_review', ?, ?)
    `).run(logId, req.userId!, text, feedback.neutralSummary, feedback.constructiveSuggestion || null);

    return res.json({ feedback });
  } catch (err: any) {
    console.error('Review feedback error:', err);
    return res.status(500).json({ error: 'Failed to generate communication review' });
  }
};

app.post('/api/intelligence/review', authenticateToken, handleReviewMessage);
app.post('/api/intelligence/review-message', authenticateToken, handleReviewMessage);

app.post('/api/intelligence/analyze-reply', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { text, message_id } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Reply text is required' });
    }

    const feedback = analyzeCommunication(text, 'recipient_insight');

    // Attach trained GoEmotions NLP Model Artifact
    const nlpResult = classifyEmotion(text);
    feedback.nlpEmotion = {
      topEmotion: nlpResult.topEmotion,
      confidence: nlpResult.confidence,
      isPotentiallyHostileOrDismissive: nlpResult.isPotentiallyHostileOrDismissive,
      advisoryNote: nlpResult.advisoryNote,
      probabilities: nlpResult.probabilities,
      modelStatus: nlpResult.modelStatus,
    };

    // Optional private log
    const logId = 'cf_' + crypto.randomUUID().slice(0, 8);
    db.prepare(`
      INSERT INTO communication_feedback (id, user_id, message_id, input_text, perspective, summary, suggestion)
      VALUES (?, ?, ?, ?, 'recipient_insight', ?, ?)
    `).run(logId, req.userId!, message_id || null, text, feedback.neutralSummary, feedback.constructiveSuggestion || null);

    return res.json({ feedback });
  } catch (err: any) {
    console.error('Analyze reply error:', err);
    return res.status(500).json({ error: 'Failed to analyze reply' });
  }
});

app.post('/api/intelligence/analyze-message', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Message text is required for analysis' });
    }

    if (text.length > 3000) {
      return res.status(400).json({ error: 'Text too long for analysis' });
    }

    // Run inference with the actual saved trained GoEmotions model artifact
    const result = classifyEmotion(text.trim());

    // Generate balanced, constructive communication observations
    let communicationObservation = '';
    const top = result.topEmotion;

    switch (top) {
      case 'gratitude':
        communicationObservation = 'This message expresses appreciation. Genuine expressions of gratitude reinforce mutual trust and emotional connection.';
        break;
      case 'joy':
      case 'love':
        communicationObservation = 'This message conveys warmth and positive emotional alignment, encouraging an open, safe relational atmosphere.';
        break;
      case 'anger':
      case 'annoyance':
      case 'disapproval':
        communicationObservation = `This phrasing may carry indicators of frustration or tension (${top}). Consider whether pausing or rephrasing with an "I-statement" would prevent unintended defensiveness.`;
        break;
      case 'disgust':
        communicationObservation = 'This wording may convey contempt or sharp criticism. Relational research indicates contempt creates relational distance; focusing on specific observations helps.';
        break;
      case 'sadness':
        communicationObservation = 'This message conveys vulnerability or distress. Acknowledging difficult feelings with empathetic listening helps maintain shared support.';
        break;
      default:
        communicationObservation = 'This phrasing appears largely neutral and informational. Context and tone of voice often shape how neutral messages are interpreted.';
    }

    return res.json({
      success: true,
      text: text.trim(),
      topEmotion: result.topEmotion,
      confidence: result.confidence,
      probabilities: result.probabilities,
      isPotentiallyHostileOrDismissive: result.isPotentiallyHostileOrDismissive,
      advisoryNote: result.advisoryNote,
      observation: communicationObservation,
      communicationObservation,
      modelStatus: result.modelStatus,
      modelArtifact: 'Trained GoEmotions 9-Class Classifier (results/nlp_model_artifact.json)',
      disclosure: 'ML text pattern estimation on GoEmotions Reddit baseline. Not a relationship quality score or intent diagnostic.'
    });
  } catch (err: any) {
    console.error('Analyze message error:', err);
    return res.status(500).json({ error: 'Failed to analyze message' });
  }
});

app.post('/api/intelligence/save-analysis', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { message_id, message_text, top_emotion, confidence, probabilities, observation } = req.body;

    if (!message_text || !top_emotion) {
      return res.status(400).json({ error: 'message_text and top_emotion are required' });
    }

    const couple: any = db.prepare(`
      SELECT id FROM couples WHERE (partner_a_id = ? OR partner_b_id = ?) AND status = 'active'
    `).get(userId, userId);

    if (!couple) {
      return res.status(403).json({ error: 'You must be linked to save emotion insights' });
    }

    const id = 'nla_' + crypto.randomUUID().slice(0, 8);
    const probJson = probabilities ? JSON.stringify(probabilities) : null;

    db.prepare(`
      INSERT INTO saved_message_analyses (id, couple_id, user_id, message_id, message_text, top_emotion, confidence, probabilities_json, observation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      couple.id,
      userId,
      message_id || null,
      message_text.trim(),
      top_emotion,
      Number(confidence) || 0,
      probJson,
      observation || ''
    );

    return res.status(201).json({
      success: true,
      id,
      message: 'Emotion observation saved to couple insights',
      savedAnalysis: {
        id,
        top_emotion,
        confidence: Number(confidence) || 0,
        observation,
        created_at: new Date().toISOString()
      }
    });
  } catch (err: any) {
    console.error('Save analysis error:', err);
    return res.status(500).json({ error: 'Failed to save analysis' });
  }
});

app.get('/api/intelligence/saved-analyses', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const couple: any = db.prepare(`
      SELECT id FROM couples WHERE (partner_a_id = ? OR partner_b_id = ?) AND status = 'active'
    `).get(userId, userId);

    if (!couple) {
      return res.json({ analyses: [] });
    }

    const rows = db.prepare(`
      SELECT a.*, u.full_name as analyzer_name
      FROM saved_message_analyses a
      JOIN users u ON a.user_id = u.id
      WHERE a.couple_id = ?
      ORDER BY a.created_at DESC
    `).all(couple.id);

    const analyses = rows.map((r: any) => ({
      id: r.id,
      message_id: r.message_id,
      message_text: r.message_text,
      top_emotion: r.top_emotion,
      confidence: r.confidence,
      probabilities: r.probabilities_json ? JSON.parse(r.probabilities_json) : {},
      observation: r.observation,
      analyzer_name: r.analyzer_name,
      created_at: r.created_at
    }));

    return res.json({ analyses });
  } catch (err: any) {
    console.error('Get saved analyses error:', err);
    return res.status(500).json({ error: 'Failed to fetch saved analyses' });
  }
});

// ----------------------------------------------------
// 5. REFLECTIONS & PERSPECTIVE GAP SCORE (PGS) ROUTES
// ----------------------------------------------------

app.get('/api/reflections', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const couple: any = db.prepare(`
      SELECT id FROM couples WHERE (partner_a_id = ? OR partner_b_id = ?) AND status = 'active'
    `).get(userId, userId);

    if (!couple) {
      return res.json({ reflections: [] });
    }

    const interactions: any[] = db.prepare(`
      SELECT i.*, u.full_name as creator_name
      FROM interactions i
      JOIN users u ON i.created_by = u.id
      WHERE i.couple_id = ?
      ORDER BY i.created_at DESC
    `).all(couple.id);

    const results = interactions.map(interaction => {
      // Find assessments for this interaction
      const assessments: any[] = db.prepare(`
        SELECT id, user_id, communication, trust, support, conflict, private_notes, created_at
        FROM assessments
        WHERE interaction_id = ?
      `).all(interaction.id);

      const myAssessment = assessments.find(a => a.user_id === userId);
      const partnerAssessment = assessments.find(a => a.user_id !== userId);

      const hasMyAssessment = !!myAssessment;
      const hasPartnerAssessment = !!partnerAssessment;
      const bothCompleted = hasMyAssessment && hasPartnerAssessment;

      let pgsData = null;
      if (bothCompleted) {
        pgsData = calculatePGS(
          {
            communication: myAssessment.communication,
            trust: myAssessment.trust,
            support: myAssessment.support,
            conflict: myAssessment.conflict
          },
          {
            communication: partnerAssessment.communication,
            trust: partnerAssessment.trust,
            support: partnerAssessment.support,
            conflict: partnerAssessment.conflict
          }
        );
      }

      return {
        id: interaction.id,
        title: interaction.title,
        created_at: interaction.created_at,
        created_by: interaction.created_by,
        creator_name: interaction.creator_name,
        hasMyAssessment,
        hasPartnerAssessment,
        bothCompleted,
        myRatings: myAssessment ? {
          communication: myAssessment.communication,
          trust: myAssessment.trust,
          support: myAssessment.support,
          conflict: myAssessment.conflict,
          private_notes: myAssessment.private_notes
        } : null,
        // Partner notes are NEVER shared to preserve strict personal privacy
        partnerRatings: (bothCompleted && partnerAssessment) ? {
          communication: partnerAssessment.communication,
          trust: partnerAssessment.trust,
          support: partnerAssessment.support,
          conflict: partnerAssessment.conflict
        } : null,
        pgs: pgsData
      };
    });

    return res.json({ reflections: results });
  } catch (err: any) {
    console.error('Fetch reflections error:', err);
    return res.status(500).json({ error: 'Failed to retrieve reflection sessions' });
  }
});

app.post('/api/reflections', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { title } = req.body;

    const couple: any = db.prepare(`
      SELECT id FROM couples WHERE (partner_a_id = ? OR partner_b_id = ?) AND status = 'active'
    `).get(userId, userId);

    if (!couple) {
      return res.status(403).json({ error: 'You must be linked with a partner to start a reflection' });
    }

    const sessionTitle = (title && title.trim()) || `Reflection Session on Recent Conversation`;
    const interactionId = 'int_' + crypto.randomUUID().slice(0, 8);

    db.prepare(`
      INSERT INTO interactions (id, couple_id, title, created_by)
      VALUES (?, ?, ?, ?)
    `).run(interactionId, couple.id, sessionTitle, userId);

    return res.status(201).json({
      message: 'Reflection session created',
      sessionId: interactionId,
      interactionId,
      title: sessionTitle
    });
  } catch (err: any) {
    console.error('Create reflection error:', err);
    return res.status(500).json({ error: 'Failed to create reflection' });
  }
});

app.post('/api/reflections/:id/assess', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const interactionId = req.params.id;
    const { communication, trust, support, conflict, private_notes } = req.body;

    const interaction: any = db.prepare('SELECT * FROM interactions WHERE id = ?').get(interactionId);
    if (!interaction) {
      return res.status(404).json({ error: 'Reflection session not found' });
    }

    const couple: any = db.prepare('SELECT * FROM couples WHERE id = ?').get(interaction.couple_id);
    if (!couple || (couple.partner_a_id !== userId && couple.partner_b_id !== userId)) {
      return res.status(403).json({ error: 'Not authorized for this session' });
    }

    // Validate 1-5 scores
    const c = Number(communication);
    const t = Number(trust);
    const s = Number(support);
    const cf = Number(conflict);

    if (![c, t, s, cf].every(val => Number.isInteger(val) && val >= 1 && val <= 5)) {
      return res.status(400).json({ error: 'All 4 ratings must be integers between 1 and 5' });
    }

    const assessmentId = 'asm_' + crypto.randomUUID().slice(0, 8);

    // Upsert assessment
    db.prepare(`
      INSERT INTO assessments (id, interaction_id, couple_id, user_id, communication, trust, support, conflict, private_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(interaction_id, user_id) DO UPDATE SET
        communication = excluded.communication,
        trust = excluded.trust,
        support = excluded.support,
        conflict = excluded.conflict,
        private_notes = excluded.private_notes
    `).run(assessmentId, interactionId, couple.id, userId, c, t, s, cf, private_notes || '');

    // Check if partner has also submitted
    const partnerId = couple.partner_a_id === userId ? couple.partner_b_id : couple.partner_a_id;
    const partnerAssessment: any = db.prepare(`
      SELECT * FROM assessments WHERE interaction_id = ? AND user_id = ?
    `).get(interactionId, partnerId);

    let pgsResult = null;
    if (partnerAssessment) {
      pgsResult = calculatePGS(
        { communication: c, trust: t, support: s, conflict: cf },
        {
          communication: partnerAssessment.communication,
          trust: partnerAssessment.trust,
          support: partnerAssessment.support,
          conflict: partnerAssessment.conflict
        }
      );

      // Save analytics snapshot
      const snapId = 'snap_' + crypto.randomUUID().slice(0, 8);
      const gapComm = Math.abs(c - partnerAssessment.communication);
      const gapTrust = Math.abs(t - partnerAssessment.trust);
      const gapSupp = Math.abs(s - partnerAssessment.support);
      const gapConf = Math.abs(cf - partnerAssessment.conflict);

      // Delete any previous snapshot for this interaction to prevent duplicate rows upon re-assessment
      db.prepare('DELETE FROM analytics_snapshots WHERE interaction_id = ?').run(interactionId);

      db.prepare(`
        INSERT INTO analytics_snapshots (id, couple_id, interaction_id, pgs_score, gap_communication, gap_trust, gap_support, gap_conflict)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(snapId, couple.id, interactionId, pgsResult.pgs, gapComm, gapTrust, gapSupp, gapConf);
    }

    return res.json({
      message: 'Assessment submitted successfully',
      bothCompleted: !!partnerAssessment,
      pgs: pgsResult
    });
  } catch (err: any) {
    console.error('Submit assessment error:', err);
    return res.status(500).json({ error: 'Failed to submit assessment' });
  }
});

app.delete('/api/reflections/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const interactionId = req.params.id;

    const interaction: any = db.prepare('SELECT * FROM interactions WHERE id = ?').get(interactionId);
    if (!interaction) {
      return res.status(404).json({ error: 'Reflection session not found' });
    }

    const couple: any = db.prepare('SELECT * FROM couples WHERE id = ?').get(interaction.couple_id);
    if (!couple || (couple.partner_a_id !== userId && couple.partner_b_id !== userId)) {
      return res.status(403).json({ error: 'Not authorized for this session' });
    }

    // Check assessments
    const myAssessment = db.prepare('SELECT id FROM assessments WHERE interaction_id = ? AND user_id = ?').get(interactionId, userId);
    const partnerId = couple.partner_a_id === userId ? couple.partner_b_id : couple.partner_a_id;
    const partnerAssessment = db.prepare('SELECT id FROM assessments WHERE interaction_id = ? AND user_id = ?').get(interactionId, partnerId);

    // Rule: "Do not allow users to delete another person's independent reflections."
    if (myAssessment) {
      // Remove user's assessment and clean analytics snapshot since both are no longer complete
      db.prepare('DELETE FROM assessments WHERE interaction_id = ? AND user_id = ?').run(interactionId, userId);
      db.prepare('DELETE FROM analytics_snapshots WHERE interaction_id = ?').run(interactionId);

      // If partner has no assessment and caller was the creator, clean up the interaction record too
      if (!partnerAssessment && interaction.created_by === userId) {
        db.prepare('DELETE FROM interactions WHERE id = ?').run(interactionId);
      }

      return res.json({
        success: true,
        message: 'Your reflection assessment has been withdrawn. Your partner\'s independent submission remains safely preserved.',
        interactionId,
        withdrawn: true
      });
    } else if (interaction.created_by === userId && !partnerAssessment) {
      // Creator deleting a session where neither partner submitted ratings yet
      db.prepare('DELETE FROM interactions WHERE id = ?').run(interactionId);
      return res.json({
        success: true,
        message: 'Pending reflection session deleted',
        interactionId,
        deleted: true
      });
    } else {
      return res.status(400).json({
        error: 'You do not have a submitted assessment in this session to withdraw, and you cannot delete your partner\'s independent reflection.'
      });
    }
  } catch (err: any) {
    console.error('Delete reflection error:', err);
    return res.status(500).json({ error: 'Failed to delete reflection record' });
  }
});

// ----------------------------------------------------
// 6. ANALYTICS & INSIGHTS ROUTES
// ----------------------------------------------------

app.get('/api/analytics', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const couple: any = db.prepare(`
      SELECT id FROM couples WHERE (partner_a_id = ? OR partner_b_id = ?) AND status = 'active'
    `).get(userId, userId);

    if (!couple) {
      return res.json({
        totalSessions: 0,
        pendingSessions: 0,
        currentPgs: null,
        averagePgs: null,
        snapshots: [],
        dimensionAverages: null,
        emotionInsights: null,
        status: 'unlinked'
      });
    }

    const snapshots: any[] = db.prepare(`
      SELECT a.*, i.title as interaction_title
      FROM analytics_snapshots a
      JOIN interactions i ON a.interaction_id = i.id
      WHERE a.couple_id = ?
      ORDER BY a.created_at ASC
    `).all(couple.id);

    // Count pending reflections (sessions where 1 or 0 partners have submitted)
    const pendingCountRow: any = db.prepare(`
      SELECT count(*) as count FROM interactions 
      WHERE couple_id = ? AND id NOT IN (SELECT interaction_id FROM analytics_snapshots WHERE couple_id = ?)
    `).get(couple.id, couple.id);
    const pendingSessions = pendingCountRow?.count || 0;

    // ML emotion insights from saved_message_analyses (Change 3)
    const savedAnalyses: any[] = db.prepare(`
      SELECT * FROM saved_message_analyses WHERE couple_id = ? ORDER BY created_at DESC
    `).all(couple.id);

    let emotionInsights = null;
    if (savedAnalyses.length > 0) {
      const counts: Record<string, number> = {};
      for (const a of savedAnalyses) {
        counts[a.top_emotion] = (counts[a.top_emotion] || 0) + 1;
      }
      emotionInsights = {
        totalAnalyzed: savedAnalyses.length,
        emotionCounts: counts,
        recentObservations: savedAnalyses.slice(0, 6).map(a => ({
          id: a.id,
          message_id: a.message_id,
          message_text: a.message_text,
          top_emotion: a.top_emotion,
          confidence: a.confidence,
          observation: a.observation,
          created_at: a.created_at
        }))
      };
    }

    let currentPgs = null;
    let avgPgs = null;
    let dimensionAverages = null;

    if (snapshots.length > 0) {
      currentPgs = Math.round(snapshots[snapshots.length - 1].pgs_score * 100) / 100;
      const totalPgs = snapshots.reduce((sum: number, s: any) => sum + s.pgs_score, 0);
      avgPgs = Math.round((totalPgs / snapshots.length) * 100) / 100;

      const avgComm = Math.round((snapshots.reduce((sum: number, s: any) => sum + s.gap_communication, 0) / snapshots.length) * 100) / 100;
      const avgTrust = Math.round((snapshots.reduce((sum: number, s: any) => sum + s.gap_trust, 0) / snapshots.length) * 100) / 100;
      const avgSupp = Math.round((snapshots.reduce((sum: number, s: any) => sum + s.gap_support, 0) / snapshots.length) * 100) / 100;
      const avgConf = Math.round((snapshots.reduce((sum: number, s: any) => sum + s.gap_conflict, 0) / snapshots.length) * 100) / 100;

      dimensionAverages = {
        communication_gap: avgComm,
        trust_gap: avgTrust,
        support_gap: avgSupp,
        conflict_gap: avgConf
      };
    }

    const summaryPath = path.resolve(process.cwd(), 'results/relationship_summary.json');
    let baselineBenchmark = null;
    if (fs.existsSync(summaryPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
        baselineBenchmark = {
          mean_pgs: parsed.mean_pgs,
          paired_interactions: parsed.paired_interactions,
          dataset_source: parsed.dataset_source,
          mapreduce_mode: parsed.mapreduce_mode,
          interaction_types: parsed.interaction_types
        };
      } catch {}
    }

    return res.json({
      totalSessions: snapshots.length,
      pendingSessions,
      currentPgs,
      averagePgs: avgPgs,
      snapshots,
      dimensionAverages,
      emotionInsights,
      baselineBenchmark
    });
  } catch (err: any) {
    console.error('Analytics error:', err);
    return res.status(500).json({ error: 'Failed to load analytics' });
  }
});

// ----------------------------------------------------
// 7. BIG DATA & ML STUDIO ROUTES (MCA PROJECT VIEW)
// ----------------------------------------------------

app.get('/api/bigdata/validate', async (req: Request, res: Response) => {
  try {
    const csvPath = path.resolve(process.cwd(), 'data/sample_interactions_1000.csv');
    if (!fs.existsSync(csvPath)) {
      // Auto-generate sample fixture if missing
      await execFileAsync('python3', ['hadoop/prepare_dataset.py', 'data/sample_interactions_1000.csv', '50', '10']);
    }

    const { stdout } = await execFileAsync('python3', ['hadoop/validate_dataset.py', csvPath]);
    const parsed = JSON.parse(stdout);
    return res.json(parsed);
  } catch (err: any) {
    console.error('Validate dataset error:', err);
    return res.status(500).json({ error: 'Failed to run dataset validator script' });
  }
});

app.post('/api/bigdata/mapreduce-run', async (req: Request, res: Response) => {
  try {
    const inputPath = 'data/sample_interactions_1000.csv';
    const outputDir = 'output/hadoop_results';

    const { stdout, stderr } = await execFileAsync('bash', ['hadoop/run_hadoop.sh', 'local', inputPath, outputDir]);

    // Read top 10 emitted records from output/hadoop_results/part-00000.tsv
    const partPath = path.resolve(process.cwd(), `${outputDir}/part-00000.tsv`);
    let records: any[] = [];
    if (fs.existsSync(partPath)) {
      const content = fs.readFileSync(partPath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      records = lines.slice(0, 15).map(line => {
        const [couple_id, jsonStr] = line.split('\t');
        try {
          return JSON.parse(jsonStr);
        } catch {
          return { couple_id, raw: line };
        }
      });
    }

    return res.json({
      status: 'success',
      execution_log: stdout,
      total_records_processed: records.length,
      sample_records: records
    });
  } catch (err: any) {
    console.error('Mapreduce error:', err);
    return res.status(500).json({ error: 'Failed to execute MapReduce pipeline' });
  }
});

app.get('/api/ml/metrics', (req: Request, res: Response) => {
  try {
    const evalPath = path.resolve(process.cwd(), 'output/ml_evaluation.json');
    if (fs.existsSync(evalPath)) {
      const content = fs.readFileSync(evalPath, 'utf-8');
      return res.json(JSON.parse(content));
    }

    return res.status(404).json({ error: 'Model evaluation has not been run yet.' });
  } catch (err: any) {
    console.error('ML metrics error:', err);
    return res.status(500).json({ error: 'Failed to load ML metrics' });
  }
});

// ----------------------------------------------------
// 7B. VERIFIED APACHE HADOOP MAPREDUCE OFFLINE ROUTES
// ----------------------------------------------------

const handleGetHadoopResults = (req: Request, res: Response) => {
  try {
    const page = req.query.page ? parseInt(String(req.query.page), 10) : undefined;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    const couple_id = req.query.couple_id ? String(req.query.couple_id) : undefined;
    const sort = req.query.sort as any;

    const data = queryHadoopResults({ page, limit, search, couple_id, sort });
    return res.json(data);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return res.status(404).json({
        error: err.message || 'Verified Apache Hadoop output file not found at results/hadoop_pgs_results.tsv',
        filePath: 'results/hadoop_pgs_results.tsv'
      });
    }
    console.error('Error serving Hadoop results:', err);
    return res.status(500).json({ error: 'Internal server error processing Hadoop results' });
  }
};

app.get('/api/hadoop/results', handleGetHadoopResults);
app.get('/api/bigdata/hadoop-results', handleGetHadoopResults);
app.get('/api/baseline/hadoop-results', handleGetHadoopResults);

const handleGetHadoopSummary = (_req: Request, res: Response) => {
  try {
    const summary = getHadoopSummary();
    return res.json(summary);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return res.status(404).json({
        error: err.message || 'Verified Apache Hadoop output file not found at results/hadoop_pgs_results.tsv',
        filePath: 'results/hadoop_pgs_results.tsv'
      });
    }
    console.error('Error serving Hadoop summary:', err);
    return res.status(500).json({ error: 'Internal server error loading Hadoop summary' });
  }
};

app.get('/api/hadoop/summary', handleGetHadoopSummary);
app.get('/api/bigdata/hadoop-summary', handleGetHadoopSummary);
app.get('/api/baseline/hadoop-summary', handleGetHadoopSummary);

const handleGetHadoopCouple = (req: Request, res: Response) => {
  try {
    const coupleId = req.params.id;
    const couple = getHadoopCouple(coupleId);
    if (!couple) {
      return res.status(404).json({ error: `Couple ${coupleId} not found in Hadoop MapReduce results` });
    }
    return res.json({
      source_file: 'results/hadoop_pgs_results.tsv',
      is_offline_synthetic_hadoop: true,
      disclosure: 'Synthetic offline Apache Hadoop MapReduce analytics. Disconnected from live user reflections and runtime messages.',
      couple
    });
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return res.status(404).json({
        error: err.message || 'Verified Apache Hadoop output file not found at results/hadoop_pgs_results.tsv',
        filePath: 'results/hadoop_pgs_results.tsv'
      });
    }
    console.error('Error serving Hadoop couple:', err);
    return res.status(500).json({ error: 'Internal server error retrieving couple record' });
  }
};

app.get('/api/hadoop/couple/:id', handleGetHadoopCouple);
app.get('/api/bigdata/hadoop-couple/:id', handleGetHadoopCouple);

// ----------------------------------------------------
// 7C. CA3 VERIFIED BASELINE OFFLINE ARTIFACTS ROUTES
// ----------------------------------------------------

app.get('/api/baseline/relationship-summary', (_req: Request, res: Response) => {
  try {
    const p = path.resolve(process.cwd(), 'results/relationship_summary.json');
    if (fs.existsSync(p)) {
      return res.json(JSON.parse(fs.readFileSync(p, 'utf-8')));
    }
    return res.status(404).json({ error: 'Baseline relationship summary not found' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to read relationship summary' });
  }
});

app.get('/api/baseline/pgs-by-type', (_req: Request, res: Response) => {
  try {
    const p = path.resolve(process.cwd(), 'results/pgs_by_interaction_type.csv');
    if (fs.existsSync(p)) {
      const lines = fs.readFileSync(p, 'utf-8').trim().split('\n');
      const data = lines.slice(1).map(l => {
        const [type, count, mean_pgs] = l.split(',');
        return { interaction_type: type, paired_interactions: Number(count), mean_pgs: Number(mean_pgs) };
      });
      return res.json({ interaction_types: data });
    }
    return res.status(404).json({ error: 'PGS by type CSV not found' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to read PGS by type' });
  }
});

app.get('/api/baseline/nlp-metrics', (_req: Request, res: Response) => {
  try {
    const pMetrics = path.resolve(process.cwd(), 'results/nlp_metrics.json');
    const pReport = path.resolve(process.cwd(), 'results/nlp_classification_report.txt');
    let metrics = {};
    let reportText = '';
    if (fs.existsSync(pMetrics)) {
      metrics = JSON.parse(fs.readFileSync(pMetrics, 'utf-8'));
    }
    if (fs.existsSync(pReport)) {
      reportText = fs.readFileSync(pReport, 'utf-8');
    }
    return res.json({ ...metrics, classification_report: reportText });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to read NLP metrics' });
  }
});

app.get('/api/baseline/stress-probes', (_req: Request, res: Response) => {
  try {
    const p = path.resolve(process.cwd(), 'results/nlp_stress_probes.csv');
    if (fs.existsSync(p)) {
      const lines = fs.readFileSync(p, 'utf-8').trim().split('\n');
      const rows = lines.slice(1).map(l => {
        // Parse CSV with quoted text
        const match = l.match(/^"([^"]+)",([^,]+),([^,]+),(.+)$/);
        if (match) {
          return {
            text: match[1],
            predicted_goemotions_label: match[2],
            model_probability: Number(match[3]),
            note: match[4]
          };
        }
        return null;
      }).filter(Boolean);
      return res.json({ probes: rows });
    }
    return res.status(404).json({ error: 'Stress probes not found' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to read stress probes' });
  }
});

app.post('/api/baseline/nlp-classify', (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text to classify is required' });
    }
    const result = classifyEmotion(text);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to classify text emotion' });
  }
});

app.get('/api/baseline/nlp-model-info', (_req: Request, res: Response) => {
  try {
    const p = path.resolve(process.cwd(), 'results/nlp_model_artifact.json');
    if (fs.existsSync(p)) {
      const artifact = JSON.parse(fs.readFileSync(p, 'utf-8'));
      return res.json({
        version: artifact.version,
        architecture: artifact.architecture,
        labels: artifact.labels,
        vocabularySize: Object.keys(artifact.vocabulary).length,
        metrics: artifact.metrics,
        isTrained: true,
        stressProbes: artifact.stress_probes
      });
    }
    return res.status(404).json({ error: 'Model artifact not found' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to read model artifact' });
  }
});

app.get('/api/baseline/structured-ml-status', (_req: Request, res: Response) => {
  try {
    const p = path.resolve(process.cwd(), 'results/structured_ml_warning.txt');
    if (fs.existsSync(p)) {
      const warningText = fs.readFileSync(p, 'utf-8');
      return res.json({
        status: 'PENDING_VALIDATION',
        is_trained: false,
        leakage_warning: warningText.trim(),
        explanation: 'Predicting PGS from component assessment differences constitutes target leakage. A separate future outcome is required before training a valid structured model.'
      });
    }
    return res.status(404).json({ error: 'Structured ML warning not found' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to read structured ML status' });
  }
});

app.post('/api/ml/predict', async (req: Request, res: Response) => {
  try {
    const { prev_avg_pgs, prev_comm_gap, prev_trust_gap, prev_supp_gap, prev_conf_gap, interaction_count } = req.body;
    const args = [
      String(prev_avg_pgs ?? 0.8),
      String(prev_comm_gap ?? 0.5),
      String(prev_trust_gap ?? 0.3),
      String(prev_supp_gap ?? 0.4),
      String(prev_conf_gap ?? 0.6),
      String(interaction_count ?? 5)
    ];

    const { stdout } = await execFileAsync('python3', ['ml/predict.py', ...args]);
    return res.json(JSON.parse(stdout));
  } catch (err: any) {
    console.error('Predict error:', err);
    return res.status(500).json({ error: 'Failed to run prediction inference' });
  }
});

// ----------------------------------------------------
// 8. DUAL-PARTNER DEMO MODE CONTROLLER
// ----------------------------------------------------

app.post('/api/demo/setup-session', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required. Please sign in or register to launch Dual-Partner Demonstration with your authenticated profile.',
        authenticated: false
      });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(403).json({ error: 'Invalid or expired session token', authenticated: false });
    }

    const userA: any = db.prepare('SELECT id, full_name, email, avatar_color FROM users WHERE id = ?').get(decoded.userId);
    if (!userA) {
      return res.status(404).json({ error: 'User profile not found in database', authenticated: false });
    }

    // Find active couple for userA
    const couple: any = db.prepare(`
      SELECT * FROM couples 
      WHERE (partner_a_id = ? OR partner_b_id = ?) AND status = 'active'
    `).get(userA.id, userA.id);

    if (!couple) {
      return res.json({
        isLinked: false,
        coupleId: null,
        partnerA: {
          token,
          user: { id: userA.id, full_name: userA.full_name, email: userA.email, avatar_color: userA.avatar_color }
        },
        partnerB: null,
        message: 'No partner connected. Please connect with your partner via their registered email to enable real dual-partner interaction.'
      });
    }

    const partnerBId = couple.partner_a_id === userA.id ? couple.partner_b_id : couple.partner_a_id;
    const userB: any = db.prepare('SELECT id, full_name, email, avatar_color FROM users WHERE id = ?').get(partnerBId);

    if (!userB) {
      return res.status(404).json({ error: 'Linked partner account record not found' });
    }

    // Authorized token for Partner B
    const tokenB = jwt.sign({ userId: userB.id, email: userB.email }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      isLinked: true,
      coupleId: couple.id,
      partnerA: {
        token,
        user: { id: userA.id, full_name: userA.full_name, email: userA.email, avatar_color: userA.avatar_color }
      },
      partnerB: {
        token: tokenB,
        user: { id: userB.id, full_name: userB.full_name, email: userB.email, avatar_color: userB.avatar_color }
      }
    });
  } catch (err: any) {
    console.error('Demo setup error:', err);
    return res.status(500).json({ error: 'Failed to initialize dual demonstration session' });
  }
});

// Demo/Evaluation direct pair endpoint for two registered accounts
app.post('/api/demo/pair-users', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { partnerEmail } = req.body;

    if (!partnerEmail || !partnerEmail.trim()) {
      return res.status(400).json({ error: 'Partner email is required to pair accounts' });
    }

    const cleanEmail = partnerEmail.toLowerCase().trim();
    if (cleanEmail === req.userEmail?.toLowerCase()) {
      return res.status(400).json({ error: 'You cannot connect with your own email address' });
    }

    const userB: any = db.prepare('SELECT id, full_name, email, avatar_color FROM users WHERE email = ?').get(cleanEmail);
    if (!userB) {
      return res.status(404).json({ error: 'No registered user found with this email. Please register the partner account first.' });
    }

    // Check if either is already linked
    const callerCouple = db.prepare(`
      SELECT id FROM couples WHERE (partner_a_id = ? OR partner_b_id = ?) AND status = 'active'
    `).get(userId, userId);
    if (callerCouple) {
      return res.status(400).json({ error: 'You are already linked with a partner. Unlink first to connect with someone else.' });
    }

    const targetCouple = db.prepare(`
      SELECT id FROM couples WHERE (partner_a_id = ? OR partner_b_id = ?) AND status = 'active'
    `).get(userB.id, userB.id);
    if (targetCouple) {
      return res.status(400).json({ error: 'This user is already connected with another partner.' });
    }

    const coupleId = 'cpl_' + crypto.randomUUID().slice(0, 8);
    db.prepare(`
      INSERT INTO couples (id, partner_a_id, partner_b_id, status)
      VALUES (?, ?, ?, 'active')
    `).run(coupleId, userId, userB.id);

    // Clean any pending requests between them
    db.prepare(`
      UPDATE connection_requests SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
      WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
        AND status = 'pending'
    `).run(userId, userB.id, userB.id, userId);

    const tokenB = jwt.sign({ userId: userB.id, email: userB.email }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      message: `Successfully connected with ${userB.full_name}`,
      coupleId,
      partner: userB,
      partnerToken: tokenB
    });
  } catch (err: any) {
    console.error('Demo pair error:', err);
    return res.status(500).json({ error: 'Failed to pair accounts' });
  }
});

// Clear conversation history for authenticated couple
app.post('/api/demo/clear-chat', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const couple: any = db.prepare(`
      SELECT id FROM couples WHERE (partner_a_id = ? OR partner_b_id = ?) AND status = 'active'
    `).get(userId, userId);

    if (couple) {
      db.prepare('DELETE FROM saved_message_analyses WHERE couple_id = ?').run(couple.id);
      db.prepare('DELETE FROM messages WHERE couple_id = ?').run(couple.id);
      db.prepare('DELETE FROM analytics_snapshots WHERE couple_id = ?').run(couple.id);
      db.prepare('DELETE FROM assessments WHERE couple_id = ?').run(couple.id);
      db.prepare('DELETE FROM interactions WHERE couple_id = ?').run(couple.id);
      return res.json({ message: 'Conversation cleared. Ready for fresh interaction.' });
    } else {
      return res.status(400).json({ error: 'No active couple found to clear conversation.' });
    }
  } catch (err: any) {
    console.error('Clear demo chat error:', err);
    return res.status(500).json({ error: 'Failed to clear conversation' });
  }
});

// ----------------------------------------------------
// 9. VITE DEV SERVER / STATIC SERVING
// ----------------------------------------------------

async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  ➜  Local:   http://localhost:${PORT}/`);
    console.log(`  ➜  Network: http://0.0.0.0:${PORT}/`);
    console.log(`[BetweenUs Full-Stack Server] ready on port ${PORT}\n`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
