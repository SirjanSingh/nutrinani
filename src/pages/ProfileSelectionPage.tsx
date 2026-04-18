import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { CreateProfileModal } from "@/components/profiles/CreateProfileModal";
import logo from "@/assets/nutrinani-logo.png";
import { Plus, Settings } from "lucide-react";

export default function ProfileSelectionPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { profiles, selectProfile, isProfileLoading } = useProfile();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleProfileSelect = (profileId: string) => {
    selectProfile(profileId);
    navigate("/");
  };

  const handleCreateProfile = () => {
    setShowCreateModal(true);
  };

  if (isProfileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <img
            src={logo}
            alt="NutriNani Logo"
            className="w-20 h-20 mx-auto mb-4 rounded-full shadow-lg"
          />
          <p className="text-muted-foreground">Loading profiles...</p>
        </div>
      </div>
    );
  }

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
          <p className="text-xl text-muted-foreground mb-2">
            Who's eating today?
          </p>
          <p className="text-sm text-muted-foreground">
            Welcome back, {user?.name || user?.email}
          </p>
        </div>

        {/* Profiles Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {profiles.map((profile) => (
            <Card
              key={profile.id}
              className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
              onClick={() => handleProfileSelect(profile.id)}
            >
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-3">{profile.avatar}</div>
                <h3 className="font-semibold text-lg mb-1">{profile.name}</h3>
                {profile.age && (
                  <p className="text-sm text-muted-foreground">
                    Age {profile.age}
                  </p>
                )}
                {profile.isMain && (
                  <p className="text-xs text-primary font-medium mt-1">
                    Main Account
                  </p>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Add Profile Card */}
          {profiles.length < 6 && (
            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-dashed hover:border-primary"
              onClick={handleCreateProfile}
            >
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-3 text-muted-foreground">
                  <Plus className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="font-semibold text-lg text-muted-foreground">
                  Add Profile
                </h3>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/manage-profiles")}
          >
            <Settings className="w-4 h-4 mr-2" />
            Manage Profiles
          </Button>
          <Button variant="ghost" onClick={logout}>
            Sign Out
          </Button>
        </div>

        {/* Create Profile Modal */}
        <CreateProfileModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      </div>
    </div>
  );
}
