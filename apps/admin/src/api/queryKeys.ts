export const queryKeys = {
  stats: ['admin', 'stats'] as const,
  users: (params: unknown) => ['admin', 'users', params] as const,
  plants: (params: unknown) => ['admin', 'plants', params] as const,
  moderation: (params: unknown) => ['admin', 'moderation', params] as const,
  quests: ['admin', 'quests'] as const,
  featureFlags: ['admin', 'settings', 'flags'] as const,
  apiKeys: ['admin', 'settings', 'api-keys'] as const,
  auditLog: ['admin', 'settings', 'audit-log'] as const,
};
