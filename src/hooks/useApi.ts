import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isDemoMode } from "@/lib/api";
import { 
  mockProfile, 
  mockScanHistory, 
  mockPantryItems, 
  mockRecipes, 
  mockCommunityPosts, 
  mockComments,
  mockSubstitutions 
} from "@/lib/mockData";
import type { Profile, ScanResult, PantryItem, Recipe, CommunityPost, Comment, SubstitutionSuggestion } from "@/types";

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Profile hooks
export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      if (isDemoMode) {
        await delay(500);
        return mockProfile;
      }
      // Real API call would go here
      return mockProfile;
    },
  });
}

export function useSaveProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (profile: Partial<Profile>) => {
      if (isDemoMode) {
        await delay(800);
        return { ...mockProfile, ...profile, updatedAt: new Date().toISOString() };
      }
      // Real API call would go here
      return profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Profile saved!", description: "Your health profile has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save profile.", variant: "destructive" });
    },
  });
}

// Scan hooks
export function useScanProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (_data: { image?: File; barcode?: string }) => {
      if (isDemoMode) {
        await delay(2000);
        return mockScanHistory[0];
      }
      // Real API call would go here
      return mockScanHistory[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scanHistory"] });
      toast({ title: "Scan complete!", description: "Product analysis ready." });
    },
    onError: () => {
      toast({ title: "Scan failed", description: "Could not analyze the product.", variant: "destructive" });
    },
  });
}

export function useScanHistory() {
  return useQuery({
    queryKey: ["scanHistory"],
    queryFn: async () => {
      if (isDemoMode) {
        await delay(500);
        return mockScanHistory;
      }
      return mockScanHistory;
    },
  });
}

// Recipe hooks
export function useGenerateRecipe() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { ingredient: string; preferences?: string[]; usePantry?: boolean }) => {
      if (isDemoMode) {
        await delay(1500);
        const recipe = mockRecipes[params.ingredient.toLowerCase()] || mockRecipes.oats;
        return recipe;
      }
      return mockRecipes.oats;
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate recipe.", variant: "destructive" });
    },
  });
}

export function useSubstitutions() {
  return useMutation({
    mutationFn: async (_params: { missingIngredient: string; recipeContext?: string }) => {
      if (isDemoMode) {
        await delay(800);
        return mockSubstitutions;
      }
      return mockSubstitutions;
    },
  });
}

// Pantry hooks
export function usePantryItems() {
  return useQuery({
    queryKey: ["pantry"],
    queryFn: async () => {
      if (isDemoMode) {
        await delay(500);
        return mockPantryItems;
      }
      return mockPantryItems;
    },
  });
}

export function useAddPantryItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (item: Omit<PantryItem, "id" | "createdAt">) => {
      if (isDemoMode) {
        await delay(500);
        return { ...item, id: `p${Date.now()}`, createdAt: new Date().toISOString() };
      }
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pantry"] });
      toast({ title: "Item added!", description: "Pantry updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add item.", variant: "destructive" });
    },
  });
}

export function useUpdatePantryItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (item: PantryItem) => {
      if (isDemoMode) {
        await delay(500);
        return { ...item, updatedAt: new Date().toISOString() };
      }
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pantry"] });
      toast({ title: "Item updated!", description: "Pantry item updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update item.", variant: "destructive" });
    },
  });
}

export function useDeletePantryItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode) {
        await delay(500);
        return { id };
      }
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pantry"] });
      toast({ title: "Item deleted", description: "Removed from pantry." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete item.", variant: "destructive" });
    },
  });
}

// Community hooks
export function useCommunityFeed() {
  return useQuery({
    queryKey: ["communityFeed"],
    queryFn: async () => {
      if (isDemoMode) {
        await delay(500);
        return mockCommunityPosts;
      }
      return mockCommunityPosts;
    },
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (post: { type: "recipe" | "remedy"; title?: string; content: string; tags: string[] }) => {
      if (isDemoMode) {
        await delay(2000); // Simulate AI rewrite time
        const newPost: CommunityPost = {
          id: `post-${Date.now()}`,
          type: post.type,
          title: post.title,
          tags: post.tags,
          originalText: post.content,
          rewrittenText: `**Nani-verified ${post.type === "recipe" ? "Recipe" : "Remedy"}**\n\n${post.content}\n\n✅ *Verified by NutriNani*`,
          safetyForUser: { badge: "safe", reasons: ["Reviewed by AI"] },
          likeCount: 0,
          commentCount: 0,
          likedByMe: false,
          createdAt: new Date().toISOString(),
          author: { name: "You" },
        };
        return newPost;
      }
      return {} as CommunityPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communityFeed"] });
      toast({ title: "Posted!", description: "Your post is now live in the community." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create post.", variant: "destructive" });
    },
  });
}

export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (isDemoMode) {
        await delay(200);
        return { postId, liked: true };
      }
      return { postId, liked: true };
    },
    onMutate: async (postId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["communityFeed"] });
      const previousPosts = queryClient.getQueryData<CommunityPost[]>(["communityFeed"]);
      
      queryClient.setQueryData<CommunityPost[]>(["communityFeed"], (old) =>
        old?.map((post) =>
          post.id === postId
            ? { ...post, likedByMe: !post.likedByMe, likeCount: post.likedByMe ? post.likeCount - 1 : post.likeCount + 1 }
            : post
        )
      );
      
      return { previousPosts };
    },
    onError: (_err, _postId, context) => {
      queryClient.setQueryData(["communityFeed"], context?.previousPosts);
    },
  });
}

export function useComments(postId: string) {
  return useQuery({
    queryKey: ["comments", postId],
    queryFn: async () => {
      if (isDemoMode) {
        await delay(300);
        return mockComments[postId] || [];
      }
      return [];
    },
    enabled: !!postId,
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ postId, text }: { postId: string; text: string }) => {
      if (isDemoMode) {
        await delay(500);
        const newComment: Comment = {
          id: `c${Date.now()}`,
          postId,
          text,
          createdAt: new Date().toISOString(),
          author: { name: "You" },
        };
        return newComment;
      }
      return {} as Comment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comments", variables.postId] });
      queryClient.invalidateQueries({ queryKey: ["communityFeed"] });
      toast({ title: "Comment added!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add comment.", variant: "destructive" });
    },
  });
}
