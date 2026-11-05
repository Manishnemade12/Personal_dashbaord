/**
 * Mongoose Sync Plugin for Offline-First Architecture.
 * Adds synchronization fields and hooks for tracking mutations and soft-deletes.
 */
module.exports = function syncPlugin(schema, options = {}) {
  schema.add({
    clientId: {
      type: String,
      sparse: true,
      index: true,
      trim: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    serverUpdatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastMutationId: {
      type: String,
      default: null,
    },
  });

  // Automatically update serverUpdatedAt on any save or update in Mongoose 8/9
  schema.pre('save', function () {
    this.serverUpdatedAt = new Date();
  });

  schema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function () {
    this.set({ serverUpdatedAt: new Date() });
  });
};
