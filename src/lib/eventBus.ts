type EventPayload = {
  type: string;
  [key: string]: any;
};

type Broadcaster = (payload: EventPayload) => void;

let broadcaster: Broadcaster | null = null;

export function setBroadcaster(fn: Broadcaster) {
  broadcaster = fn;
}

export function emit(payload: EventPayload) {
  if (broadcaster) {
    broadcaster(payload);
  } else {
    console.warn('EventBus: No broadcaster set, event lost:', payload);
  }
}

export function emitTransactionEvent(transactionId: string, type: string, data: any) {
  emit({
    type: `transaction.${type}`,
    transactionId,
    timestamp: new Date().toISOString(),
    ...data
  });
}

export function emitReputationEvent(agentDid: string, type: string, data: any) {
  emit({
    type: `reputation.${type}`,
    agentDid,
    timestamp: new Date().toISOString(),
    ...data
  });
}

export function emitWalletEvent(walletId: string, type: string, data: any) {
  emit({
    type: `wallet.${type}`,
    walletId,
    timestamp: new Date().toISOString(),
    ...data
  });
}
