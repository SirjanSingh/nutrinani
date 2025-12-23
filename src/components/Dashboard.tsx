import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/contexts/ProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { calculateAge } from '@/lib/onboarding';
import { 
  Heart, 
  Shield, 
  Users, 
  Sparkles, 
  ChefHat, 
  Scan, 
  Bot,
  Package,
  ArrowRight,
  Leaf,
  Star
} from 'lucide-react';

interface DashboardProps {
  onNavigateToSection?: (section: string) => void;
}

export default function Dashboard({ onNavigateToSection }: DashboardProps) {
  const { user } = useAuth();
  const { profile } = useProfile();

  const displayName = useMemo(() => {
    return (profile?.name as string) || user?.name || user?.email || 'there';
  }, [profile?.name, user?.name, user?.email]);

  const age = useMemo(() => {
    const dob = profile?.dob as string;
    return dob ? calculateAge(dob) : null;
  }, [profile?.dob]);

  const dietType = profile?.diet_type as string;
  const allergies = (profile?.allergies as string[]) || [];
  const diseases = (profile?.diseases as string[]) || [];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl">
            <Leaf className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Welcome to Nutrinani
          </h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Hello, <span className="font-semibold text-foreground">{displayName}</span>! 
          Your AI-powered nutrition companion for safer, smarter food choices.
        </p>
      </div>

      {/* About Nutrinani */}
      <Card className="border-2 border-green-100 bg-gradient-to-br from-green-50/50 to-emerald-50/50">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <Sparkles className="h-6 w-6 text-green-600" />
            What is Nutrinani?
          </CardTitle>
          <CardDescription className="text-base">
            Your personalized nutrition assistant powered by AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-muted-foreground leading-relaxed">
            Nutrinani combines the wisdom of traditional nutrition knowledge with cutting-edge AI technology 
            to help you make informed food choices. Whether you're scanning labels, discovering recipes, 
            or managing your dietary needs, we're here to guide you every step of the way.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center space-y-2 p-4 rounded-lg bg-white/50">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Scan className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold">Smart Scanning</h3>
              <p className="text-sm text-muted-foreground">
                Scan food labels and get instant safety verdicts
              </p>
            </div>
            
            <div className="text-center space-y-2 p-4 rounded-lg bg-white/50">
              <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <ChefHat className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="font-semibold">Recipe Magic</h3>
              <p className="text-sm text-muted-foreground">
                Discover personalized recipes based on your preferences
              </p>
            </div>
            
            <div className="text-center space-y-2 p-4 rounded-lg bg-white/50">
              <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Bot className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold">Nani Voice Bot</h3>
              <p className="text-sm text-muted-foreground">
                Chat with your AI nutrition grandmother
              </p>
            </div>
            
            <div className="text-center space-y-2 p-4 rounded-lg bg-white/50">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold">Smart Inventory</h3>
              <p className="text-sm text-muted-foreground">
                Track your pantry and get recipe suggestions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Your Profile Summary */}
      {(profile?.name || age || dietType || allergies.length > 0) && (
        <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Your Nutrition Profile
            </CardTitle>
            <CardDescription>
              Personalized just for you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {age && (
                <div className="text-center p-3 bg-white/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{age}</div>
                  <div className="text-sm text-muted-foreground">Years Old</div>
                </div>
              )}
              
              {dietType && (
                <div className="text-center p-3 bg-white/50 rounded-lg">
                  <div className="text-lg font-semibold text-green-600 capitalize">{dietType.replace('_', ' ')}</div>
                  <div className="text-sm text-muted-foreground">Diet Type</div>
                </div>
              )}
              
              {allergies.length > 0 && (
                <div className="text-center p-3 bg-white/50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{allergies.length}</div>
                  <div className="text-sm text-muted-foreground">Allergies Tracked</div>
                </div>
              )}
              
              {diseases.length > 0 && (
                <div className="text-center p-3 bg-white/50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{diseases.length}</div>
                  <div className="text-sm text-muted-foreground">Health Conditions</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Jump into your nutrition journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-3 hover:bg-blue-50 hover:border-blue-200"
              onClick={() => onNavigateToSection?.('scanner')}
            >
              <Scan className="h-8 w-8 text-blue-600" />
              <div className="text-center">
                <div className="font-semibold">Scan a Product</div>
                <div className="text-sm text-muted-foreground">Get instant safety verdict</div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-3 hover:bg-orange-50 hover:border-orange-200"
              onClick={() => onNavigateToSection?.('recipes')}
            >
              <ChefHat className="h-8 w-8 text-orange-600" />
              <div className="text-center">
                <div className="font-semibold">Find Recipes</div>
                <div className="text-sm text-muted-foreground">Discover personalized meals</div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-3 hover:bg-purple-50 hover:border-purple-200"
              onClick={() => onNavigateToSection?.('voice')}
            >
              <Bot className="h-8 w-8 text-purple-600" />
              <div className="text-center">
                <div className="font-semibold">Chat with Nani</div>
                <div className="text-sm text-muted-foreground">Ask nutrition questions</div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Community & Safety */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-2 border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              Join Our Community
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground">
              Connect with fellow nutrition enthusiasts, share recipes, and learn from each other's experiences.
            </p>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => onNavigateToSection?.('community')}>
              Explore Community
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-red-100 bg-gradient-to-br from-red-50/50 to-pink-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-600" />
              Food Safety First
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground">
              Our AI analyzes ingredients against your profile to ensure every meal is safe and suitable for you.
            </p>
            <Button variant="outline" className="w-full border-red-200 hover:bg-red-50">
              Learn More
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
