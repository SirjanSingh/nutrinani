import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile } from "@/contexts/ProfileContext";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_AVATARS } from "@/types/profile";
import logo from "@/assets/nutrinani-logo.png";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { profiles, updateProfile, selectProfile } = useProfile();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("👤");
  const [isUpdating, setIsUpdating] = useState(false);

  const profile = profiles.find((p) => p.id === id);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setAge(profile.age?.toString() || "");
      setSelectedAvatar(profile.avatar);
    }
  }, [profile]);

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The profile you're looking for doesn't exist.
            </p>
            <Button onClick={() => navigate("/manage-profiles")}>
              Back to Profiles
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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

    setIsUpdating(true);
    try {
      await updateProfile(profile.id, {
        name: name.trim(),
        age: age ? parseInt(age) : undefined,
        avatar: selectedAvatar,
      });

      toast({
        title: "Profile updated!",
        description: `${name}'s profile has been updated successfully.`,
      });

      navigate("/manage-profiles");
    } catch (error) {
      toast({
        title: "Failed to update profile",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <img
            src={logo}
            alt="NutriNani Logo"
            className="w-20 h-20 mx-auto mb-4 rounded-full shadow-lg"
          />
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-green-600">Nutri</span>
            <span className="text-orange-600">Nani</span>
          </h1>
          <p className="text-xl text-muted-foreground">Edit Profile</p>
        </div>

        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => navigate("/manage-profiles")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Manage Profiles
          </Button>
        </div>

        {/* Edit Form */}
        <Card className="shadow-xl border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <span className="text-2xl">{selectedAvatar}</span>
              <div>
                <h2 className="text-xl">Edit {profile.name}</h2>
                {profile.isMain && (
                  <p className="text-sm text-yellow-600 font-medium">
                    Main Account
                  </p>
                )}
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Input */}
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter name"
                  disabled={isUpdating}
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
                  disabled={isUpdating}
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
                      disabled={isUpdating}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
              </div>

              {/* Profile Settings Link */}
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-medium mb-2">Dietary Preferences</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  To update dietary preferences, allergies, and food
                  restrictions, complete the onboarding process.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Select this profile and go to onboarding
                    selectProfile(profile.id);
                    navigate("/onboarding");
                  }}
                >
                  Update Preferences
                </Button>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/manage-profiles")}
                  disabled={isUpdating}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUpdating || !name.trim()}
                  className="flex-1"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
