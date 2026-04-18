import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronDown, User, Settings, LogOut, Users } from "lucide-react";

export function ProfileHeader() {
  const navigate = useNavigate();
  const { activeProfile, profiles, selectProfile } = useProfile();
  const { logout } = useAuth();

  if (!activeProfile) {
    return (
      <Button onClick={() => navigate("/profiles")} variant="outline">
        <User className="w-4 h-4 mr-2" />
        Select Profile
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <span className="text-lg">{activeProfile.avatar}</span>
          <span className="font-medium">{activeProfile.name}</span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {/* Current Profile Info */}
        <div className="px-2 py-1.5 text-sm font-medium">
          <div className="flex items-center gap-2">
            <span className="text-lg">{activeProfile.avatar}</span>
            <div>
              <p>{activeProfile.name}</p>
              {activeProfile.age && (
                <p className="text-xs text-muted-foreground">
                  Age {activeProfile.age}
                </p>
              )}
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Switch Profile */}
        {profiles.length > 1 && (
          <>
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
              Switch Profile
            </div>
            {profiles
              .filter((p) => p.id !== activeProfile.id)
              .map((profile) => (
                <DropdownMenuItem
                  key={profile.id}
                  onClick={() => selectProfile(profile.id)}
                  className="cursor-pointer"
                >
                  <span className="text-lg mr-2">{profile.avatar}</span>
                  <span>{profile.name}</span>
                  {profile.isMain && (
                    <span className="ml-auto text-xs text-yellow-600">
                      Main
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
            <DropdownMenuSeparator />
          </>
        )}

        {/* Profile Actions */}
        <DropdownMenuItem
          onClick={() => navigate("/profiles")}
          className="cursor-pointer"
        >
          <Users className="w-4 h-4 mr-2" />
          All Profiles
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => navigate("/manage-profiles")}
          className="cursor-pointer"
        >
          <Settings className="w-4 h-4 mr-2" />
          Manage Profiles
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={logout}
          className="cursor-pointer text-red-600"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
