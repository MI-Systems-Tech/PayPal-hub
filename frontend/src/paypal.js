const SUBSCRIPTIONS_KEY = "hub_paypal_subscriptions";
const PENDING_ORDER_KEY = "hub_paypal_pending_order";
const PENDING_SUBSCRIPTION_KEY = "hub_paypal_pending_subscription";

function read(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable in a restricted browser context.
  }
}

export function getPayPalSubscriptions() {
  const rows = read(SUBSCRIPTIONS_KEY, []);
  return Array.isArray(rows) ? rows : [];
}

export function savePayPalSubscription(row) {
  const rows = getPayPalSubscriptions();
  const next = [
    ...rows.filter(
      (item) => item.subscription_id !== row.subscription_id
    ),
    row,
  ];
  write(SUBSCRIPTIONS_KEY, next);
  return next;
}

export function updatePayPalSubscription(subscriptionId, changes) {
  const rows = getPayPalSubscriptions().map((item) =>
    item.subscription_id === subscriptionId
      ? { ...item, ...changes }
      : item
  );
  write(SUBSCRIPTIONS_KEY, rows);
  return rows;
}

export function removePayPalSubscription(subscriptionId) {
  const rows = getPayPalSubscriptions().filter(
    (item) => item.subscription_id !== subscriptionId
  );
  write(SUBSCRIPTIONS_KEY, rows);
  return rows;
}

export function setPendingOrder(orderId) {
  write(PENDING_ORDER_KEY, orderId);
}

export function getPendingOrderId() {
  return read(PENDING_ORDER_KEY, null);
}

export function clearPendingOrder() {
  try {
    localStorage.removeItem(PENDING_ORDER_KEY);
  } catch {}
}

export function setPendingSubscription(subscriptionId) {
  write(PENDING_SUBSCRIPTION_KEY, subscriptionId);
}

export function getPendingSubscriptionId() {
  return read(PENDING_SUBSCRIPTION_KEY, null);
}

export function clearPendingSubscription() {
  try {
    localStorage.removeItem(PENDING_SUBSCRIPTION_KEY);
  } catch {}
}
