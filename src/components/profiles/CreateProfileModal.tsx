import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile } from "@/contexts/ProfileContext";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_AVATARS } from "@/types/profile";
import { Loader2 } from "lucide-react";

interface CreateProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateProfileModal({ open, onClose }: CreateProfileModalProps) {
  const navigate = useNavigate();
  const { createProfile, selectProfile } = useProfile();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_AVATARS[0]);
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for the profile.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const profile = await createProfile(
        name.trim(),
        age ? parseInt(age) : undefined,
        selectedAvatar
      );

      // Select the new profile and go to onboarding
      selectProfile(profile.id);
      onClose();
      navigate("/onboarding");

      toast({
        title: "Profile created!",
        description: `${name}'s profile has been created. Let's set up their preferences.`,
      });
    } catch (error) {
      toast({
        title: "Failed to create profile",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setName("");
      setAge("");
      setSelectedAvatar(DEFAULT_AVATARS[0]);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Profile</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Input */}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name"
              disabled={isCreating}
            />
          </div>

          {/* Age Input */}
          <div className="space-y-2">
            <Label htmlFor="age">Age (optional)</Label>
            <Input
              id="age"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Enter age"
              min="1"
              max="120"
              disabled={isCreating}
            />
          </div>

          {/* Avatar Selection */}
          <div className="space-y-2">
            <Label>Choose Avatar</Label>
            <div className="grid grid-cols-4 gap-2">
              {DEFAULT_AVATARS.map((avatar) => (
                <button
                  key={avatar}
                  type="button"
                  className={`p-3 text-2xl rounded-lg border-2 transition-colors ${
                    selectedAvatar === avatar
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedAvatar(avatar)}
                  disabled={isCreating}
                >
                  {avatar}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !name.trim()}
              className="flex-1"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Profile"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
