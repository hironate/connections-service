'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Connection extends Model {
    static associate(models) {}

    async incrementVersion(transaction = null) {
      this.connectionVersion += 1;
      return await this.save({ transaction });
    }

    async revoke(transaction = null) {
      this.status = 'revoked';
      return await this.save({ transaction });
    }

    async activate(transaction = null) {
      if (this.status === 'pending') {
        this.status = 'active';
        return await this.save({ transaction });
      }
      throw new Error('Can only activate pending connections');
    }

    async updateLastAccessed(transaction = null) {
      this.lastAccessedAt = new Date();
      return await this.save({ transaction });
    }
  }

  Connection.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      connectionId: {
        type: DataTypes.STRING(50),
        unique: true,
      },
      tenantId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      sub: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      provider: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      providerAccount: {
        type: DataTypes.JSONB,
        allowNull: true,
      },

      status: {
        type: DataTypes.ENUM('pending', 'active', 'revoked'),
        allowNull: false,
        defaultValue: 'pending',
        validate: {
          isIn: [['pending', 'active', 'revoked']],
        },
      },
      connectionVersion: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      authorizedScopes: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      authMode: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      lastAccessedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      revokedAt: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
    },
    {
      sequelize,
      modelName: 'Connection',
      tableName: 'Connections',
      timestamps: true,
    },
  );

  return Connection;
};
