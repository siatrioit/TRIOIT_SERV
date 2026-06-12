"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPushConfigured = isPushConfigured;
exports.getVapidPublicKey = getVapidPublicKey;
exports.upsertPushSubscription = upsertPushSubscription;
exports.removePushSubscription = removePushSubscription;
exports.sendPushToUsers = sendPushToUsers;
exports.firePush = firePush;
exports.notifyNewIncident = notifyNewIncident;
exports.notifyPortalChatMessage = notifyPortalChatMessage;
exports.notifyIncidentReassigned = notifyIncidentReassigned;
const crypto_1 = __importDefault(require("crypto"));
const module_1 = require("module");
const uuid_1 = require("uuid");
const pool_1 = require("../db/pool");
const incidentAssignment_1 = require("./incidentAssignment");
const loadModule = (0, module_1.createRequire)(__filename);
let vapidConfigured = false;
let webPushLib;
function getWebPushLib() {
    if (webPushLib === undefined) {
        try {
            webPushLib = loadModule('web-push');
        }
        catch {
            webPushLib = null;
            console.warn('[push] web-push nav instalēts — push izslēgts, API strādā normāli');
        }
    }
    return webPushLib;
}
function configureVapid() {
    if (vapidConfigured)
        return true;
    const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
    const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
    const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:admin@trioit.lv';
    if (!publicKey || !privateKey)
        return false;
    const webpush = getWebPushLib();
    if (!webpush)
        return false;
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
    return true;
}
function isPushConfigured() {
    const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
    const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
    if (!publicKey || !privateKey)
        return false;
    return getWebPushLib() !== null;
}
function getVapidPublicKey() {
    return process.env.VAPID_PUBLIC_KEY?.trim() || null;
}
function hashEndpoint(endpoint) {
    return crypto_1.default.createHash('sha256').update(endpoint).digest('hex');
}
async function upsertPushSubscription(userId, endpoint, p256dh, auth, userAgent) {
    const endpointHash = hashEndpoint(endpoint);
    const existing = await (0, pool_1.queryOne)('SELECT id FROM push_subscriptions WHERE endpoint_hash = ?', [endpointHash]);
    if (existing) {
        await (0, pool_1.query)(`UPDATE push_subscriptions
       SET user_id = ?, endpoint = ?, p256dh = ?, auth = ?, user_agent = ?
       WHERE endpoint_hash = ?`, [userId, endpoint, p256dh, auth, userAgent ?? null, endpointHash]);
        return;
    }
    await (0, pool_1.query)(`INSERT INTO push_subscriptions (id, user_id, endpoint, endpoint_hash, p256dh, auth, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?)`, [(0, uuid_1.v4)(), userId, endpoint, endpointHash, p256dh, auth, userAgent ?? null]);
}
async function removePushSubscription(userId, endpoint) {
    await (0, pool_1.query)('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint_hash = ?', [
        userId,
        hashEndpoint(endpoint),
    ]);
}
async function listSubscriptionsForUsers(userIds) {
    if (userIds.length === 0)
        return [];
    const placeholders = userIds.map(() => '?').join(', ');
    return (0, pool_1.query)(`SELECT id, user_id, endpoint, p256dh, auth
     FROM push_subscriptions
     WHERE user_id IN (${placeholders})`, userIds);
}
async function deleteSubscriptionById(id) {
    await (0, pool_1.query)('DELETE FROM push_subscriptions WHERE id = ?', [id]);
}
async function sendPushToUsers(userIds, payload, excludeUserId) {
    if (!configureVapid())
        return;
    const webpush = getWebPushLib();
    if (!webpush)
        return;
    const recipients = [...new Set(userIds.filter((id) => id && id !== excludeUserId))];
    if (recipients.length === 0)
        return;
    const subscriptions = await listSubscriptionsForUsers(recipients);
    const body = JSON.stringify(payload);
    await Promise.all(subscriptions.map(async (sub) => {
        try {
            await webpush.sendNotification({
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
            }, body);
        }
        catch (err) {
            const statusCode = err && typeof err === 'object' && 'statusCode' in err
                ? Number(err.statusCode)
                : 0;
            if (statusCode === 404 || statusCode === 410) {
                await deleteSubscriptionById(sub.id);
            }
            else {
                console.error('[push] send failed:', statusCode || err);
            }
        }
    }));
}
function firePush(task) {
    task().catch((err) => console.error('[push] notification error:', err));
}
async function notifyNewIncident(params) {
    const userIds = params.assignedTo
        ? [params.assignedTo]
        : await (0, incidentAssignment_1.listAssignableStaffUserIds)();
    const body = params.objectName
        ? `${params.objectName} — ${params.title}`
        : params.title;
    await sendPushToUsers(userIds, {
        title: `Jauns izsaukums ${params.incidentNumber}`,
        body,
        url: `/incidents/${params.incidentId}`,
        tag: `incident-${params.incidentId}`,
    }, params.excludeUserId);
}
async function notifyPortalChatMessage(params) {
    const userIds = params.assignedTo
        ? [params.assignedTo]
        : await (0, incidentAssignment_1.listAssignableStaffUserIds)();
    const preview = params.messagePreview.length > 120
        ? `${params.messagePreview.slice(0, 117)}...`
        : params.messagePreview;
    await sendPushToUsers(userIds, {
        title: `Čats: ${params.incidentNumber}`,
        body: `${params.authorName}: ${preview}`,
        url: `/incidents/${params.incidentId}`,
        tag: `chat-${params.incidentId}`,
    });
}
async function notifyIncidentReassigned(params) {
    await sendPushToUsers([params.assigneeId], {
        title: `Pārvirzīts izsaukums ${params.incidentNumber}`,
        body: params.title,
        url: `/incidents/${params.incidentId}`,
        tag: `incident-${params.incidentId}`,
    }, params.excludeUserId);
}
//# sourceMappingURL=pushNotifications.js.map