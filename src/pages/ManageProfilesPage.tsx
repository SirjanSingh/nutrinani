import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/contexts/ProfileContext";
import { useToast } from "@/hooks/use-toast";
import { CreateProfileModal } from "@/components/profiles/CreateProfileModal";
import logo from "@/assets/nutrinani-logo.png";
import { ArrowLeft, Plus, Edit, Trash2, Crown } from "lucide-react";

export default function ManageProfilesPage() {
  const navigate = useNavigate();
  const { profiles, deleteProfile } = useProfile();
  const { toast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingProfile, setDeletingProfile] = useState<string | null>(null);

  const handleDeleteProfile = async (profileId: string) => {
    setDeletingProfile(profileId);
    try {
      await deleteProfile(profileId);
      toast({
        title: "Profile deleted",
        description: "The profile has been removed successfully.",
      });
    } catch (error) {
      toast({
        title: "Cannot delete profile",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingProfile(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
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
          <p className="text-xl text-muted-foreground">
            Manage Family Profiles
          </p>
        </div>

        {/* Back Button */}
        <div className="mb-6">
          <Button variant="outline" onClick={() => navigate("/profiles")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profiles
          </Button>
        </div>

        {/* Profiles List */}
        <div className="space-y-4 mb-8">
          {profiles.map((profile) => (
            <Card key={profile.id} className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{profile.avatar}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span>{profile.name}</span>
                        {profile.isMain && (
                          <Crown
                            className="w-4 h-4 text-yellow-500"
                            title="Main Account"
                          />
                        )}
                      </div>
                      {profile.age && (
                        <p className="text-sm text-muted-foreground">
                          Age {profile.age}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Select this profile first, then go to onboarding for dietary preferences
                        // Or go to basic edit page for name/avatar
                        navigate(`/profiles/${profile.id}/edit`);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>

                    {!profile.isMain && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteProfile(profile.id)}
                        disabled={deletingProfile === profile.id}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        {deletingProfile === profile.id
                          ? "Deleting..."
                          : "Delete"}
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-muted-foreground">
                      Diet Type
                    </p>
                    <p className="capitalize">
                      {profile.onboardingData?.diet_type || "Not set"}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">
                      Allergies
                    </p>
                    <p>
                      {profile.onboardingData?.allergies?.length
                        ? profile.onboardingData.allergies.join(", ")
                        : "None"}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">
                      Onboarding
                    </p>
                    <p
                      className={
                        profile.onboardingData?.onboarding_completed
                          ? "text-green-600"
                          : "text-orange-600"
                      }
                    >
                      {profile.onboardingData?.onboarding_completed
                        ? "Complete"
                        : "Incomplete"}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Created</p>
                    <p>{new Date(profile.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add Profile Button */}
        {profiles.length < 6 && (
          <Card
            className="border-2 border-dashed hover:border-primary cursor-pointer transition-colors"
            onClick={() => setShowCreateModal(true)}
          >
            <CardContent className="p-8 text-center">
              <Plus className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Add New Profile</h3>
              <p className="text-muted-foreground">
                Create a profile for another family member
              </p>
            </CardContent>
          </Card>
        )}

        {profiles.length >= 6 && (
          <Card className="border-2 border-muted">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                Maximum of 6 profiles reached
              </p>
            </CardContent>
          </Card>
        )}

        {/* Create Profile Modal */}
        <CreateProfileModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      </div>
    </div>
  );
}
