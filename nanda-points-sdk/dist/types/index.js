"use strict";
// ===== CORE TYPES =====
Object.defineProperty(exports, "__esModule", { value: true });
exports.NandaPointsError = void 0;
class NandaPointsError extends Error {
    constructor(message, code, details) {
        super(message);
        this.name = 'NandaPointsError';
        this.code = code;
        this.details = details;
    }
}
exports.NandaPointsError = NandaPointsError;
//# sourceMappingURL=index.js.map