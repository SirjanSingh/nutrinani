import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { calculateAge } from '@/lib/onboarding';
import { GENDER_OPTIONS, type Gender, type OnboardingFormData } from '@/types/onboarding';
import { User, Calendar } from 'lucide-react';

interface OnboardingStep1Props {
  data: Partial<OnboardingFormData>;
  onChange: (data: Partial<OnboardingFormData>) => void;
  errors?: { name?: string; dob?: string };
}

export function OnboardingStep1({ data, onChange, errors }: OnboardingStep1Props) {
  const age = data.dob ? calculateAge(data.dob) : 0;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...data, name: e.target.value });
  };

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...data, dob: e.target.value });
  };

  const handleGenderChange = (value: string) => {
    onChange({ ...data, gender: value as Gender });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold mb-2">Basic Information</h2>
        <p className="text-muted-foreground">
          Let's start with some basic details about you
        </p>
      </div>

      {/* Full Name */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Full Name <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="name"
            type="text"
            placeholder="Enter your full name"
            className="pl-10"
            value={data.name || ''}
            onChange={handleNameChange}
          />
        </div>
        {errors?.name && (
          <p className="text-sm text-destructive">{errors.name}</p>
        )}
      </div>

      {/* Date of Birth */}
      <div className="space-y-2">
        <Label htmlFor="dob">
          Date of Birth <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="dob"
            type="date"
            className="pl-10"
            value={data.dob || ''}
            onChange={handleDobChange}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
        {errors?.dob && (
          <p className="text-sm text-destructive">{errors.dob}</p>
        )}
      </div>

      {/* Age (Auto-calculated, Read-only) */}
      {data.dob && age > 0 && (
        <div className="space-y-2">
          <Label htmlFor="age">Age</Label>
          <Input
            id="age"
            type="text"
            value={`${age} years old`}
            readOnly
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            Automatically calculated from your date of birth
          </p>
        </div>
      )}

      {/* Gender */}
      <div className="space-y-3">
        <Label>Gender (optional)</Label>
        <RadioGroup
          value={data.gender || ''}
          onValueChange={handleGenderChange}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {GENDER_OPTIONS.map((option) => (
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
      </div>
    </div>
  );
}
