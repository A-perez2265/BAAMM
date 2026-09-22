// Shared exchange statuses for the Exchange Engine (Augustine).
// Mario can map these to dashboard badges. Do not invent extra statuses
// in other files — import these instead.

export const EXCHANGE_STATUS = {
  PENDING: 'pending',
  DECLINED: 'declined',
  ACCEPTED: 'accepted',
  AWAITING_CONFIRMATION: 'awaiting_confirmation',
  CONFIRMED: 'confirmed',
  DISPUTED: 'disputed',
}

// Who is allowed to move an exchange to the next status.
// Credits do not move until CONFIRMED (that RPC is a later section).
export const EXCHANGE_TRANSITIONS = {
  [EXCHANGE_STATUS.PENDING]: [
    EXCHANGE_STATUS.ACCEPTED,
    EXCHANGE_STATUS.DECLINED,
  ],
  [EXCHANGE_STATUS.ACCEPTED]: [EXCHANGE_STATUS.AWAITING_CONFIRMATION],
  [EXCHANGE_STATUS.AWAITING_CONFIRMATION]: [
    EXCHANGE_STATUS.CONFIRMED,
    EXCHANGE_STATUS.DISPUTED,
  ],
}
