const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (_err) {
  nodemailer = null;
}

const HOST = process.env.DASHBOARD_VIEWER_HOST || process.env.CLOUD_MONITOR_HOST || '0.0.0.0';
const PORT = Number(process.env.DASHBOARD_VIEWER_PORT || process.env.CLOUD_MONITOR_PORT || 3011);

const RUNTIME_DIR = process.pkg ? path.dirname(process.execPath) : __dirname;
const DATA_DIR = path.join(RUNTIME_DIR, 'data');
const RELEASES_DIR = path.join(RUNTIME_DIR, 'release-packages');
const CLIENTS_FILE = path.join(DATA_DIR, 'clients.json');
const RELEASES_FILE = path.join(DATA_DIR, 'releases.json');
const AUTH_FILE = path.join(DATA_DIR, 'auth.json');
const FRONTEND_DIR = path.join(RUNTIME_DIR, 'frontend');
const FRONTEND_INDEX = path.join(FRONTEND_DIR, 'index.html');

const MAX_JSON_BODY_BYTES = 1024 * 1024;
const MAX_UPLOAD_BYTES = 1024 * 1024 * 1024;
const AUTH_CODE_TTL_MS = 10 * 60 * 1000;
const _AUTH_SESSION_TTL_MS = Number(
  process.env.DASHBOARD_AUTH_SESSION_TTL_MS || 7 * 24 * 60 * 60 * 1000
);
const AUTH_SESSION_TTL_MS =
  Number.isFinite(_AUTH_SESSION_TTL_MS) && _AUTH_SESSION_TTL_MS > 0
    ? _AUTH_SESSION_TTL_MS
    : 7 * 24 * 60 * 60 * 1000;
const AUTH_MAX_VERIFY_ATTEMPTS = 5;
const AUTH_MIN_RESEND_MS = 30 * 1000;
const AUTH_EMAIL_REGEX = /^[^\s@]+@[^\s@]+$/;
const AUTH_ALLOWED_EMAIL_DOMAIN = 'nolex';

const GMAIL_OAUTH2_USER = 'alerts@nolex.it';
const HARDCODED_GMAIL_OAUTH2 = {
  clientId: 'REDACTED_GOOGLE_OAUTH_CLIENT_ID',
  clientSecret: 'REDACTED_GOOGLE_OAUTH_CLIENT_SECRET',
  refreshToken: 'REDACTED_GOOGLE_OAUTH_REFRESH_TOKEN',
  redirectUrl: 'https://developers.google.com/oauthplayground',
};

let _gmailTransport = null;

function ensureRuntimeFiles() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(RELEASES_DIR, { recursive: true });

  if (!fs.existsSync(CLIENTS_FILE)) {
    fs.writeFileSync(CLIENTS_FILE, JSON.stringify({ clients: {} }, null, 2), 'utf8');
  }

  if (!fs.existsSync(RELEASES_FILE)) {
    fs.writeFileSync(RELEASES_FILE, JSON.stringify({ releases: {} }, null, 2), 'utf8');
  }

  if (!fs.existsSync(AUTH_FILE)) {
    fs.writeFileSync(
      AUTH_FILE,
      JSON.stringify({ pendingCodes: {}, sessions: {}, users: {} }, null, 2),
      'utf8'
    );
  }
}

function readJsonFile(filePath, fallbackValue) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '').trim();
    if (!raw) {
      return fallbackValue;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return fallbackValue;
    }
    return parsed;
  } catch (_err) {
    return fallbackValue;
  }
}

function writeJsonFile(filePath, payload) {
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2), 'utf8');
  fs.renameSync(tempPath, filePath);
}

function readRegistry() {
  ensureRuntimeFiles();
  const payload = readJsonFile(CLIENTS_FILE, { clients: {} });
  if (!payload.clients || typeof payload.clients !== 'object' || Array.isArray(payload.clients)) {
    payload.clients = {};
  }
  return payload;
}

function writeRegistry(registry) {
  ensureRuntimeFiles();
  writeJsonFile(CLIENTS_FILE, registry);
}

function readReleasesRegistry() {
  ensureRuntimeFiles();
  const payload = readJsonFile(RELEASES_FILE, { releases: {} });
  if (!payload.releases || typeof payload.releases !== 'object' || Array.isArray(payload.releases)) {
    payload.releases = {};
  }
  return payload;
}

function writeReleasesRegistry(registry) {
  ensureRuntimeFiles();
  writeJsonFile(RELEASES_FILE, registry);
}

function readAuthRegistry() {
  ensureRuntimeFiles();
  const payload = readJsonFile(AUTH_FILE, {
    pendingCodes: {},
    sessions: {},
    users: {},
  });

  if (!payload.pendingCodes || typeof payload.pendingCodes !== 'object' || Array.isArray(payload.pendingCodes)) {
    payload.pendingCodes = {};
  }
  if (!payload.sessions || typeof payload.sessions !== 'object' || Array.isArray(payload.sessions)) {
    payload.sessions = {};
  }
  if (!payload.users || typeof payload.users !== 'object' || Array.isArray(payload.users)) {
    payload.users = {};
  }

  return payload;
}

function writeAuthRegistry(registry) {
  ensureRuntimeFiles();
  writeJsonFile(AUTH_FILE, registry);
}

function normalizeText(value) {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value).trim();
}

// Chiave AES-256 derivata da env var (o fallback fisso).
// Imposta CLOUD_ENCRYPTION_KEY nell'ambiente per aumentare la sicurezza.
const _ENCRYPTION_KEY = crypto
  .createHash('sha256')
  .update(process.env.CLOUD_ENCRYPTION_KEY || 'nolex-cloud-creds-key-v1-2024!')
  .digest(); // 32 byte

function encryptText(plaintext) {
  if (!plaintext) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', _ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptText(ciphertext) {
  if (!ciphertext) return '';
  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) return ciphertext; // testo in chiaro legacy — restituisci as-is
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const enc = Buffer.from(parts[2], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', _ENCRYPTION_KEY, iv);
    decipher.setAuthTag(tag);
    return decipher.update(enc).toString('utf8') + decipher.final('utf8');
  } catch (_e) {
    return ciphertext; // decifrazione fallita — restituisci as-is (compat. precedente)
  }
}

const POLL_INTERVAL_SEC_MIN = 10;
const POLL_INTERVAL_SEC_MAX = 3600;
const POLL_INTERVAL_SEC_DEFAULT = 60;

function normalizePollIntervalSec(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < POLL_INTERVAL_SEC_MIN) return POLL_INTERVAL_SEC_DEFAULT;
  return Math.min(Math.round(n), POLL_INTERVAL_SEC_MAX);
}

function toCustomerKey(value) {
  return normalizeText(value).toLocaleLowerCase('it');
}

function toReleaseVersion(value) {
  return normalizeText(value);
}

function nowIso() {
  return new Date().toISOString();
}

function createHttpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function hashSha256(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex');
}

function generateOtpCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function isValidEmail(value) {
  return AUTH_EMAIL_REGEX.test(normalizeEmail(value));
}

function isAllowedLoginEmail(value) {
  const normalized = normalizeEmail(value);
  if (!isValidEmail(normalized)) {
    return false;
  }

  const atIndex = normalized.lastIndexOf('@');
  if (atIndex < 0) {
    return false;
  }
  const domain = normalized.slice(atIndex + 1);
  if (!domain) {
    return false;
  }

  return (
    domain === AUTH_ALLOWED_EMAIL_DOMAIN ||
    domain === `${AUTH_ALLOWED_EMAIL_DOMAIN}.it` ||
    domain.endsWith(`.${AUTH_ALLOWED_EMAIL_DOMAIN}.it`)
  );
}

