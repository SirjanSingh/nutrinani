import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import GenerateRecipe from "./GenerateRecipe";
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/contexts/ProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { ALLERGY_OPTIONS, DIET_TYPE_OPTIONS, GENDER_OPTIONS, DISEASE_OPTIONS, type Gender, type DietType } from '@/types/onboarding';
import { calculateAge, parseCommaSeparated } from '@/lib/onboarding';
import { CheckCircle2, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile, isProfileLoading, saveProfile } = useProfile();

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Basic info
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');

  // Food preferences
  const [dietType, setDietType] = useState<DietType>('vegetarian');
  const [favoriteFoodsText, setFavoriteFoodsText] = useState('');
  const [dislikedFoodsText, setDislikedFoodsText] = useState('');

  // Allergies & restrictions
  const [allergies, setAllergies] = useState<string[]>([]);
  const [otherRestrictions, setOtherRestrictions] = useState('');

  // Health conditions
  const [diseases, setDiseases] = useState<string[]>([]);

  // Sync form from loaded profile
  useEffect(() => {
    const p = profile || {};
    setName((p.name as string) || user?.name || '');
    setDob((p.dob as string) || '');
    setGender((p.gender as Gender) || '');
    setDietType(((p.diet_type as DietType) || 'vegetarian') as DietType);
    setFavoriteFoodsText(Array.isArray(p.favorite_foods) ? (p.favorite_foods as string[]).join(', ') : '');
    setDislikedFoodsText(Array.isArray(p.disliked_foods) ? (p.disliked_foods as string[]).join(', ') : '');
    setAllergies(Array.isArray(p.allergies) ? (p.allergies as string[]) : []);
    setDiseases(Array.isArray(p.diseases) ? (p.diseases as string[]) : []);
    setOtherRestrictions((p.other_restrictions as string) || '');
  }, [profile, user?.name]);

  const displayName = useMemo(() => name || user?.name || user?.email || 'there', [name, user?.name, user?.email]);
  const age = useMemo(() => (dob ? calculateAge(dob) : 0), [dob]);

  const toggleAllergy = (item: string) => {
    setAllergies((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]));
  };

  const toggleDisease = (item: string) => {
    setDiseases((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveProfile({
        name: name.trim(),
        dob,
        gender: (gender || undefined) as Gender | undefined,
        diet_type: dietType,
        favorite_foods: parseCommaSeparated(favoriteFoodsText),
        disliked_foods: parseCommaSeparated(dislikedFoodsText),
        allergies,
        diseases,
        other_restrictions: otherRestrictions,
        onboarding_completed: true,
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);

      toast({
        title: 'Profile updated',
        description: 'Your details were saved successfully.',
      });
    } catch (e: any) {
      toast({
        title: 'Save failed',
        description: e?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Welcome, {displayName}</h2>
          <p className="text-muted-foreground">
            Your profile powers safer label checks, better recipes, and personalized recommendations.
          </p>
        </div>
      </div>

      <Card className="shadow-md border-border/50">
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
          <CardDescription>Everything is editable. Update anytime.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Basic info */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Basic info</h3>
              {isProfileLoading && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dob">Date of birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Age</Label>
                <Input
                  value={dob && age > 0 ? `${age} years` : ''}
                  readOnly
                  placeholder={dob ? '—' : 'Pick DOB to calculate'}
                  className="rounded-xl bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Gender (optional)</Label>
                <Select value={gender} onValueChange={(v) => setGender(v as Gender)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Food preferences */}
          <div className="space-y-4">
            <h3 className="font-semibold">Food preferences</h3>

            <div className="space-y-2">
              <Label>Diet type</Label>
              <Select value={dietType} onValueChange={(v) => setDietType(v as DietType)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select your diet" />
                </SelectTrigger>
                <SelectContent>
                  {DIET_TYPE_OPTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Favorite foods (optional)</Label>
                <Input
                  value={favoriteFoodsText}
                  onChange={(e) => setFavoriteFoodsText(e.target.value)}
                  placeholder="Paneer, dosa, pasta"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Disliked foods (optional)</Label>
                <Input
                  value={dislikedFoodsText}
                  onChange={(e) => setDislikedFoodsText(e.target.value)}
                  placeholder="Brinjal, bitter gourd"
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Allergies & restrictions */}
          <div className="space-y-4">
            <h3 className="font-semibold">Allergies & restrictions</h3>

            <div className="space-y-3">
              <Label>Food allergies (optional)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ALLERGY_OPTIONS.map((a) => {
                  const checked = allergies.includes(a);
                  return (
                    <label
                      key={a}
                      className="flex items-center gap-3 border rounded-lg p-3 hover:bg-accent transition-colors cursor-pointer"
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggleAllergy(a)} />
                      <span className="text-sm">{a}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Other dietary restrictions (optional)</Label>
              <Textarea
                value={otherRestrictions}
                onChange={(e) => setOtherRestrictions(e.target.value)}
                placeholder="Low sugar, Jain food, lactose sensitive"
                className="rounded-xl"
              />
            </div>
          </div>

          {/* Health conditions */}
          <div className="space-y-4">
            <h3 className="font-semibold">Health conditions</h3>

            <div className="space-y-3">
              <Label>Diseases / medical conditions (optional)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DISEASE_OPTIONS.map((d) => {
                  const checked = diseases.includes(d);
                  return (
                    <label
                      key={d}
                      className="flex items-center gap-3 border rounded-lg p-3 hover:bg-accent transition-colors cursor-pointer"
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggleDisease(d)} />
                      <span className="text-sm">{d}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Helps us personalize food safety and nutrition advice
              </p>
            </div>
          </div>

          {/* Save button */}
          <div className="flex items-center gap-4">
            <Button onClick={handleSave} size="lg" className="rounded-xl" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                'Save changes'
              )}
            </Button>
            {saved && (
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">Saved</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}