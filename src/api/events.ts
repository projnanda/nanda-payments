import { Router } from "express";
import { z } from "zod";
import { EventModel } from "../models/Event.js";

export const events = Router();

// Get events by agent DID
events.get("/events/by-agent/:did", async (req, res) => {
  const { limit = "50", after, type } = req.query as any;
  const filter: any = {
    $or: [
      { "payload.from.did": req.params.did },
      { "payload.to.did": req.params.did }
    ]
  };

  // Optional type filter
  if (type) {
    filter.type = type;
  }

  // Pagination
  if (after) {
    filter._id = { $lt: after };
  }

  try {
    const events = await EventModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(parseInt(limit, 10));

    res.json({
      events,
      pagination: {
        limit: parseInt(limit, 10),
        hasMore: events.length === parseInt(limit, 10),
        nextCursor: events.length > 0 ? events[events.length - 1]._id : null
      }
    });
  } catch (e: any) {
    res.status(500).json({ 
      error: { 
        code: "FETCH_ERROR", 
        message: e?.message ?? "Error fetching events" 
      } 
    });
  }
});

// Get event by ID
events.get("/events/:eventId", async (req, res) => {
  try {
    const event = await EventModel.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ 
        error: { 
          code: "NOT_FOUND", 
          message: "Event not found" 
        } 
      });
    }
    res.json(event);
  } catch (e: any) {
    res.status(500).json({ 
      error: { 
        code: "FETCH_ERROR", 
        message: e?.message ?? "Error fetching event" 
      } 
    });
  }
});

// List all events with filtering
events.get("/events", async (req, res) => {
  const { 
    type, 
    did, 
    walletId, 
    startDate, 
    endDate, 
    limit = "50", 
    after 
  } = req.query as any;

  const filter: any = {};

  // Type filter
  if (type) {
    filter.type = type;
  }

  // DID filter (checks both from and to)
  if (did) {
    filter.$or = [
      { "payload.from.did": did },
      { "payload.to.did": did }
    ];
  }

  // Wallet filter
  if (walletId) {
    filter.affectedWallets = walletId;
  }

  // Date range filter
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  // Pagination
  if (after) {
    filter._id = { $lt: after };
  }

  try {
    const events = await EventModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(parseInt(limit, 10));

    res.json({
      events,
      pagination: {
        limit: parseInt(limit, 10),
        hasMore: events.length === parseInt(limit, 10),
        nextCursor: events.length > 0 ? events[events.length - 1]._id : null
      }
    });
  } catch (e: any) {
    res.status(500).json({ 
      error: { 
        code: "FETCH_ERROR", 
        message: e?.message ?? "Error fetching events" 
      } 
    });
  }
});