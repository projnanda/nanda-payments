"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NandaPointsSDK = void 0;
var axios_1 = require("axios");
var NandaPointsSDK = /** @class */ (function () {
    function NandaPointsSDK(baseUrl, apiKey) {
        if (baseUrl === void 0) { baseUrl = 'http://localhost:3001'; }
        this.baseUrl = baseUrl;
        this.client = axios_1.default.create({
            baseURL: baseUrl,
            headers: __assign({ 'Content-Type': 'application/json' }, (apiKey && { 'Authorization': "Bearer ".concat(apiKey) })),
            timeout: 10000
        });
    }
    // ===== CORE TRANSACTION METHODS =====
    /**
     * Earn points for an agent
     * @param amount - Amount in minor units (e.g., 1000 = 1.000 NP)
     * @param walletId - Destination wallet ID
     * @param reasonCode - Reason for earning points
     * @param idempotencyKey - Unique key to prevent duplicate transactions
     */
    NandaPointsSDK.prototype.earnPoints = function (amount_1, walletId_1) {
        return __awaiter(this, arguments, void 0, function (amount, walletId, reasonCode, idempotencyKey) {
            var response;
            if (reasonCode === void 0) { reasonCode = 'TASK_COMPLETION'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.post('/transactions', {
                            type: 'mint',
                            destWalletId: walletId,
                            amount: { currency: "NP", scale: 3, value: amount },
                            reasonCode: reasonCode,
                            idempotencyKey: idempotencyKey || "earn-".concat(Date.now(), "-").concat(Math.random())
                        })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    /**
     * Spend points from an agent's wallet
     * @param amount - Amount in minor units
     * @param walletId - Source wallet ID
     * @param reasonCode - Reason for spending points
     * @param idempotencyKey - Unique key to prevent duplicate transactions
     */
    NandaPointsSDK.prototype.spendPoints = function (amount_1, walletId_1) {
        return __awaiter(this, arguments, void 0, function (amount, walletId, reasonCode, idempotencyKey) {
            var response;
            if (reasonCode === void 0) { reasonCode = 'SERVICE_PAYMENT'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.post('/transactions', {
                            type: 'burn',
                            sourceWalletId: walletId,
                            amount: { currency: "NP", scale: 3, value: amount },
                            reasonCode: reasonCode,
                            idempotencyKey: idempotencyKey || "spend-".concat(Date.now(), "-").concat(Math.random())
                        })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    /**
     * Transfer points between wallets
     * @param amount - Amount in minor units
     * @param fromWalletId - Source wallet ID
     * @param toWalletId - Destination wallet ID
     * @param reasonCode - Reason for transfer
     * @param idempotencyKey - Unique key to prevent duplicate transactions
     */
    NandaPointsSDK.prototype.transferPoints = function (amount_1, fromWalletId_1, toWalletId_1) {
        return __awaiter(this, arguments, void 0, function (amount, fromWalletId, toWalletId, reasonCode, idempotencyKey) {
            var response;
            if (reasonCode === void 0) { reasonCode = 'TASK_PAYOUT'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.post('/transactions', {
                            type: 'transfer',
                            sourceWalletId: fromWalletId,
                            destWalletId: toWalletId,
                            amount: { currency: "NP", scale: 3, value: amount },
                            reasonCode: reasonCode,
                            idempotencyKey: idempotencyKey || "transfer-".concat(Date.now(), "-").concat(Math.random())
                        })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    // ===== REPUTATION-ENHANCED TRANSACTIONS =====
    /**
     * Transfer points with reputation verification
     * @param amount - Amount in minor units
     * @param fromWalletId - Source wallet ID
     * @param toWalletId - Destination wallet ID
     * @param reputationHash - Encrypted reputation score
     * @param actorDid - Agent DID
     * @param reasonCode - Reason for transfer
     * @param idempotencyKey - Unique key to prevent duplicate transactions
     */
    NandaPointsSDK.prototype.transferPointsWithReputation = function (amount_1, fromWalletId_1, toWalletId_1, reputationHash_1, actorDid_1) {
        return __awaiter(this, arguments, void 0, function (amount, fromWalletId, toWalletId, reputationHash, actorDid, reasonCode, idempotencyKey) {
            var response;
            if (reasonCode === void 0) { reasonCode = 'TASK_PAYOUT'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.post('/transactions/with-reputation', {
                            type: 'transfer',
                            sourceWalletId: fromWalletId,
                            destWalletId: toWalletId,
                            amount: { currency: "NP", scale: 3, value: amount },
                            reasonCode: reasonCode,
                            idempotencyKey: idempotencyKey || "reputation-transfer-".concat(Date.now(), "-").concat(Math.random()),
                            actor: {
                                type: 'agent',
                                did: actorDid
                            },
                            reputationHash: reputationHash
                        })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    // ===== WALLET MANAGEMENT =====
    /**
     * Create a new wallet for an agent
     * @param agentDid - Agent DID
     * @param type - Wallet type (user, treasury, fee_pool, escrow)
     */
    NandaPointsSDK.prototype.createWallet = function (agentDid_1) {
        return __awaiter(this, arguments, void 0, function (agentDid, type) {
            var response;
            if (type === void 0) { type = 'user'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.post('/wallets', {
                            did: agentDid,
                            type: type
                        })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    /**
     * Get wallet information
     * @param walletId - Wallet ID
     */
    NandaPointsSDK.prototype.getWallet = function (walletId) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.get("/wallets/".concat(walletId))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    /**
     * Get wallet balance
     * @param walletId - Wallet ID
     */
    NandaPointsSDK.prototype.getWalletBalance = function (walletId) {
        return __awaiter(this, void 0, void 0, function () {
            var wallet;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getWallet(walletId)];
                    case 1:
                        wallet = _a.sent();
                        return [2 /*return*/, wallet.balance];
                }
            });
        });
    };
    // ===== AGENT MANAGEMENT =====
    /**
     * Create a new agent
     * @param agentData - Agent information
     */
    NandaPointsSDK.prototype.createAgent = function (agentData) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.post('/agents', agentData)];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    /**
     * Get agent information
     * @param did - Agent DID
     */
    NandaPointsSDK.prototype.getAgent = function (did) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.get("/agents/".concat(encodeURIComponent(did)))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    // ===== INVOICE MANAGEMENT =====
    /**
     * Create a new invoice
     * @param invoiceData - Invoice information
     */
    NandaPointsSDK.prototype.createInvoice = function (invoiceData) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.post('/invoices', invoiceData)];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    /**
     * Issue an invoice (change status from draft to issued)
     * @param invoiceId - Invoice ID
     */
    NandaPointsSDK.prototype.issueInvoice = function (invoiceId) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.post("/invoices/".concat(invoiceId, "/issue"), {})];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    /**
     * Pay an invoice
     * @param invoiceId - Invoice ID
     * @param amount - Payment amount
     * @param walletId - Paying wallet ID
     * @param idempotencyKey - Unique key to prevent duplicate payments
     */
    NandaPointsSDK.prototype.payInvoice = function (invoiceId, amount, walletId, idempotencyKey) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.post("/invoices/".concat(invoiceId, "/pay"), {
                            amount: amount,
                            walletId: walletId,
                            idempotencyKey: idempotencyKey || "invoice-payment-".concat(Date.now(), "-").concat(Math.random())
                        })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    // ===== REPUTATION SYSTEM =====
    /**
     * Get reputation requirements for a transaction type
     * @param transactionType - Type of transaction
     * @param amount - Transaction amount
     */
    NandaPointsSDK.prototype.getReputationRequirements = function (transactionType, amount) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.get("/reputation/requirements?transactionType=".concat(transactionType, "&amount=").concat(amount))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    /**
     * Generate reputation verification keys
     */
    NandaPointsSDK.prototype.generateReputationKeys = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.post('/reputation/generate-keys')];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data.keys];
                }
            });
        });
    };
    /**
     * Get agent reputation score
     * @param agentDid - Agent DID
     * @returns Promise<ReputationScoreResponse>
     */
    NandaPointsSDK.prototype.getAgentReputation = function (agentDid) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.get("/agents/".concat(agentDid, "/reputation"))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    /**
     * Verify agent reputation hash
     * @param agentDid - Agent DID
     * @param reputationHash - Encrypted reputation hash
     * @returns Promise<ReputationVerificationResponse>
     */
    NandaPointsSDK.prototype.verifyAgentReputation = function (agentDid, reputationHash) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.post("/agents/".concat(agentDid, "/reputation/verify"), {
                            reputationHash: reputationHash
                        })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    // ===== TRANSACTION QUERIES =====
    /**
     * Get transaction by ID
     * @param transactionId - Transaction ID
     */
    NandaPointsSDK.prototype.getTransaction = function (transactionId) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.get("/transactions/".concat(transactionId))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    /**
     * Get transactions for a wallet
     * @param walletId - Wallet ID
     * @param limit - Number of transactions to return
     * @param after - Cursor for pagination
     */
    NandaPointsSDK.prototype.getWalletTransactions = function (walletId_1) {
        return __awaiter(this, arguments, void 0, function (walletId, limit, after) {
            var params, response;
            if (limit === void 0) { limit = 50; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        params = new URLSearchParams(__assign({ walletId: walletId, limit: limit.toString() }, (after && { after: after })));
                        return [4 /*yield*/, this.client.get("/transactions?".concat(params))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    // ===== UTILITY METHODS =====
    /**
     * Check if the API is healthy
     */
    NandaPointsSDK.prototype.healthCheck = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.get('/health')];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    /**
     * Format points amount for display
     * @param amount - Amount in minor units
     * @param scale - Decimal scale (default: 3)
     */
    NandaPointsSDK.prototype.formatPoints = function (amount, scale) {
        if (scale === void 0) { scale = 3; }
        var divisor = Math.pow(10, scale);
        return (amount / divisor).toFixed(scale) + ' NP';
    };
    /**
     * Parse points amount from display format
     * @param pointsString - Points string (e.g., "1.500 NP")
     * @param scale - Decimal scale (default: 3)
     */
    NandaPointsSDK.prototype.parsePoints = function (pointsString, scale) {
        if (scale === void 0) { scale = 3; }
        var numericPart = pointsString.replace(' NP', '');
        return Math.round(parseFloat(numericPart) * Math.pow(10, scale));
    };
    return NandaPointsSDK;
}());
exports.NandaPointsSDK = NandaPointsSDK;
