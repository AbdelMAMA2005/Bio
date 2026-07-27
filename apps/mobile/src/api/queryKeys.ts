export const queryKeys = {
  garden: ['garden'] as const,
  herbarium: ['herbarium'] as const,
  feed: ['feed'] as const,
  stories: ['stories'] as const,
  quests: ['quests'] as const,
  user: ['user'] as const,
  plantDetail: (id: string) => ['plantDetail', id] as const,
  comments: (postId: string) => ['comments', postId] as const,
  storyViewers: (mediaId: string) => ['storyViewers', mediaId] as const,
};
