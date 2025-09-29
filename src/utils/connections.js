const crypto = require('crypto');

const BASE58_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Encodes a buffer to base58
 * @param {Buffer} buffer - Buffer to encode
 * @returns {string} Base58 encoded string
 */
function encodeBase58(buffer) {
  if (buffer.length === 0) return '';

  let num = BigInt('0x' + buffer.toString('hex'));
  let result = '';

  while (num > 0) {
    const remainder = num % 58n;
    result = BASE58_ALPHABET[Number(remainder)] + result;
    num = num / 58n;
  }

  for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
    result = BASE58_ALPHABET[0] + result;
  }

  return result;
}

function generateConnectionId() {
  const randomBytes = crypto.randomBytes(12);
  const base58String = encodeBase58(randomBytes);
  return `conn_${base58String}`;
}

function normalizeScopes(scopes) {
  return scopes.map((scope) => scope.toLowerCase());
}

/**
 * Filters connection data to only include non-confidential fields
 * @param {Object} connection - The connection object from database
 * @returns {Object} - Filtered connection object with only safe fields
 */
function filterConnectionData(connection) {
  if (!connection) return null;

  const connectionData = connection.toJSON ? connection.toJSON() : connection;

  return {
    id: connectionData.id,
    tenantId: connectionData.tenantId,
    sub: connectionData.sub,
    provider: connectionData.provider,
    status: connectionData.status,
    scopes: connectionData.authorizedScopes,
    authMode: connectionData.authMode,
    lastAccessedAt: connectionData.lastAccessedAt,
    createdAt: connectionData.createdAt,
    updatedAt: connectionData.updatedAt,
  };
}

module.exports = {
  generateConnectionId,
  encodeBase58,
  normalizeScopes,
  filterConnectionData,
};
