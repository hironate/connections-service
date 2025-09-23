const db = require('../../database/models');
const { Connection } = db;

async function createConnection({
  tenantId,
  sub,
  provider,
  authMode,
  authorizedScopes,
  transaction: existingTransaction,
}) {
  const transaction = existingTransaction || (await db.sequelize.transaction());

  try {
    const connection = await Connection.create(
      {
        tenantId,
        sub,
        provider,
        authMode,
        authorizedScopes,
      },
      { transaction },
    );

    if (!existingTransaction) {
      await transaction.commit();
    }

    return connection;
  } catch (error) {
    if (!existingTransaction) {
      await transaction.rollback();
    }
    throw error;
  }
}

async function updateConnection({
  where,
  updateData,
  transaction: existingTransaction,
}) {
  const transaction = existingTransaction || (await db.sequelize.transaction());

  try {
    const connection = await Connection.findOne({
      where,
      transaction,
    });

    if (!connection) {
      if (!existingTransaction) {
        await transaction.rollback();
      }
      return null;
    }

    await connection.update(updateData, { transaction });

    if (!existingTransaction) {
      await transaction.commit();
    }

    return connection;
  } catch (error) {
    if (!existingTransaction) {
      await transaction.rollback();
    }
    throw error;
  }
}

async function getConnectionById(id) {
  return await Connection.findOne({ where: { id } });
}

async function getConnectionsByTenant({ tenantId, filters = {}, transaction }) {
  const where = { tenantId, ...filters };
  return await Connection.findAll({
    where,
    order: [['createdAt', 'DESC']],
    transaction,
  });
}

async function getConnectionsByUser({ sub, filters = {}, transaction }) {
  const where = { sub, ...filters };
  return await Connection.findAll({
    where,
    order: [['createdAt', 'DESC']],
    transaction,
  });
}

/**
 * Update connection status
 * @param {Object} params - The parameters for updating the connection status
 * @param {Object} params.where - The where clause to update the connection
 * @param {"pending" | "active" | "revoked"} params.status - The status to update the connection to
 * @param {Object} params.transaction - The transaction to use for the update
 */
async function updateConnectionStatus({ id, status, existingTransaction }) {
  return await updateConnection({
    where: { id },
    updateData: { status },
    transaction: existingTransaction,
  });
}

async function updateLastUsed({
  userId,
  provider,
  tenantId,
  transaction: existingTransaction,
}) {
  return await updateConnection({
    where: { userId, provider, tenantId },
    updateData: { lastUsedAt: new Date() },
    transaction: existingTransaction,
  });
}

module.exports = {
  createConnection,
  updateConnection,
  getConnectionById,
  getConnectionsByTenant,
  getConnectionsByUser,
  updateConnectionStatus,
  updateLastUsed,
};
