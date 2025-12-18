import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { parseCommaSeparated } from '@/lib/onboarding';
import { DIET_TYPE_OPTIONS, type DietType, type OnboardingFormData } from '@/types/onboarding';
import { Leaf, Heart, Ban } from 'lucide-react';

interface OnboardingStep2Props {
  data: Partial<OnboardingFormData>;
  onChange: (data: Partial<OnboardingFormData>) => void;
  errors?: { diet_type?: string };
}

export function OnboardingStep2({ data, onChange, errors }: OnboardingStep2Props) {
  const handleDietTypeChange = (value: string) => {
    onChange({ ...data, diet_type: value as DietType });
  };

  const handleFavoriteFoodsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const foods = parseCommaSeparated(e.target.value);
    onChange({ ...data, favorite_foods: foods });
  };

  const handleDislikedFoodsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const foods = parseCommaSeparated(e.target.value);
    onChange({ ...data, disliked_foods: foods });
  };

  // Convert arrays back to comma-separated strings for display
  const favoriteFoodsStr = data.favorite_foods?.join(', ') || '';
  const dislikedFoodsStr = data.disliked_foods?.join(', ') || '';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold mb-2">Food Preferences</h2>
        <p className="text-muted-foreground">
          Help us personalize your recipe recommendations
        </p>
      </div>

      {/* Diet Type */}
      <div className="space-y-3">
        <Label>
          Diet Type <span className="text-destructive">*</span>
        </Label>
        <RadioGroup
          value={data.diet_type || ''}
          onValueChange={handleDietTypeChange}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DIET_TYPE_OPTIONS.map((option) => (
              <div
                key={option.value}
                className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent transition-colors"
              >
                <RadioGroupItem value={option.value} id={option.value} />
                <Label
                  htmlFor={option.value}
                  className="flex-1 cursor-pointer font-normal"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
        {errors?.diet_type && (
          <p className="text-sm text-destructive">{errors.diet_type}</p>
        )}
      </div>

      {/* Favorite Foods */}
      <div className="space-y-2">
        <Label htmlFor="favorite-foods">Favorite Foods (optional)</Label>
        <div className="relative">
          <Heart className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="favorite-foods"
            type="text"
            placeholder="Paneer, dosa, pasta"
            className="pl-10"
            defaultValue={favoriteFoodsStr}
            onBlur={handleFavoriteFoodsChange}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Separate multiple items with commas
        </p>
      </div>

      {/* Disliked Foods */}
      <div className="space-y-2">
        <Label htmlFor="disliked-foods">Disliked Foods (optional)</Label>
        <div className="relative">
          <Ban className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="disliked-foods"
            type="text"
            placeholder="Brinjal, bitter gourd"
            className="pl-10"
            defaultValue={dislikedFoodsStr}
            onBlur={handleDislikedFoodsChange}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Separate multiple items with commas
        </p>
      </div>
    </div>
  );
}
