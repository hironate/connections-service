'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Connections', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      connectionId: {
        type: Sequelize.STRING(50),
        unique: true,
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      sub: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      provider: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      providerAccount: {
        type: Sequelize.JSONB,
        allowNull: true,
      },

      status: {
        type: Sequelize.ENUM('pending', 'active', 'revoked'),
        allowNull: false,
        defaultValue: 'pending',
      },
      connectionVersion: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      authorizedScopes: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      authMode: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },

      // TODO: Encrypted Token Storage

      lastAccessedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      revokedAt: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Connections');
  },
};