function parseIsoToMs(isoValue) {
  const parsed = Date.parse(String(isoValue || ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function pruneAuthRegistry(authRegistry, nowMs = Date.now()) {
  if (!authRegistry || typeof authRegistry !== 'object') {
    return false;
  }

  let changed = false;

  Object.keys(authRegistry.pendingCodes || {}).forEach(email => {
    const item = authRegistry.pendingCodes[email] || {};
    if (parseIsoToMs(item.expiresAt) <= nowMs) {
      delete authRegistry.pendingCodes[email];
      changed = true;
    }
  });

  Object.keys(authRegistry.sessions || {}).forEach(sessionHash => {
    const item = authRegistry.sessions[sessionHash] || {};
    if (parseIsoToMs(item.expiresAt) <= nowMs) {
      delete authRegistry.sessions[sessionHash];
      changed = true;
    }
  });

  return changed;
}

function pruneDisallowedAuthEmails(authRegistry) {
  if (!authRegistry || typeof authRegistry !== 'object') {
    return false;
  }

  let changed = false;

  Object.keys(authRegistry.pendingCodes || {}).forEach(email => {
    if (!isAllowedLoginEmail(email)) {
      delete authRegistry.pendingCodes[email];
      changed = true;
    }
  });

  Object.keys(authRegistry.sessions || {}).forEach(sessionHash => {
    const session = authRegistry.sessions[sessionHash] || {};
    if (!isAllowedLoginEmail(session.email || '')) {
      delete authRegistry.sessions[sessionHash];
      changed = true;
    }
  });

  Object.keys(authRegistry.users || {}).forEach(email => {
    if (!isAllowedLoginEmail(email)) {
      delete authRegistry.users[email];
      changed = true;
    }
  });

  return changed;
}

function getAuthTokenFromRequest(req) {
  const authorization = normalizeText(req?.headers?.authorization);
  if (!authorization) {
    return '';
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return '';
  }
  return normalizeText(match[1]);
}

function getGmailTransport() {
  if (!nodemailer) {
    throw createHttpError(
      500,
      'Modulo nodemailer non installato sul server. Esegui "npm install" dentro la cartella cloud-monitor e riavvia il servizio.'
    );
  }

  if (_gmailTransport) {
    return _gmailTransport;
  }

  _gmailTransport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: GMAIL_OAUTH2_USER,
      clientId: HARDCODED_GMAIL_OAUTH2.clientId,
      clientSecret: HARDCODED_GMAIL_OAUTH2.clientSecret,
      refreshToken: HARDCODED_GMAIL_OAUTH2.refreshToken,
    },
  });

  return _gmailTransport;
}

