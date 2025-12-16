import { useState } from "react";
import { Users, Plus, Heart, MessageCircle, CheckCircle, AlertTriangle, X, Send, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCommunityFeed, useCreatePost, useLikePost, useComments, useAddComment } from "@/hooks/useApi";
import type { CommunityPost } from "@/types";

const formatTimeAgo = (dateString: string) => {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const PostCard = ({ post, onOpenDetails }: { post: CommunityPost; onOpenDetails: (post: CommunityPost) => void }) => {
  const likePost = useLikePost();

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    likePost.mutate(post.id);
  };

  return (
    <Card 
      className="hover:shadow-lg transition-all cursor-pointer border-l-4"
      style={{ borderLeftColor: post.type === "recipe" ? "hsl(var(--primary))" : "hsl(var(--secondary))" }}
      onClick={() => onOpenDetails(post)}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant={post.type === "recipe" ? "default" : "secondary"} className="capitalize">
                {post.type}
              </Badge>
              {post.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            {post.title && (
              <h3 className="font-semibold text-lg text-foreground mb-1">{post.title}</h3>
            )}
            <p className="text-muted-foreground text-sm line-clamp-2">{post.originalText}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              <span>{post.author?.name || "Anonymous"}</span>
              <span>•</span>
              <span>{formatTimeAgo(post.createdAt)}</span>
            </div>
          </div>

          {/* Safety Badge */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium shrink-0 ${
                  post.safetyForUser.badge === "safe" 
                    ? "bg-primary/10 text-primary" 
                    : "bg-warning/10 text-warning"
                }`}>
                  {post.safetyForUser.badge === "safe" ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">
                    {post.safetyForUser.badge === "safe" ? "Safe for you" : "Caution"}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium mb-1">
                  {post.safetyForUser.badge === "safe" ? "✅ Safe for your profile" : "⚠️ Review before trying"}
                </p>
                <ul className="text-xs space-y-1">
                  {post.safetyForUser.reasons.map((reason, i) => (
                    <li key={i}>• {reason}</li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            className={`gap-2 ${post.likedByMe ? "text-destructive" : ""}`}
            onClick={handleLike}
          >
            <Heart className={`w-4 h-4 ${post.likedByMe ? "fill-current" : ""}`} />
            {post.likeCount}
          </Button>
          <Button variant="ghost" size="sm" className="gap-2">
            <MessageCircle className="w-4 h-4" />
            {post.commentCount}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const PostDetailsDialog = ({ 
  post, 
  isOpen, 
  onClose 
}: { 
  post: CommunityPost | null; 
  isOpen: boolean; 
  onClose: () => void;
}) => {
  const { data: comments, isLoading: commentsLoading } = useComments(post?.id || "");
  const addComment = useAddComment();
  const likePost = useLikePost();
  const [newComment, setNewComment] = useState("");

  if (!post) return null;

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addComment.mutate({ postId: post.id, text: newComment });
    setNewComment("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant={post.type === "recipe" ? "default" : "secondary"} className="capitalize">
              {post.type}
            </Badge>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              post.safetyForUser.badge === "safe" 
                ? "bg-primary/10 text-primary" 
                : "bg-warning/10 text-warning"
            }`}>
              {post.safetyForUser.badge === "safe" ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                <AlertTriangle className="w-3 h-3" />
              )}
              {post.safetyForUser.badge === "safe" ? "Safe for you" : "Caution"}
            </div>
          </div>
          <DialogTitle className="text-xl">{post.title || "Community Post"}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            By {post.author?.name || "Anonymous"} • {formatTimeAgo(post.createdAt)}
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {/* Content Tabs */}
          {post.rewrittenText ? (
            <Tabs defaultValue="verified" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="verified">Nani-verified</TabsTrigger>
                <TabsTrigger value="original">Original</TabsTrigger>
              </TabsList>
              <TabsContent value="verified" className="mt-4">
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4 prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-sm">{post.rewrittenText}</pre>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="original" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm">{post.originalText}</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card className="mt-4">
              <CardContent className="p-4">
                <p className="text-sm">{post.originalText}</p>
              </CardContent>
            </Card>
          )}

          {/* Safety Reasons */}
          <div className={`mt-4 p-3 rounded-lg ${
            post.safetyForUser.badge === "safe" ? "bg-primary/10" : "bg-warning/10"
          }`}>
            <p className="text-sm font-medium mb-1">
              {post.safetyForUser.badge === "safe" ? "Why this is safe for you:" : "Points to consider:"}
            </p>
            <ul className="text-xs space-y-1 text-muted-foreground">
              {post.safetyForUser.reasons.map((reason, i) => (
                <li key={i}>• {reason}</li>
              ))}
            </ul>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-4">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="outline">{tag}</Badge>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 mt-4 py-3 border-t border-b">
            <Button
              variant="ghost"
              size="sm"
              className={`gap-2 ${post.likedByMe ? "text-destructive" : ""}`}
              onClick={() => likePost.mutate(post.id)}
            >
              <Heart className={`w-4 h-4 ${post.likedByMe ? "fill-current" : ""}`} />
              {post.likeCount} likes
            </Button>
          </div>

          {/* Comments */}
          <div className="mt-4">
            <h4 className="font-semibold mb-3">Comments ({post.commentCount})</h4>
            {commentsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : comments?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet. Be the first!</p>
            ) : (
              <div className="space-y-3">
                {comments?.map((comment) => (
                  <div key={comment.id} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{comment.author?.name || "Anonymous"}</span>
                      <span className="text-xs text-muted-foreground">{formatTimeAgo(comment.createdAt)}</span>
                    </div>
                    <p className="text-sm">{comment.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Add Comment */}
        <div className="flex items-center gap-2 pt-4 border-t mt-4">
          <Input
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
          />
          <Button onClick={handleAddComment} disabled={!newComment.trim() || addComment.isPending}>
            {addComment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const CreatePostDialog = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const createPost = useCreatePost();
  const [postData, setPostData] = useState({
    type: "recipe" as "recipe" | "remedy",
    title: "",
    content: "",
    tags: "",
  });

  const handleSubmit = () => {
    if (!postData.content.trim()) return;
    createPost.mutate({
      type: postData.type,
      title: postData.title || undefined,
      content: postData.content,
      tags: postData.tags.split(",").map((t) => t.trim()).filter(Boolean),
    }, {
      onSuccess: () => {
        setPostData({ type: "recipe", title: "", content: "", tags: "" });
        onClose();
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share with Community</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={postData.type} onValueChange={(value: "recipe" | "remedy") => setPostData({ ...postData, type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recipe">Recipe</SelectItem>
                <SelectItem value="remedy">Remedy</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Title (optional)</Label>
            <Input
              value={postData.title}
              onChange={(e) => setPostData({ ...postData, title: e.target.value })}
              placeholder="e.g., Grandma's Immunity Kadha"
            />
          </div>
          <div className="space-y-2">
            <Label>Content *</Label>
            <Textarea
              value={postData.content}
              onChange={(e) => setPostData({ ...postData, content: e.target.value })}
              placeholder="Share your recipe or home remedy..."
              className="min-h-32"
            />
          </div>
          <div className="space-y-2">
            <Label>Tags (comma-separated)</Label>
            <Input
              value={postData.tags}
              onChange={(e) => setPostData({ ...postData, tags: e.target.value })}
              placeholder="diabetes-friendly, breakfast, quick"
            />
          </div>
        </div>
        
        {createPost.isPending && (
          <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Nani is verifying your post...
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!postData.content.trim() || createPost.isPending}>
            {createPost.isPending ? "Posting..." : "Share"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const Community = () => {
  const { data: posts, isLoading } = useCommunityFeed();
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "recipe" | "remedy">("all");

  const filteredPosts = posts?.filter((post) => filterType === "all" || post.type === filterType);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Community
          </h2>
          <p className="text-muted-foreground mt-1">Nani ke Nuskhe from our community</p>
        </div>
        <Button className="gap-2" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4" />
          Share Nuskha
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Button
          variant={filterType === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterType("all")}
        >
          All
        </Button>
        <Button
          variant={filterType === "recipe" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterType("recipe")}
        >
          Recipes
        </Button>
        <Button
          variant={filterType === "remedy" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterType("remedy")}
        >
          Remedies
        </Button>
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : filteredPosts?.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No community posts yet</p>
            <p className="text-sm">Be the first to share a Nani ka Nuskha!</p>
            <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
              Share Your First Post
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredPosts?.map((post) => (
            <PostCard key={post.id} post={post} onOpenDetails={setSelectedPost} />
          ))}
        </div>
      )}

      {/* Coming Soon Features */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-lg text-muted-foreground">Coming Soon</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Soon</Badge>
            <span>Weekly Health Challenges</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Soon</Badge>
            <span>Follow Friends & Nanis</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Soon</Badge>
            <span>Instagram Share Cards</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Soon</Badge>
            <span>Connect with Dieticians</span>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <PostDetailsDialog 
        post={selectedPost} 
        isOpen={!!selectedPost} 
        onClose={() => setSelectedPost(null)} 
      />
      <CreatePostDialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
};
