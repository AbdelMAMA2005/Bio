import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { addPost, addStory, feedPosts, getTaggableCollectionItems, stories, toggleLike, wait } from '@/api/mock/store';
import type { FeedPost, Story, TaggableCollectionItem } from '@/api/types';

async function fetchFeed(): Promise<{ stories: Story[]; posts: FeedPost[] }> {
  return wait({ stories: [...stories], posts: [...feedPosts] }, 450);
}

export function useFeed() {
  return useQuery({ queryKey: queryKeys.feed, queryFn: fetchFeed });
}

export function useToggleLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      toggleLike(postId);
      await wait(undefined, 150);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feed });
    },
  });
}

export function usePublishStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (imageUri: string) => wait(addStory(imageUri), 700),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feed });
    },
  });
}

type PublishPostInput = { imageUri: string; texte: string; collectionItemId?: string };

export function usePublishPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PublishPostInput) => wait(addPost(input), 800),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feed });
    },
  });
}

export function useTaggableCollection() {
  return useQuery<TaggableCollectionItem[]>({
    queryKey: ['taggableCollection'],
    queryFn: () => wait(getTaggableCollectionItems(), 200),
  });
}
