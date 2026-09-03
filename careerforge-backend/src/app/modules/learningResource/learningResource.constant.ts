export const RESOURCE_COSTS = ["Free", "Paid"] as const;

export type ResourceCost = (typeof RESOURCE_COSTS)[number];
