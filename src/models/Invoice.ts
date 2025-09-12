import mongoose, { Schema, InferSchemaType } from "mongoose";
import { NP_CURRENCY, NP_SCALE } from "./constants.js";

const InvoiceSchema = new Schema({
  invoiceNumber: { type: String, unique: true }, // Removed required as it's auto-generated
  status: { 
    type: String, 
    enum: ["draft", "issued", "paid", "cancelled", "expired"],
    default: "draft"
  },
  
  // Amount details
  amount: {
    currency: { type: String, default: NP_CURRENCY },
    scale: { type: Number, default: NP_SCALE },
    value: { type: Number, required: true }
  },

  // Parties involved
  issuer: {
    did: { type: String, required: true },
    walletId: { type: String, required: true }
  },
  recipient: {
    did: { type: String, required: true },
    walletId: { type: String }  // Optional as recipient might pay from different wallet
  },

  // Payment details
  paymentTerms: {
    dueDate: Date,
    acceptPartial: { type: Boolean, default: false },
    minAmount: Number,
    allowOverpayment: { type: Boolean, default: false },
    maxAmount: Number
  },

  // Associated transactions
  transactions: [{
    txId: { type: String, required: true },
    amount: { type: Number, required: true },
    timestamp: { type: Date, required: true }
  }],

  // Metadata
  metadata: {
    memo: String,
    description: String,
    items: [{
      description: String,
      quantity: Number,
      unitPrice: Number,
      amount: Number
    }],
    tags: [String],
    externalRef: String
  },

  // Timestamps
  issuedAt: Date,
  paidAt: Date,
  expiresAt: Date,
  cancelledAt: Date
}, { 
  timestamps: true,
  
  // Add method to calculate total paid amount
  methods: {
    getTotalPaid: function() {
      return this.transactions?.reduce((sum, tx) => sum + tx.amount, 0) ?? 0;
    }
  }
});

// Add method to Document type
InvoiceSchema.method('getTotalPaid', function() {
  return this.transactions?.reduce((sum, tx) => sum + tx.amount, 0) ?? 0;
});

// Indexes
InvoiceSchema.index({ "issuer.did": 1 });
InvoiceSchema.index({ "recipient.did": 1 });
InvoiceSchema.index({ status: 1 });
InvoiceSchema.index({ invoiceNumber: 1 }, { unique: true });

// Auto-generate invoice number
InvoiceSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    const date = new Date();
    const prefix = 'INV';
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const counter = await mongoose.model('invoices').countDocuments() + 1;
    this.invoiceNumber = `${prefix}${year}${month}-${counter.toString().padStart(4, '0')}`;
  }
  next();
});

export type InvoiceDoc = InferSchemaType<typeof InvoiceSchema>;
export const InvoiceModel = mongoose.model<InvoiceDoc>("invoices", InvoiceSchema);
