import { getDatabase } from '../database';
import { generateUUID } from '../../utils/uuid';
import { SyncOutboxDao } from './SyncOutboxDao';

export const InvestmentDao = {
  // ================= Holdings =================

  async getHoldings() {
    const db = await getDatabase();
    const rows = await db.getAllAsync(
      `SELECT * FROM investment_holdings WHERE is_deleted = 0 ORDER BY symbol ASC`
    );
    return rows.map((r) => ({
      _id: r.server_id || r.client_id,
      client_id: r.client_id,
      server_id: r.server_id,
      symbol: r.symbol,
      name: r.name,
      assetClass: r.asset_class,
      quantity: r.quantity,
      avgBuyPrice: r.avg_buy_price,
      lastKnownPrice: r.last_known_price,
      currency: r.currency,
      exchange: r.exchange,
      notes: r.notes,
      syncStatus: r.sync_status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  },

  async saveHolding(data, isSyncPull = false) {
    const db = await getDatabase();
    const clientId = data.client_id || data.clientId || generateUUID();
    const serverId = data.server_id || data.serverId || data._id || null;
    const symbol = data.symbol || data.symbolOrCode || data.symbol_or_code || '';
    const name = data.name || data.instrumentName || data.instrument_name || symbol;
    const avgBuyPrice = Number(
      data.avgBuyPrice ?? data.averageBuyPrice ?? data.avg_buy_price ?? data.buyPrice ?? 0
    );
    const lastKnownPrice = Number(
      data.lastKnownPrice ??
        data.latestPrice ??
        data.last_known_price ??
        data.currentPrice ??
        data.current_price ??
        avgBuyPrice
    );
    const now = new Date().toISOString();

    const existing = await db.getFirstAsync(
      `SELECT client_id, server_id FROM investment_holdings WHERE client_id = ? OR (server_id IS NOT NULL AND server_id = ?)`,
      [clientId, serverId]
    );

    if (existing) {
      await db.runAsync(
        `UPDATE investment_holdings SET
          server_id = COALESCE(?, server_id),
          symbol = ?, name = ?, asset_class = ?, quantity = ?, avg_buy_price = ?,
          last_known_price = ?, currency = ?, exchange = ?, notes = ?,
          sync_status = ?, is_deleted = ?, updated_at = ?
         WHERE client_id = ?`,
        [
          serverId,
          symbol,
          name,
          data.assetClass || data.asset_class || 'Equity',
          Number(data.quantity || 0),
          avgBuyPrice,
          lastKnownPrice,
          data.currency || 'INR',
          data.exchange || 'NSE',
          data.notes || '',
          isSyncPull ? 'SYNCED' : 'PENDING_UPDATE',
          data.isDeleted || data.is_deleted ? 1 : 0,
          now,
          existing.client_id,
        ]
      );
      if (!isSyncPull) {
        await SyncOutboxDao.enqueueMutation('investment_holding', 'UPDATE', existing.client_id, {
          ...data,
          _id: existing.server_id || serverId,
        });
      }
      return existing.client_id;
    } else {
      await db.runAsync(
        `INSERT INTO investment_holdings (
          client_id, server_id, symbol, name, asset_class, quantity, avg_buy_price,
          last_known_price, currency, exchange, notes, sync_status, is_deleted, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          clientId,
          serverId,
          symbol,
          name,
          data.assetClass || data.asset_class || 'Equity',
          Number(data.quantity || 0),
          avgBuyPrice,
          lastKnownPrice,
          data.currency || 'INR',
          data.exchange || 'NSE',
          data.notes || '',
          isSyncPull ? 'SYNCED' : 'PENDING_CREATE',
          now,
          now,
        ]
      );
      if (!isSyncPull) {
        await SyncOutboxDao.enqueueMutation('investment_holding', 'CREATE', clientId, data);
      }
      return clientId;
    }
  },

  async deleteHolding(clientId, isSyncPull = false) {
    const db = await getDatabase();
    const existing = await db.getFirstAsync(
      `SELECT client_id, server_id FROM investment_holdings WHERE client_id = ? OR server_id = ?`,
      [clientId, clientId]
    );
    if (!existing) return;

    await db.runAsync(
      `UPDATE investment_holdings SET is_deleted = 1, sync_status = ? WHERE client_id = ?`,
      [isSyncPull ? 'SYNCED' : 'PENDING_DELETE', existing.client_id]
    );

    if (!isSyncPull) {
      await SyncOutboxDao.enqueueMutation('investment_holding', 'DELETE', existing.client_id, {
        _id: existing.server_id,
      });
    }
  },

  // ================= Trades & Transactions =================

  async executeTransaction(txData, isSyncPull = false) {
    const db = await getDatabase();
    const txClientId = txData.client_id || txData.clientId || generateUUID();
    const now = new Date().toISOString();

    const symbol = String(txData.symbol || txData.symbolOrCode || '').toUpperCase();
    const type = String(txData.type || '').toUpperCase(); // 'BUY' or 'SELL'
    const qty = Number(txData.quantity ?? txData.units ?? 0);
    const price = Number(txData.price ?? txData.pricePerUnit ?? 0);
    const holdingClientId = txData.holdingClientId || txData.holding_client_id || txData.holdingId || null;
    const serverId = txData.server_id || txData.serverId || txData._id || null;

    if (!symbol || !['BUY', 'SELL'].includes(type) || qty <= 0 || price < 0) {
      throw new Error('Invalid investment transaction payload');
    }

    // Run within transaction
    await db.withTransactionAsync(async () => {
      // 1. Insert transaction record
      await db.runAsync(
        `INSERT INTO investment_transactions (
          client_id, server_id, holding_client_id, symbol, type, quantity, price, fees, date,
          is_deleted, sync_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
        [
          txClientId,
          serverId,
          holdingClientId,
          symbol,
          type,
          qty,
          price,
          Number(txData.fees || 0),
          txData.date ? new Date(txData.date).toISOString() : now,
          isSyncPull ? 'SYNCED' : 'PENDING_CREATE',
          now,
          now,
        ]
      );

      // 2. Adjust holding quantity and avg purchase price
      const holding = await db.getFirstAsync(
        `SELECT * FROM investment_holdings WHERE symbol = ? AND is_deleted = 0`,
        [symbol]
      );

      if (holding) {
        let newQty = holding.quantity;
        let newAvgPrice = holding.avg_buy_price;

        if (type === 'BUY') {
          const totalCost = (holding.quantity * holding.avg_buy_price) + (qty * price);
          newQty = holding.quantity + qty;
          newAvgPrice = newQty > 0 ? totalCost / newQty : price;
        } else if (type === 'SELL') {
          newQty = Math.max(0, holding.quantity - qty);
        }

        await db.runAsync(
          `UPDATE investment_holdings SET 
            quantity = ?, avg_buy_price = ?, last_known_price = ?, 
            sync_status = ?, updated_at = ?
           WHERE client_id = ?`,
          [newQty, newAvgPrice, price, isSyncPull ? 'SYNCED' : 'PENDING_UPDATE', now, holding.client_id]
        );
      }
    });

    if (!isSyncPull) {
      await SyncOutboxDao.enqueueMutation('investment_transaction', 'CREATE', txClientId, txData);
    }

    return txClientId;
  },

  async getTransactions(holdingClientId = null) {
    const db = await getDatabase();
    let sql = `SELECT * FROM investment_transactions WHERE is_deleted = 0`;
    const params = [];
    if (holdingClientId) {
      sql += ` AND (holding_client_id = ? OR symbol = ?)`;
      params.push(holdingClientId, holdingClientId);
    }
    sql += ` ORDER BY date DESC, created_at DESC`;
    return await db.getAllAsync(sql, params);
  },

  async computeAnalytics() {
    const holdings = await this.getHoldings();
    const totalValue = holdings.reduce(
      (sum, holding) => sum + Number(holding.quantity || 0) * Number(holding.lastKnownPrice || holding.avgBuyPrice || 0),
      0
    );
    const groups = (selector) => {
      const map = new Map();
      holdings.forEach((holding) => {
        const name = selector(holding);
        const value =
          Number(holding.quantity || 0) * Number(holding.lastKnownPrice || holding.avgBuyPrice || 0);
        const item = {
          id: holding._id,
          instrumentName: holding.name,
          symbolOrCode: holding.symbol,
          assetClass: holding.assetClass,
          quantity: holding.quantity,
          latestPrice: holding.lastKnownPrice || holding.avgBuyPrice,
          value: Number(value.toFixed(2)),
        };
        const group = map.get(name) || { value: 0, items: [] };
        group.value += value;
        group.items.push(item);
        map.set(name, group);
      });
      return Array.from(map.entries()).map(([name, group]) => ({
        name,
        value: Number(group.value.toFixed(2)),
        percent: totalValue > 0 ? Number(((group.value / totalValue) * 100).toFixed(2)) : 0,
        items: group.items,
      }));
    };

    return {
      holdingsCount: holdings.length,
      totalValue: Number(totalValue.toFixed(2)),
      byAssetClass: groups((holding) => holding.assetClass || 'Other'),
      bySector: groups((holding) => holding.assetClass || 'Other'),
      byMarketCap: groups((holding) => holding.assetClass === 'Equity' ? 'Equity' : 'Non-Equity / Safe'),
      byRiskLevel: groups((holding) => holding.assetClass === 'Equity' ? 'Moderate Risk' : 'Low Risk'),
      byMonth: [],
    };
  },

  // ================= Local Valuation Summary =================

  async computeSummary() {
    const holdings = await this.getHoldings();
    let totalInvested = 0;
    let currentValuation = 0;

    holdings.forEach((h) => {
      const invested = h.quantity * h.avgBuyPrice;
      const current = h.quantity * (h.lastKnownPrice || h.avgBuyPrice);
      totalInvested += invested;
      currentValuation += current;
    });

    const totalGain = currentValuation - totalInvested;
    const returnPercentage = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

    return {
      totalInvested: Math.round(totalInvested * 100) / 100,
      currentValuation: Math.round(currentValuation * 100) / 100,
      totalGain: Math.round(totalGain * 100) / 100,
      returnPercentage: Math.round(returnPercentage * 100) / 100,
      holdingsCount: holdings.length,
    };
  },
};

export default InvestmentDao;