async function sendLoginCodeEmail(email, code, expiresAtIso) {
  const transporter = getGmailTransport();
  const expiresAtDate = new Date(expiresAtIso);
  const expiresAtText = Number.isNaN(expiresAtDate.getTime())
    ? expiresAtIso
    : expiresAtDate.toLocaleString('it-IT', {
        timeZone: 'Europe/Rome',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

  const subject = 'Codice accesso Dashboard Viewer';
  const textBody = [`Codice: ${code}`, `Scadenza: ${expiresAtText}`].join('\n');

  await transporter.sendMail({
    from: `"Dashboard Viewer" <${GMAIL_OAUTH2_USER}>`,
    to: email,
    subject,
    text: textBody,
  });
}

async function requestLoginCodeForEmail(emailInput) {
  const email = normalizeEmail(emailInput);
  if (!isValidEmail(email)) {
    throw createHttpError(400, 'Email non valida');
  }
  if (!isAllowedLoginEmail(email)) {
    throw createHttpError(403, 'Email non autorizzata');
  }

  const nowMs = Date.now();
  const currentIso = nowIso();
  const expiresAt = new Date(nowMs + AUTH_CODE_TTL_MS).toISOString();

  const authRegistry = readAuthRegistry();
  const cleaned = pruneAuthRegistry(authRegistry, nowMs);
  const domainCleaned = pruneDisallowedAuthEmails(authRegistry);
  const existing = authRegistry.pendingCodes[email];
  if (existing) {
    const lastSentAtMs = parseIsoToMs(existing.lastSentAt || existing.requestedAt);
    if (lastSentAtMs && nowMs - lastSentAtMs < AUTH_MIN_RESEND_MS) {
      if (cleaned || domainCleaned) {
        authRegistry.updatedAt = currentIso;
        writeAuthRegistry(authRegistry);
      }
      throw createHttpError(429, 'Attendi qualche secondo prima di richiedere un nuovo codice');
    }
  }

  const code = generateOtpCode();
  await sendLoginCodeEmail(email, code, expiresAt);

  authRegistry.pendingCodes[email] = {
    codeHash: hashSha256(code),
    requestedAt: currentIso,
    lastSentAt: currentIso,
    expiresAt,
    attempts: 0,
  };
  if (cleaned || domainCleaned) {
    authRegistry.cleanedAt = currentIso;
  }
  authRegistry.updatedAt = currentIso;
  writeAuthRegistry(authRegistry);

  return {
    email,
    expiresAt,
  };
}

function verifyLoginCode(emailInput, codeInput) {
  const email = normalizeEmail(emailInput);
  const code = normalizeText(codeInput).replace(/\s+/g, '');

  if (!isValidEmail(email)) {
    throw createHttpError(400, 'Email non valida');
  }
  if (!isAllowedLoginEmail(email)) {
    throw createHttpError(403, 'Email non autorizzata');
  }
  if (!/^\d{6}$/.test(code)) {
    throw createHttpError(400, 'Codice non valido');
  }

  const nowMs = Date.now();
  const currentIso = nowIso();
  const authRegistry = readAuthRegistry();
  const cleaned = pruneAuthRegistry(authRegistry, nowMs);
  const domainCleaned = pruneDisallowedAuthEmails(authRegistry);
  const pending = authRegistry.pendingCodes[email];

  if (!pending) {
    if (cleaned || domainCleaned) {
      authRegistry.updatedAt = currentIso;
      writeAuthRegistry(authRegistry);
    }
    throw createHttpError(400, 'Codice assente o scaduto. Richiedi un nuovo codice');
  }

  const attemptCount = Number(pending.attempts || 0);
  if (attemptCount >= AUTH_MAX_VERIFY_ATTEMPTS) {
    delete authRegistry.pendingCodes[email];
    authRegistry.updatedAt = currentIso;
    writeAuthRegistry(authRegistry);
    throw createHttpError(400, 'Troppi tentativi errati. Richiedi un nuovo codice');
  }

  if (pending.codeHash !== hashSha256(code)) {
    pending.attempts = attemptCount + 1;
    authRegistry.pendingCodes[email] = pending;
    authRegistry.updatedAt = currentIso;
    writeAuthRegistry(authRegistry);
    const remainingAttempts = Math.max(0, AUTH_MAX_VERIFY_ATTEMPTS - pending.attempts);
    throw createHttpError(
      400,
      remainingAttempts > 0
        ? `Codice errato. Tentativi rimanenti: ${remainingAttempts}`
        : 'Codice errato. Richiedi un nuovo codice'
    );
  }

  delete authRegistry.pendingCodes[email];

  Object.keys(authRegistry.sessions).forEach(sessionHash => {
    const session = authRegistry.sessions[sessionHash];
    if (normalizeEmail(session?.email) === email) {
      delete authRegistry.sessions[sessionHash];
    }
  });

  const sessionToken = generateSessionToken();
  const sessionTokenHash = hashSha256(sessionToken);
  const createdAt = currentIso;
  const expiresAt = new Date(nowMs + AUTH_SESSION_TTL_MS).toISOString();

  authRegistry.sessions[sessionTokenHash] = {
    email,
    createdAt,
    expiresAt,
    lastSeenAt: createdAt,
  };
  authRegistry.users[email] = {
    email,
    lastLoginAt: createdAt,
    lastSessionExpiresAt: expiresAt,
  };
  authRegistry.updatedAt = createdAt;
  writeAuthRegistry(authRegistry);

  return {
    email,
    token: sessionToken,
    expiresAt,
  };
}

function validateSessionToken(sessionTokenInput) {
  const sessionToken = normalizeText(sessionTokenInput);
  if (!sessionToken) {
    return null;
  }

  const nowMs = Date.now();
  const currentIso = nowIso();
  const authRegistry = readAuthRegistry();
  const cleaned = pruneAuthRegistry(authRegistry, nowMs);
  const domainCleaned = pruneDisallowedAuthEmails(authRegistry);
  const sessionTokenHash = hashSha256(sessionToken);
  const session = authRegistry.sessions[sessionTokenHash];

  if (!session) {
    if (cleaned || domainCleaned) {
      authRegistry.updatedAt = currentIso;
      writeAuthRegistry(authRegistry);
    }
    return null;
  }

  if (!isAllowedLoginEmail(session.email || '')) {
    delete authRegistry.sessions[sessionTokenHash];
    authRegistry.updatedAt = currentIso;
    writeAuthRegistry(authRegistry);
    return null;
  }

  const lastSeenMs = parseIsoToMs(session.lastSeenAt);
  const shouldUpdateLastSeen = !lastSeenMs || nowMs - lastSeenMs >= 60 * 1000;
  if (shouldUpdateLastSeen) {
    session.lastSeenAt = currentIso;
    authRegistry.sessions[sessionTokenHash] = session;
    authRegistry.updatedAt = currentIso;
    writeAuthRegistry(authRegistry);
  } else if (cleaned || domainCleaned) {
    authRegistry.updatedAt = currentIso;
    writeAuthRegistry(authRegistry);
  }

  return {
    email: session.email || '',
    expiresAt: session.expiresAt || '',
    lastSeenAt: session.lastSeenAt || '',
  };
}

function sanitizeFileName(name, fallback) {
  const normalized = normalizeText(name)
    .replace(/[<>:"/\\|?*\x00-\x1F]+/g, '_')
    .replace(/\s+/g, '_');

  if (!normalized) {
    return fallback;
  }

  return normalized;
}

function getReleaseByVersion(version) {
  const releaseVersion = toReleaseVersion(version);
  if (!releaseVersion) {
    return null;
  }

  const releasesRegistry = readReleasesRegistry();
  const release = releasesRegistry.releases[releaseVersion];
  if (!release) {
    return null;
  }

  return {
    version: release.version,
    fileName: release.fileName,
    size: release.size,
    sha256: release.sha256,
    uploadedAt: release.uploadedAt,
    notes: release.notes || '',
    structureRoot: release.structureRoot || '',
  };
}

function getClientEntries() {
  const registry = readRegistry();
  return Object.entries(registry.clients);
}

function findClientEntryByClientId(registry, clientId) {
  const normalizedClientId = normalizeText(clientId);
  if (!normalizedClientId) {
    return null;
  }

  return Object.entries(registry.clients).find(([, client]) => {
    return normalizeText(client.clientId) === normalizedClientId;
  });
}

function getClients() {
  return getClientEntries()
    .map(([customerKey, item]) => ({
      customerKey,
      customerName: item.customerName || '',
      version: item.version || 'unknown',
      targetVersion: item.targetVersion || '',
      updateStatus: item.updateStatus || 'idle',
      updateMessage: item.updateMessage || '',
      updateUpdatedAt: item.updateUpdatedAt || '',
      renameStatus: item.renameStatus || 'idle',
      renameMessage: item.renameMessage || '',
      renameUpdatedAt: item.renameUpdatedAt || '',
      pendingCustomerName: item.pendingCustomerName || '',
      firstSeenAt: item.firstSeenAt || '',
      lastSeenAt: item.lastSeenAt || '',
      lastIp: item.lastIp || '',
      clientId: item.clientId || '',
      updateCancelRequestedAt: item.updateCancelRequestedAt || '',
      blockedUpdateVersion: item.blockedUpdateVersion || '',
      hasAdminCredentials: Boolean(normalizeText(item.adminUsername) && normalizeText(item.adminPassword)),
      adminUpdatedAt: item.adminUpdatedAt || '',
      adminUsername: decryptText(item.adminUsername || ''),
      adminPasswordMasked: normalizeText(item.adminPassword) ? '********' : '',
      pollIntervalSec: normalizePollIntervalSec(item.pollIntervalSec),
      credTestStatus: item.credTestStatus || 'idle',
      credTestMessage: item.credTestMessage || '',
      lastUpdateAppliedAt: item.lastUpdateAppliedAt || '',
    }))
    .sort((a, b) => a.customerName.localeCompare(b.customerName, 'it'));
}

function upsertClient(payload, requestIp) {
  const customerName = normalizeText(payload.customerName || payload.clientName || payload.cliente);
  if (!customerName) {
    throw new Error('customerName obbligatorio');
  }

  const version = normalizeText(payload.version || payload.appVersion) || 'unknown';
  const clientId = normalizeText(payload.clientId || payload.hostname || payload.instanceId);
  const currentIso = nowIso();
  const registry = readRegistry();

  const fallbackKey = toCustomerKey(customerName);
  let resolvedEntry = null;

  // 1. Cerca per clientId (UUID o preset)
  if (clientId) {
    resolvedEntry = findClientEntryByClientId(registry, clientId);
  }

  // 2. Se non trovato per clientId, cerca per customerName uguale
  //    (migrazione: client aggiornato ha nuovo UUID ma nome già noto)
  if (!resolvedEntry && customerName) {
    const nameKey = toCustomerKey(customerName);
    const byName = Object.entries(registry.clients).find(([, c]) =>
      toCustomerKey(c.customerName || '') === nameKey
    );
    if (byName) resolvedEntry = byName;
  }

  // 3. Fallback chiave-nome (client nuovo mai visto)
  if (!resolvedEntry && fallbackKey && registry.clients[fallbackKey]) {
    resolvedEntry = [fallbackKey, registry.clients[fallbackKey]];
  }

  const customerKey = resolvedEntry?.[0] || fallbackKey;
  const current = resolvedEntry?.[1] || {
    customerName,
    firstSeenAt: currentIso,
    targetVersion: '',
    updateStatus: 'idle',
    updateMessage: '',
    updateUpdatedAt: '',
    renameStatus: 'idle',
    renameMessage: '',
    renameUpdatedAt: '',
    pendingCustomerName: '',
    updateCancelRequestedAt: '',
    blockedUpdateVersion: '',
    adminUsername: '',
    adminPassword: '',
    adminUpdatedAt: '',
    pollIntervalSec: POLL_INTERVAL_SEC_DEFAULT,
    credTestStatus: 'idle',
    credTestMessage: '',
    credTestUsername: '',
    credTestPassword: '',
  };

  const pendingRename = normalizeText(current.pendingCustomerName);
  if (!pendingRename) {
    current.customerName = customerName;
  } else if (customerName === pendingRename) {
    current.customerName = customerName;
    current.pendingCustomerName = '';
    current.renameStatus = 'confirmed';
    current.renameMessage = `Nome cliente confermato dal client: ${customerName}`;
    current.renameUpdatedAt = currentIso;
  }

  current.version = version;
  current.lastSeenAt = currentIso;
  current.lastIp = requestIp || '';

  if (clientId) {
    current.clientId = clientId;
  }

  if (current.targetVersion && current.version === current.targetVersion) {
    const wasAlreadyConfirmed = current.updateStatus === 'confirmed';
    current.updateStatus = 'confirmed';
    current.updateMessage = 'Versione confermata dal client';
    current.updateUpdatedAt = currentIso;
    if (!wasAlreadyConfirmed) {
      current.lastUpdateAppliedAt = currentIso;
    }
    current.updateCancelRequestedAt = '';
    current.blockedUpdateVersion = '';
  } else if (!current.targetVersion) {
    // Nessun aggiornamento mai schedulato: se il client ha una versione valida
    // mostra "Aggiornato" invece del fuorviante "In attesa"
    if (version && version !== 'unknown' && current.updateStatus === 'idle') {
      current.updateStatus = 'up_to_date';
    } else {
      current.updateStatus = current.updateStatus || 'idle';
    }
  }

  registry.clients[customerKey] = current;
  writeRegistry(registry);

  return {
    customerKey,
    customerName: current.customerName,
    version: current.version,
    targetVersion: current.targetVersion || '',
    updateStatus: current.updateStatus || 'idle',
    updateMessage: current.updateMessage || '',
    updateUpdatedAt: current.updateUpdatedAt || '',
    renameStatus: current.renameStatus || 'idle',
    renameMessage: current.renameMessage || '',
    renameUpdatedAt: current.renameUpdatedAt || '',
    pendingCustomerName: current.pendingCustomerName || '',
    firstSeenAt: current.firstSeenAt,
    lastSeenAt: current.lastSeenAt,
    lastIp: current.lastIp,
    clientId: current.clientId || '',
    updateCancelRequestedAt: current.updateCancelRequestedAt || '',
    blockedUpdateVersion: current.blockedUpdateVersion || '',
    hasAdminCredentials: Boolean(
      normalizeText(current.adminUsername) && normalizeText(current.adminPassword)
    ),
    adminUpdatedAt: current.adminUpdatedAt || '',
    adminUsername: current.adminUsername || '',
    adminPasswordMasked: normalizeText(current.adminPassword) ? '********' : '',
    lastUpdateAppliedAt: current.lastUpdateAppliedAt || '',
  };
}

function deleteClient(customerKeyInput) {
  const customerKey = toCustomerKey(decodeURIComponent(customerKeyInput || ''));
  if (!customerKey) {
    return null;
  }

  const registry = readRegistry();
  const existing = registry.clients[customerKey];
  if (!existing) {
    return null;
  }

  delete registry.clients[customerKey];
  writeRegistry(registry);

  return {
    customerKey,
    customerName: existing.customerName || '',
    version: existing.version || 'unknown',
    targetVersion: existing.targetVersion || '',
    updateStatus: existing.updateStatus || 'idle',
    updateMessage: existing.updateMessage || '',
    updateUpdatedAt: existing.updateUpdatedAt || '',
    renameStatus: existing.renameStatus || 'idle',
    renameMessage: existing.renameMessage || '',
    renameUpdatedAt: existing.renameUpdatedAt || '',
    pendingCustomerName: existing.pendingCustomerName || '',
    firstSeenAt: existing.firstSeenAt || '',
    lastSeenAt: existing.lastSeenAt || '',
    lastIp: existing.lastIp || '',
    clientId: existing.clientId || '',
  };
}


function requestClientRename(customerKeyInput, desiredNameInput) {
  const customerKey = toCustomerKey(decodeURIComponent(customerKeyInput || ''));
  const desiredName = normalizeText(desiredNameInput);
  const currentIso = nowIso();

  if (!customerKey) {
    throw new Error('customerKey non valido');
  }
  if (!desiredName) {
    throw new Error('desiredName obbligatorio');
  }

  const registry = readRegistry();
  const client = registry.clients[customerKey];
  if (!client) {
    throw new Error('Cliente non trovato');
  }

  // Verifica collisione nome: nessun altro cliente può avere lo stesso customerName
  const desiredKey = toCustomerKey(desiredName);
  const collision = Object.entries(registry.clients).find(([k, c]) => {
    if (k === customerKey) return false; // skip se stessi
    return toCustomerKey(c.customerName || '') === desiredKey ||
           toCustomerKey(c.pendingCustomerName || '') === desiredKey;
  });
  if (collision) {
    throw new Error(`Il nome "${desiredName}" è già utilizzato da un altro cliente`);
  }

  if (normalizeText(client.customerName) === desiredName) {
    client.pendingCustomerName = '';
    client.renameStatus = 'up_to_date';
    client.renameMessage = 'Nome gia allineato';
    client.renameUpdatedAt = currentIso;
  } else {
    client.pendingCustomerName = desiredName;
    client.renameStatus = 'pending';
    client.renameMessage = `Cambio nome richiesto verso "${desiredName}"`;
    client.renameUpdatedAt = currentIso;
  }

  registry.clients[customerKey] = client;
  writeRegistry(registry);

  return {
    customerKey,
    customerName: client.customerName || '',
    pendingCustomerName: client.pendingCustomerName || '',
    renameStatus: client.renameStatus || 'idle',
    renameMessage: client.renameMessage || '',
    renameUpdatedAt: client.renameUpdatedAt || '',
  };
}

function cancelClientRequests(customerKeyInput, options = {}) {
  const customerKey = toCustomerKey(decodeURIComponent(customerKeyInput || ''));
  if (!customerKey) {
    throw new Error('customerKey non valido');
  }

  const cancelUpdate = Boolean(options.cancelUpdate);
  const cancelRename = Boolean(options.cancelRename);
  if (!cancelUpdate && !cancelRename) {
    throw new Error('Seleziona almeno una richiesta da annullare');
  }

  const registry = readRegistry();
  const client = registry.clients[customerKey];
  if (!client) {
    throw new Error('Cliente non trovato');
  }

  const currentIso = nowIso();
  let changed = false;

  if (cancelUpdate) {
    if (normalizeText(client.targetVersion)) {
      client.targetVersion = '';
      changed = true;
    }
    client.updateCancelRequestedAt = currentIso;
    client.blockedUpdateVersion = '';
    client.updateStatus = 'cancel_requested';
    client.updateMessage = 'Stop aggiornamento richiesto da dashboard';
    client.updateUpdatedAt = currentIso;
  }

  if (cancelRename) {
    if (normalizeText(client.pendingCustomerName)) {
      client.pendingCustomerName = '';
      changed = true;
    }
    client.renameStatus = 'idle';
    client.renameMessage = 'Richiesta rename annullata da dashboard';
    client.renameUpdatedAt = currentIso;
  }

  if (changed || cancelUpdate || cancelRename) {
    registry.clients[customerKey] = client;
    writeRegistry(registry);
  }

  return {
    customerKey,
    customerName: client.customerName || '',
    version: client.version || 'unknown',
    targetVersion: client.targetVersion || '',
    updateStatus: client.updateStatus || 'idle',
    updateMessage: client.updateMessage || '',
    updateUpdatedAt: client.updateUpdatedAt || '',
    renameStatus: client.renameStatus || 'idle',
    renameMessage: client.renameMessage || '',
    renameUpdatedAt: client.renameUpdatedAt || '',
    pendingCustomerName: client.pendingCustomerName || '',
    firstSeenAt: client.firstSeenAt || '',
    lastSeenAt: client.lastSeenAt || '',
    lastIp: client.lastIp || '',
    clientId: client.clientId || '',
    updateCancelRequestedAt: client.updateCancelRequestedAt || '',
    blockedUpdateVersion: client.blockedUpdateVersion || '',
    hasAdminCredentials: Boolean(normalizeText(client.adminUsername) && normalizeText(client.adminPassword)),
    adminUpdatedAt: client.adminUpdatedAt || '',
  };
}

function setClientAdminCredentials(customerKeyInput, payload = {}) {
  const customerKey = toCustomerKey(decodeURIComponent(customerKeyInput || ''));
  if (!customerKey) {
    throw new Error('customerKey non valido');
  }

  const registry = readRegistry();
  const client = registry.clients[customerKey];
  if (!client) {
    throw new Error('Cliente non trovato');
  }

  const username = normalizeText(payload.username || payload.adminUsername || payload.user);
  const password = normalizeText(payload.password || payload.adminPassword || payload.pass);
  const keepExistingPassword = Boolean(payload.keepExistingPassword);
  const currentIso = nowIso();

  if (!username && !password) {
    client.adminUsername = '';
    client.adminPassword = '';
    client.adminUpdatedAt = currentIso;
  } else {
    if (!username) {
      throw new Error('Inserisci username amministratore');
    }
    const nextPassword = password || (keepExistingPassword ? decryptText(normalizeText(client.adminPassword)) : '');
    if (!nextPassword) {
      throw new Error('Inserisci sia username che password amministratore');
    }
    client.adminUsername = encryptText(username);
    client.adminPassword = encryptText(nextPassword);
    client.adminUpdatedAt = currentIso;
  }

  registry.clients[customerKey] = client;
  writeRegistry(registry);

  return {
    customerKey,
    customerName: client.customerName || '',
    hasAdminCredentials: Boolean(normalizeText(client.adminUsername) && normalizeText(client.adminPassword)),
    adminUpdatedAt: client.adminUpdatedAt || '',
    adminUsername: decryptText(client.adminUsername || ''),
    adminPasswordMasked: normalizeText(client.adminPassword) ? '********' : '',
  };
}

function setClientTargetVersion(customerKeyInput, targetVersionInput) {
  const customerKey = toCustomerKey(decodeURIComponent(customerKeyInput || ''));
  const targetVersion = toReleaseVersion(targetVersionInput);
  const currentIso = nowIso();

  if (!customerKey) {
    throw new Error('customerKey non valido');
  }

  const registry = readRegistry();
  const client = registry.clients[customerKey];
  if (!client) {
    throw new Error('Cliente non trovato');
  }

  if (targetVersion) {
    const hasAdminCredentials = Boolean(
      normalizeText(client.adminUsername) && normalizeText(client.adminPassword)
    );
    if (!hasAdminCredentials) {
      throw new Error('Credenziali amministratore non configurate per questo cliente');
    }
    const release = getReleaseByVersion(targetVersion);
    if (!release) {
      throw new Error(`Release ${targetVersion} non trovata`);
    }
  }

  client.targetVersion = targetVersion;
  client.blockedUpdateVersion = '';
  if (targetVersion) {
    client.updateCancelRequestedAt = '';
  }

  if (!targetVersion) {
    client.updateStatus = 'idle';
    client.updateMessage = 'Nessuna versione target assegnata';
  } else if (normalizeText(client.version) === targetVersion) {
    client.updateStatus = 'up_to_date';
    client.updateMessage = 'Client gia allineato alla versione target';
  } else {
    client.updateStatus = 'pending';
    client.updateMessage = `Aggiornamento richiesto verso ${targetVersion}`;
  }

  client.updateUpdatedAt = currentIso;
  writeRegistry(registry);

  return {
    customerKey,
    customerName: client.customerName || '',
    version: client.version || 'unknown',
    targetVersion: client.targetVersion || '',
    updateStatus: client.updateStatus || 'idle',
    updateMessage: client.updateMessage || '',
    updateUpdatedAt: client.updateUpdatedAt || '',
    firstSeenAt: client.firstSeenAt || '',
    lastSeenAt: client.lastSeenAt || '',
    lastIp: client.lastIp || '',
    clientId: client.clientId || '',
    updateCancelRequestedAt: client.updateCancelRequestedAt || '',
    blockedUpdateVersion: client.blockedUpdateVersion || '',
  };
}

function updateClientStatus(payload) {
  const customerKeyFromPayload = toCustomerKey(payload.customerKey || payload.customerName || payload.cliente);
  const clientId = normalizeText(payload.clientId);
  const status = normalizeText(payload.status) || 'unknown';
  const message = normalizeText(payload.message);
  const version = normalizeText(payload.version);
  const currentIso = nowIso();

  const registry = readRegistry();

  let entry = null;
  if (customerKeyFromPayload) {
    entry = [customerKeyFromPayload, registry.clients[customerKeyFromPayload]];
  }
  if ((!entry || !entry[1]) && clientId) {
    entry = findClientEntryByClientId(registry, clientId);
  }

  if (!entry || !entry[1]) {
    return null;
  }

  const [customerKey, client] = entry;
  client.updateStatus = status;
  client.updateMessage = message;
  client.updateUpdatedAt = currentIso;

  if (version) {
    client.lastCommandVersion = version;
  }

  if (status === 'success' && version && normalizeText(client.targetVersion) === version) {
    client.updateMessage = message || `Aggiornamento ${version} completato; in attesa di conferma dal client`;
  }
  if (status === 'success' || status === 'failed' || status === 'cancelled' || status === 'confirmed') {
    client.updateCancelRequestedAt = '';
  }
  if ((status === 'failed' || status === 'cancelled') && version) {
    client.blockedUpdateVersion = version;
  } else if (version && normalizeText(client.blockedUpdateVersion) === version) {
    client.blockedUpdateVersion = '';
  }
  if (status === 'cancelled') {
    client.targetVersion = '';
    client.updateMessage = message || 'Aggiornamento annullato dal client';
  }

  registry.clients[customerKey] = client;
  writeRegistry(registry);

  return {
    customerKey,
    customerName: client.customerName || '',
    version: client.version || 'unknown',
    targetVersion: client.targetVersion || '',
    updateStatus: client.updateStatus || 'idle',
    updateMessage: client.updateMessage || '',
    updateUpdatedAt: client.updateUpdatedAt || '',
    renameStatus: client.renameStatus || 'idle',
    renameMessage: client.renameMessage || '',
    renameUpdatedAt: client.renameUpdatedAt || '',
    pendingCustomerName: client.pendingCustomerName || '',
    firstSeenAt: client.firstSeenAt || '',
    lastSeenAt: client.lastSeenAt || '',
    lastIp: client.lastIp || '',
    clientId: client.clientId || '',
    updateCancelRequestedAt: client.updateCancelRequestedAt || '',
    blockedUpdateVersion: client.blockedUpdateVersion || '',
  };
}

function applyClientRenameStatus(payload) {
  const customerKeyFromPayload = toCustomerKey(
    payload.customerKey || payload.customerName || payload.previousName || payload.currentName
  );
  const clientId = normalizeText(payload.clientId);
  const status = normalizeText(payload.status) || 'unknown';
  const message = normalizeText(payload.message);
  const desiredName = normalizeText(payload.desiredName || payload.targetCustomerName);
  const appliedName = normalizeText(payload.currentName || payload.appliedName);
  const currentIso = nowIso();

  const registry = readRegistry();

  let entry = null;
  if (customerKeyFromPayload) {
    entry = [customerKeyFromPayload, registry.clients[customerKeyFromPayload]];
  }
  if ((!entry || !entry[1]) && clientId) {
    entry = findClientEntryByClientId(registry, clientId);
  }
  if (!entry || !entry[1]) {
    return null;
  }

  const [customerKey, client] = entry;
  client.renameStatus = status;
  client.renameMessage = message || client.renameMessage || '';
  client.renameUpdatedAt = currentIso;

  if (desiredName) {
    client.pendingCustomerName = desiredName;
  }

  if (status === 'success') {
    const nextName = appliedName || desiredName;
    if (nextName) {
      client.customerName = nextName;
    }
    client.pendingCustomerName = '';
    client.renameStatus = 'confirmed';
    client.renameMessage = message || `Nome aggiornato in "${client.customerName || nextName}"`;
  }

  registry.clients[customerKey] = client;
  writeRegistry(registry);

  return {
    customerKey,
    customerName: client.customerName || '',
    pendingCustomerName: client.pendingCustomerName || '',
    renameStatus: client.renameStatus || 'idle',
    renameMessage: client.renameMessage || '',
    renameUpdatedAt: client.renameUpdatedAt || '',
    clientId: client.clientId || '',
  };
}

function requestCredentialTest(customerKeyInput, payload = {}) {
  const customerKey = toCustomerKey(decodeURIComponent(customerKeyInput || ''));
  if (!customerKey) throw new Error('customerKey non valido');
  const username = normalizeText(payload.username);
  const password = normalizeText(payload.password);
  const keepExistingPassword = Boolean(payload.keepExistingPassword);
  if (!username) throw new Error('Username obbligatorio');
  const registry = readRegistry();
  const client = registry.clients[customerKey];
  if (!client) throw new Error('Cliente non trovato');
  const resolvedPassword = password || (keepExistingPassword ? decryptText(normalizeText(client.adminPassword)) : '');
  if (!resolvedPassword) throw new Error('Password obbligatoria (nessuna password esistente da riutilizzare)');
  client.credTestStatus = 'requested';
  client.credTestMessage = 'Test in attesa di essere prelevato dal client...';
  client.credTestUsername = encryptText(username);
  client.credTestPassword = encryptText(resolvedPassword);
  registry.clients[customerKey] = client;
  writeRegistry(registry);
  return { ok: true, credTestStatus: 'requested' };
}

function updateClientCredTestResult(payload) {
  const customerKeyFromPayload = toCustomerKey(payload.customerKey || payload.customerName || '');
  const clientId = normalizeText(payload.clientId);
  const status = normalizeText(payload.status); // 'ok' | 'failed'
  const message = normalizeText(payload.message);
  const registry = readRegistry();
  let entry = null;
  if (customerKeyFromPayload) entry = [customerKeyFromPayload, registry.clients[customerKeyFromPayload]];
  if ((!entry || !entry[1]) && clientId) entry = findClientEntryByClientId(registry, clientId);
  if (!entry || !entry[1]) return null;
  const [customerKey, client] = entry;
  client.credTestStatus = status === 'ok' ? 'ok' : 'failed';
  client.credTestMessage = message || (status === 'ok' ? 'Test superato' : 'Test fallito');
  client.credTestUsername = '';
  client.credTestPassword = '';
  registry.clients[customerKey] = client;
  writeRegistry(registry);
  return { ok: true };
}

function getRequestOrigin(req) {
  const host = normalizeText(req.headers.host) || 'localhost';
  const forwardedProto = normalizeText(req.headers['x-forwarded-proto']);
  const protocol = forwardedProto || (host.startsWith('localhost') ? 'http' : 'https');
  return `${protocol}://${host}`;
}

function getClientCommand(query, req) {
  const clientId = normalizeText(query.clientId);
  const customerKey = toCustomerKey(query.customerKey || query.customerName || query.cliente);
  const currentVersion = normalizeText(query.currentVersion || query.version);
  const commandMode = normalizeText(query.commandMode);
  const readOnlyMode = commandMode === 'cancel-check' || commandMode === 'watch';
  const currentIso = nowIso();

  const registry = readRegistry();
  let entry = null;

  if (customerKey && registry.clients[customerKey]) {
    entry = [customerKey, registry.clients[customerKey]];
  }
  if (!entry && clientId) {
    entry = findClientEntryByClientId(registry, clientId);
  }

  if (!entry || !entry[1]) {
    return {
      action: 'none',
      reason: 'client_not_found',
    };
  }

  const [resolvedCustomerKey, client] = entry;
  const effectiveCurrentVersion = currentVersion || normalizeText(client.version);
  const targetVersion = normalizeText(client.targetVersion);
  const cancelUpdateRequested = Boolean(normalizeText(client.updateCancelRequestedAt));
  const blockedUpdateVersion = normalizeText(client.blockedUpdateVersion);
  const hasAdminCredentials = Boolean(
    normalizeText(client.adminUsername) && normalizeText(client.adminPassword)
  );
  const elevation = hasAdminCredentials
    ? { username: decryptText(normalizeText(client.adminUsername)), password: decryptText(normalizeText(client.adminPassword)) }
    : null;
  const pollIntervalSec = normalizePollIntervalSec(client.pollIntervalSec);

  // Test credenziali: se richiesto, includiamo nel payload e passiamo a 'acknowledged'
  let credentialTest = null;
  if (normalizeText(client.credTestStatus) === 'requested' && !readOnlyMode) {
    const testUser = decryptText(normalizeText(client.credTestUsername));
    const testPass = decryptText(normalizeText(client.credTestPassword));
    if (testUser && testPass) {
      credentialTest = { username: testUser, password: testPass };
      client.credTestStatus = 'acknowledged';
      client.credTestMessage = 'Comando test inviato al client, in attesa di risposta...';
      registry.clients[resolvedCustomerKey] = client;
      writeRegistry(registry);
    }
  }

  const pendingCustomerName = normalizeText(client.pendingCustomerName);
  let renameCommand = null;

  if (pendingCustomerName && pendingCustomerName !== normalizeText(client.customerName)) {
    renameCommand = {
      action: 'renameCustomer',
      desiredName: pendingCustomerName,
    };

    if (!readOnlyMode && (client.renameStatus === 'pending' || !normalizeText(client.renameStatus))) {
      client.renameStatus = 'commanded';
      client.renameMessage = `Comando rename inviato verso "${pendingCustomerName}"`;
      client.renameUpdatedAt = currentIso;
      registry.clients[resolvedCustomerKey] = client;
      writeRegistry(registry);
    }
  }

  // Auto-clear cancel_requested quando non c'è un target version (niente da cancellare):
  // il client non manderebbe mai un acknowledgment in questo caso, quindi lo gestiamo lato server.
  if (cancelUpdateRequested && !targetVersion && !readOnlyMode) {
    client.updateCancelRequestedAt = '';
    client.updateStatus = 'idle';
    client.updateMessage = '';
    client.updateUpdatedAt = currentIso;
    registry.clients[resolvedCustomerKey] = client;
    writeRegistry(registry);
  }

  if (!targetVersion) {
    return {
      action: 'none',
      reason: 'no_target_version',
      cancelUpdateRequested: false,
      elevation,
      pollIntervalSec,
      credentialTest,
      renameCommand,
    };
  }

  if (effectiveCurrentVersion && effectiveCurrentVersion === targetVersion) {
    if (!readOnlyMode && client.updateStatus !== 'confirmed') {
      client.updateStatus = 'confirmed';
      client.updateMessage = 'Versione target gia installata';
      client.updateUpdatedAt = currentIso;
      client.lastUpdateAppliedAt = currentIso;
      client.updateCancelRequestedAt = '';
      registry.clients[resolvedCustomerKey] = client;
      writeRegistry(registry);
    }
    return {
      action: 'none',
      reason: 'already_up_to_date',
      targetVersion,
      cancelUpdateRequested,
      elevation,
      pollIntervalSec,
      credentialTest,
      renameCommand,
    };
  }

  if (targetVersion && !hasAdminCredentials) {
    if (!readOnlyMode) {
      client.updateStatus = 'failed';
      client.updateMessage = 'Permessi insufficienti: credenziali amministratore non configurate';
      client.updateUpdatedAt = currentIso;
      client.blockedUpdateVersion = targetVersion;
      registry.clients[resolvedCustomerKey] = client;
      writeRegistry(registry);
    }
    return {
      action: 'none',
      reason: 'missing_admin_credentials',
      targetVersion,
      cancelUpdateRequested,
      elevation,
      pollIntervalSec,
      credentialTest,
      renameCommand,
    };
  }

  if (targetVersion && blockedUpdateVersion && blockedUpdateVersion === targetVersion) {
    return {
      action: 'none',
      reason: 'blocked_after_failed_update',
      targetVersion,
      cancelUpdateRequested,
      elevation,
      pollIntervalSec,
      credentialTest,
      renameCommand,
    };
  }

  const release = getReleaseByVersion(targetVersion);
  if (!release) {
    if (!readOnlyMode) {
      client.updateStatus = 'failed';
      client.updateMessage = `Release ${targetVersion} non disponibile`;
      client.updateUpdatedAt = currentIso;
      registry.clients[resolvedCustomerKey] = client;
      writeRegistry(registry);
    }

    return {
      action: 'none',
      reason: 'release_not_found',
      targetVersion,
      cancelUpdateRequested,
      elevation,
      pollIntervalSec,
      credentialTest,
      renameCommand,
    };
  }

  if (!readOnlyMode) {
    client.updateStatus = 'commanded';
    client.updateMessage = `Comando update inviato verso ${targetVersion}`;
    client.updateUpdatedAt = currentIso;
    registry.clients[resolvedCustomerKey] = client;
    writeRegistry(registry);
  }

  const origin = getRequestOrigin(req);
  return {
    action: 'update',
    customerKey: resolvedCustomerKey,
    customerName: client.customerName || '',
    currentVersion: effectiveCurrentVersion || 'unknown',
    targetVersion,
    cancelUpdateRequested,
    release: {
      version: release.version,
      fileName: release.fileName,
      sha256: release.sha256,
      size: release.size,
      uploadedAt: release.uploadedAt,
      downloadUrl: `${origin}/api/releases/download/${encodeURIComponent(release.version)}`,
    },
    elevation,
    pollIntervalSec,
    credentialTest,
    renameCommand,
  };
}

function getReleasesList() {
  const releasesRegistry = readReleasesRegistry();
  return Object.values(releasesRegistry.releases)
    .map(item => ({
      version: item.version,
      fileName: item.fileName,
      sha256: item.sha256,
      size: item.size,
      uploadedAt: item.uploadedAt,
      notes: item.notes || '',
      structureRoot: item.structureRoot || '',
    }))
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

function writeReleaseMetadata(releaseMetadata) {
  const releasesRegistry = readReleasesRegistry();
  const existing = releasesRegistry.releases[releaseMetadata.version];

  if (existing && existing.fileName && existing.fileName !== releaseMetadata.fileName) {
    const oldPath = path.join(RELEASES_DIR, existing.fileName);
    if (fs.existsSync(oldPath)) {
      fs.rmSync(oldPath, { force: true });
    }
  }

  releasesRegistry.releases[releaseMetadata.version] = releaseMetadata;
  writeReleasesRegistry(releasesRegistry);
}

function deleteRelease(versionInput) {
  const version = toReleaseVersion(decodeURIComponent(versionInput || ''));
  if (!version) {
    return null;
  }

  const releasesRegistry = readReleasesRegistry();
  const existing = releasesRegistry.releases[version];
  if (!existing) {
    return null;
  }

  if (existing.fileName) {
    const releasePath = path.join(RELEASES_DIR, existing.fileName);
    if (fs.existsSync(releasePath)) {
      try {
        fs.rmSync(releasePath, { force: true });
      } catch (_err) {
        // ignore filesystem cleanup errors
      }
    }
  }

  delete releasesRegistry.releases[version];
  writeReleasesRegistry(releasesRegistry);

  const currentIso = nowIso();
  let clientsReset = 0;
  const registry = readRegistry();

  Object.entries(registry.clients).forEach(([, client]) => {
    if (normalizeText(client.targetVersion) !== version) {
      return;
    }

    client.targetVersion = '';
    client.updateStatus = 'idle';
    client.updateMessage = `Target rimosso: release ${version} eliminata dal cloud`;
    client.updateUpdatedAt = currentIso;
    clientsReset += 1;
  });

  if (clientsReset > 0) {
    writeRegistry(registry);
  }

  return {
    version,
    fileName: existing.fileName || '',
    clientsReset,
  };
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];

    req.on('data', chunk => {
      total += chunk.length;
      if (total > MAX_JSON_BODY_BYTES) {
        reject(new Error('Body troppo grande'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        const raw = Buffer.concat(chunks).toString('utf8').trim();
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(new Error(`JSON non valido: ${err.message}`));
      }
    });

    req.on('error', reject);
  });
}

function saveUploadFromRequest(req, destinationPath) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const hash = crypto.createHash('sha256');
    const writeStream = fs.createWriteStream(destinationPath);
    let failed = false;

    function fail(err) {
      if (failed) {
        return;
      }
      failed = true;
      try {
        writeStream.destroy();
      } catch (_err) {
        // ignore
      }
      try {
        if (fs.existsSync(destinationPath)) {
          fs.rmSync(destinationPath, { force: true });
        }
      } catch (_cleanupErr) {
        // ignore
      }
      reject(err);
    }

    req.on('data', chunk => {
      if (failed) {
        return;
      }

      total += chunk.length;
      if (total > MAX_UPLOAD_BYTES) {
        fail(new Error('Upload troppo grande'));
        req.destroy();
        return;
      }

      hash.update(chunk);
      writeStream.write(chunk);
    });

    req.on('end', () => {
      if (failed) {
        return;
      }
      writeStream.end(() => {
        resolve({
          size: total,
          sha256: hash.digest('hex'),
        });
      });
    });

    req.on('error', fail);
    writeStream.on('error', fail);
  });
}

function normalizeZipEntryPath(entryName) {
  let normalized = String(entryName || '')
    .replace(/\\/g, '/')
    .trim();
  while (normalized.startsWith('./')) {
    normalized = normalized.slice(2);
  }
  normalized = normalized.replace(/\/{2,}/g, '/');
  if (!normalized || normalized === '.') {
    return '';
  }
  return normalized;
}

function listZipEntries(zipFilePath) {
  const buffer = fs.readFileSync(zipFilePath);
  if (buffer.length < 22) {
    throw new Error('File ZIP non valido (dimensione troppo piccola)');
  }

  const eocdSignature = 0x06054b50;
  const minOffset = Math.max(0, buffer.length - 0xffff - 22);
  let eocdOffset = -1;

  for (let i = buffer.length - 22; i >= minOffset; i -= 1) {
    if (buffer.readUInt32LE(i) === eocdSignature) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset < 0) {
    throw new Error('File ZIP non valido (EOCD non trovato)');
  }

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectorySize = buffer.readUInt32LE(eocdOffset + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize;

  if (
    centralDirectoryOffset < 0 ||
    centralDirectorySize <= 0 ||
    centralDirectoryEnd > buffer.length
  ) {
    throw new Error('File ZIP non valido (directory centrale corrotta)');
  }

  const centralSignature = 0x02014b50;
  const entries = [];
  let cursor = centralDirectoryOffset;
  let parsed = 0;
  const safetyLimit = Math.max(totalEntries + 2048, 500000);

  while (cursor < centralDirectoryEnd) {
    if (cursor + 46 > buffer.length) {
      throw new Error('File ZIP non valido (header directory centrale incompleto)');
    }

    if (buffer.readUInt32LE(cursor) !== centralSignature) {
      throw new Error('File ZIP non valido (firma directory centrale non riconosciuta)');
    }

    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const fileNameStart = cursor + 46;
    const fileNameEnd = fileNameStart + fileNameLength;

    if (fileNameEnd > buffer.length) {
      throw new Error('File ZIP non valido (nome entry fuori limite)');
    }

    const rawName = buffer.toString('utf8', fileNameStart, fileNameEnd);
    const normalizedName = normalizeZipEntryPath(rawName);
    if (normalizedName) {
      entries.push(normalizedName);
    }

    cursor = fileNameEnd + extraLength + commentLength;
    parsed += 1;
    if (parsed > safetyLimit) {
      throw new Error('File ZIP non valido (troppe entry)');
    }
  }

  if (!entries.length) {
    throw new Error('File ZIP non valido (nessuna entry trovata)');
  }

  return entries;
}

function validateReleaseZipStructure(zipFilePath) {
  const entries = listZipEntries(zipFilePath);
  const lowerEntries = entries.map(item => item.toLowerCase());
  const lowerEntrySet = new Set(lowerEntries);

  const firstLevelFolders = new Set();
  lowerEntries.forEach(entry => {
    const slashIndex = entry.indexOf('/');
    if (slashIndex > 0) {
      firstLevelFolders.add(entry.slice(0, slashIndex));
    }
  });

  const rootCandidates = ['', ...firstLevelFolders];
  for (const root of rootCandidates) {
    const prefix = root ? `${root}/` : '';
    const backendPath = `${prefix}backend.js`;
    const buildViewerPrefix = `${prefix}build-viewer/`;

    const hasBackend = lowerEntrySet.has(backendPath);
    const hasBuildViewer = lowerEntries.some(entry => entry.startsWith(buildViewerPrefix));

    if (hasBackend && hasBuildViewer) {
      return {
        detectedRoot: root || '.',
        totalEntries: entries.length,
      };
    }
  }

  throw new Error(
    'Versione non corretta: lo ZIP deve contenere backend.js e cartella build-viewer (in root o in una cartella contenitore).'
  );
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'application/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.png') return 'image/png';
  if (ext === '.zip') return 'application/zip';
  return 'application/octet-stream';
}

function serveFrontendFile(res, absoluteFilePath) {
  if (!fs.existsSync(absoluteFilePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('File non trovato');
    return;
  }
  res.writeHead(200, {
    'Content-Type': getContentType(absoluteFilePath),
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(absoluteFilePath).pipe(res);
}

function resolveFrontendPath(urlPathname) {
  const pathname = decodeURIComponent(urlPathname || '/');
  if (pathname === '/' || pathname === '/index.html') {
    return FRONTEND_INDEX;
  }

  const normalizedRelative = pathname.replace(/^\/+/, '');
  const resolved = path.resolve(FRONTEND_DIR, normalizedRelative);
  const frontendRoot = path.resolve(FRONTEND_DIR);

  if (!resolved.startsWith(frontendRoot)) {
    return null;
  }

  return resolved;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  });
  res.end(JSON.stringify(payload));
}

ensureRuntimeFiles();

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = requestUrl.pathname;

  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === 'GET' && pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      service: 'dashboard-viewer',
      timestamp: nowIso(),
    });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/auth/session') {
    try {
      const sessionToken = getAuthTokenFromRequest(req);
      const session = validateSessionToken(sessionToken);
      if (!session) {
        sendJson(res, 401, {
          ok: false,
          error: 'Sessione non valida o scaduta',
        });
        return;
      }

      sendJson(res, 200, {
        ok: true,
        session,
      });
    } catch (err) {
      sendJson(res, Number(err?.statusCode || 500), {
        ok: false,
        error: err.message,
      });
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/auth/request-code') {
    try {
      const payload = await parseJsonBody(req);
      const result = await requestLoginCodeForEmail(payload?.email);
      sendJson(res, 200, {
        ok: true,
        email: result.email,
        expiresAt: result.expiresAt,
      });
    } catch (err) {
      sendJson(res, Number(err?.statusCode || 400), {
        ok: false,
        error: err.message,
      });
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/auth/verify-code') {
    try {
      const payload = await parseJsonBody(req);
      const result = verifyLoginCode(payload?.email, payload?.code);
      sendJson(res, 200, {
        ok: true,
        email: result.email,
        token: result.token,
        expiresAt: result.expiresAt,
      });
    } catch (err) {
      sendJson(res, Number(err?.statusCode || 400), {
        ok: false,
        error: err.message,
      });
    }
    return;
  }

  if (req.method === 'GET' && pathname === '/api/clients') {
    const clients = getClients();
    sendJson(res, 200, {
      ok: true,
      total: clients.length,
      clients,
    });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/releases') {
    const releases = getReleasesList();
    sendJson(res, 200, {
      ok: true,
      total: releases.length,
      releases,
    });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/client-command') {
    const command = getClientCommand(Object.fromEntries(requestUrl.searchParams), req);
    sendJson(res, 200, {
      ok: true,
      ...command,
    });
    return;
  }

  if (req.method === 'GET' && pathname.startsWith('/api/releases/download/')) {
    const version = decodeURIComponent(pathname.slice('/api/releases/download/'.length));
    const release = getReleaseByVersion(version);
    if (!release) {
      sendJson(res, 404, {
        ok: false,
        error: 'Release non trovata',
      });
      return;
    }

    const releasePath = path.join(RELEASES_DIR, release.fileName);
    if (!fs.existsSync(releasePath)) {
      sendJson(res, 404, {
        ok: false,
        error: 'File release non trovato su storage',
      });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${release.fileName}"`,
      'Cache-Control': 'no-store',
      'Content-Length': release.size,
      'X-Release-Version': release.version,
      'X-Release-Sha256': release.sha256,
    });
    fs.createReadStream(releasePath).pipe(res);
    return;
  }

  if (req.method === 'POST' && pathname === '/api/heartbeat') {
    try {
      const payload = await parseJsonBody(req);
      const requestIp =
        normalizeText(req.headers['x-forwarded-for']) || normalizeText(req.socket.remoteAddress);
      const client = upsertClient(payload, requestIp);
      sendJson(res, 200, {
        ok: true,
        client,
      });
    } catch (err) {
      sendJson(res, 400, {
        ok: false,
        error: err.message,
      });
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/client-update-status') {
    try {
      const payload = await parseJsonBody(req);
      const updated = updateClientStatus(payload);
      if (!updated) {
        sendJson(res, 404, {
          ok: false,
          error: 'Cliente non trovato per update-status',
        });
        return;
      }
      sendJson(res, 200, {
        ok: true,
        client: updated,
      });
    } catch (err) {
      sendJson(res, 400, {
        ok: false,
        error: err.message,
      });
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/client-rename-status') {
    try {
      const payload = await parseJsonBody(req);
      const updated = applyClientRenameStatus(payload);
      if (!updated) {
        sendJson(res, 404, {
          ok: false,
          error: 'Cliente non trovato per rename-status',
        });
        return;
      }
      sendJson(res, 200, {
        ok: true,
        client: updated,
      });
    } catch (err) {
      sendJson(res, 400, {
        ok: false,
        error: err.message,
      });
    }
    return;
  }

  if (req.method === 'POST' && pathname.startsWith('/api/clients/') && pathname.endsWith('/target-version')) {
    try {
      const customerKey = decodeURIComponent(pathname.slice('/api/clients/'.length, -'/target-version'.length));
      const payload = await parseJsonBody(req);
      const targetVersion = payload?.targetVersion || '';
      const updated = setClientTargetVersion(customerKey, targetVersion);
      sendJson(res, 200, {
        ok: true,
        client: updated,
      });
    } catch (err) {
      sendJson(res, 400, {
        ok: false,
        error: err.message,
      });
    }
    return;
  }

  if (
    req.method === 'POST' &&
    pathname.startsWith('/api/clients/') &&
    pathname.endsWith('/admin-credentials')
  ) {
    try {
      const customerKey = decodeURIComponent(pathname.slice('/api/clients/'.length, -'/admin-credentials'.length));
      const payload = await parseJsonBody(req);
      const updated = setClientAdminCredentials(customerKey, payload || {});
      sendJson(res, 200, {
        ok: true,
        client: updated,
      });
    } catch (err) {
      sendJson(res, 400, {
        ok: false,
        error: err.message,
      });
    }
    return;
  }

  if (req.method === 'POST' && pathname.startsWith('/api/clients/') && pathname.endsWith('/request-credential-test')) {
    try {
      const customerKey = decodeURIComponent(pathname.slice('/api/clients/'.length, -'/request-credential-test'.length));
      const payload = await parseJsonBody(req);
      const result = requestCredentialTest(customerKey, payload || {});
      sendJson(res, 200, result);
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/client-credential-test-result') {
    try {
      const payload = await parseJsonBody(req);
      const result = updateClientCredTestResult(payload || {});
      sendJson(res, result ? 200 : 404, result || { ok: false, error: 'Client non trovato' });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
    }
    return;
  }

  if (req.method === 'POST' && pathname.startsWith('/api/clients/') && pathname.endsWith('/poll-interval')) {
    try {
      const customerKey = decodeURIComponent(pathname.slice('/api/clients/'.length, -'/poll-interval'.length));
      const payload = await parseJsonBody(req);
      const raw = Number(payload?.pollIntervalSec);
      if (!Number.isFinite(raw) || raw < POLL_INTERVAL_SEC_MIN || raw > POLL_INTERVAL_SEC_MAX) {
        throw new Error(`pollIntervalSec deve essere tra ${POLL_INTERVAL_SEC_MIN} e ${POLL_INTERVAL_SEC_MAX}`);
      }
      const registry = readRegistry();
      const client = registry.clients[customerKey];
      if (!client) throw new Error('Cliente non trovato');
      client.pollIntervalSec = Math.round(raw);
      registry.clients[customerKey] = client;
      writeRegistry(registry);
      sendJson(res, 200, { ok: true, pollIntervalSec: client.pollIntervalSec });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
    }
    return;
  }

  if (req.method === 'POST' && pathname.startsWith('/api/clients/') && pathname.endsWith('/rename-request')) {
    try {
      const customerKey = decodeURIComponent(pathname.slice('/api/clients/'.length, -'/rename-request'.length));
      const payload = await parseJsonBody(req);
      const desiredName = payload?.desiredName || payload?.customerName || '';
      const updated = requestClientRename(customerKey, desiredName);
      sendJson(res, 200, {
        ok: true,
        client: updated,
      });
    } catch (err) {
      sendJson(res, 400, {
        ok: false,
        error: err.message,
      });
    }
    return;
  }

  if (req.method === 'POST' && pathname.startsWith('/api/clients/') && pathname.endsWith('/cancel-requests')) {
    try {
      const customerKey = decodeURIComponent(pathname.slice('/api/clients/'.length, -'/cancel-requests'.length));
      const payload = await parseJsonBody(req);
      const updated = cancelClientRequests(customerKey, {
        cancelUpdate: payload?.cancelUpdate,
        cancelRename: payload?.cancelRename,
      });
      sendJson(res, 200, {
        ok: true,
        client: updated,
      });
    } catch (err) {
      sendJson(res, 400, {
        ok: false,
        error: err.message,
      });
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/releases/upload') {
    const version = toReleaseVersion(requestUrl.searchParams.get('version'));
    const notes = normalizeText(requestUrl.searchParams.get('notes'));
    const sourceFileName = sanitizeFileName(requestUrl.searchParams.get('filename') || '', 'release.zip');

    if (!version) {
      sendJson(res, 400, {
        ok: false,
        error: 'Parametro version obbligatorio',
      });
      return;
    }

    const releasesRegistry = readReleasesRegistry();
    if (releasesRegistry.releases[version]) {
      sendJson(res, 409, {
        ok: false,
        error: 'Versione gia presente',
      });
      return;
    }

    const finalFileName = sanitizeFileName(`release_${version}.zip`, sourceFileName.endsWith('.zip') ? sourceFileName : `${sourceFileName}.zip`);
    const tempFilePath = path.join(RELEASES_DIR, `${finalFileName}.tmp`);
    const finalFilePath = path.join(RELEASES_DIR, finalFileName);

    try {
      const uploadMeta = await saveUploadFromRequest(req, tempFilePath);
      let structureInfo;
      try {
        structureInfo = validateReleaseZipStructure(tempFilePath);
      } catch (_validationErr) {
        throw new Error('Pacchetto non valido');
      }
      if (fs.existsSync(finalFilePath)) {
        fs.rmSync(finalFilePath, { force: true });
      }
      fs.renameSync(tempFilePath, finalFilePath);

      const releaseMetadata = {
        version,
        fileName: finalFileName,
        originalFileName: sourceFileName,
        size: uploadMeta.size,
        sha256: uploadMeta.sha256,
        uploadedAt: nowIso(),
        notes,
        structureRoot: structureInfo.detectedRoot,
      };

      writeReleaseMetadata(releaseMetadata);

      sendJson(res, 200, {
        ok: true,
        release: {
          version: releaseMetadata.version,
          fileName: releaseMetadata.fileName,
          size: releaseMetadata.size,
          sha256: releaseMetadata.sha256,
          uploadedAt: releaseMetadata.uploadedAt,
          notes: releaseMetadata.notes,
          structureRoot: releaseMetadata.structureRoot,
        },
      });
    } catch (err) {
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.rmSync(tempFilePath, { force: true });
        }
      } catch (_cleanupErr) {
        // ignore
      }
      sendJson(res, 400, {
        ok: false,
        error: err.message,
      });
    }
    return;
  }

  if (req.method === 'DELETE' && pathname.startsWith('/api/clients/')) {
    const customerKey = decodeURIComponent(pathname.slice('/api/clients/'.length));
    const deletedClient = deleteClient(customerKey);

    if (!deletedClient) {
      sendJson(res, 404, {
        ok: false,
        error: 'Cliente non trovato',
      });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      deleted: deletedClient,
    });
    return;
  }

  if (req.method === 'DELETE' && pathname.startsWith('/api/releases/')) {
    const version = pathname.slice('/api/releases/'.length);
    const deletedRelease = deleteRelease(version);

    if (!deletedRelease) {
      sendJson(res, 404, {
        ok: false,
        error: 'Release non trovata',
      });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      deleted: deletedRelease,
    });
    return;
  }

  if (req.method === 'GET') {
    const frontendPath = resolveFrontendPath(pathname);
    if (!frontendPath) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Accesso non consentito');
      return;
    }

    serveFrontendFile(res, frontendPath);
    return;
  }

  sendJson(res, 404, {
    ok: false,
    error: 'Endpoint non trovato',
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[dashboard-viewer] backend avviato su http://${HOST}:${PORT}`);
  console.log(`[dashboard-viewer] dashboard: http://localhost:${PORT}`);
  console.log(`[dashboard-viewer] file clients: ${CLIENTS_FILE}`);
  console.log(`[dashboard-viewer] file releases: ${RELEASES_FILE}`);
  console.log(`[dashboard-viewer] file auth: ${AUTH_FILE}`);
  console.log(`[dashboard-viewer] dir pacchetti: ${RELEASES_DIR}`);
});
