export const queryKeys = {
  garden: ['garden'] as const,
  herbarium: ['herbarium'] as const,
  feed: ['feed'] as const,
  quests: ['quests'] as const,
  user: ['user'] as const,
  plantDetail: (id: string) => ['plantDetail', id] as const,
};
