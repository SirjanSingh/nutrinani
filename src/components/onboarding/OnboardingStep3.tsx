import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { ALLERGY_OPTIONS, DISEASE_OPTIONS, type OnboardingFormData } from '@/types/onboarding';
import { AlertTriangle } from 'lucide-react';

interface OnboardingStep3Props {
  data: Partial<OnboardingFormData>;
  onChange: (data: Partial<OnboardingFormData>) => void;
}

export function OnboardingStep3({ data, onChange }: OnboardingStep3Props) {
  const handleAllergyToggle = (allergy: string, checked: boolean) => {
    const currentAllergies = data.allergies || [];
    const newAllergies = checked
      ? [...currentAllergies, allergy]
      : currentAllergies.filter((a) => a !== allergy);
    
    onChange({ ...data, allergies: newAllergies });
  };
  const handleDiseaseToggle = (disease: string, checked: boolean) => {
    const currentDiseases = data.diseases || [];
    const newDiseases = checked
      ? [...currentDiseases, disease]
      : currentDiseases.filter((d) => d !== disease);

    onChange({ ...data, diseases: newDiseases });
  };

  const handleOtherRestrictionsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...data, other_restrictions: e.target.value });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold mb-2">Allergies & Restrictions</h2>
        <p className="text-muted-foreground">
          Help us keep you safe by telling us about any food allergies or dietary restrictions
        </p>
      </div>

      {/* Food Allergies */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Food Allergies (optional)
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ALLERGY_OPTIONS.map((allergy) => {
            const isChecked = data.allergies?.includes(allergy) || false;
            
            return (
              <div
                key={allergy}
                className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent transition-colors"
              >
                <Checkbox
                  id={allergy}
                  checked={isChecked}
                  onCheckedChange={(checked) => 
                    handleAllergyToggle(allergy, checked as boolean)
                  }
                />
                <Label
                  htmlFor={allergy}
                  className="flex-1 cursor-pointer font-normal"
                >
                  {allergy}
                </Label>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Select all that apply
        </p>
      </div>
      {/* Health Conditions */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Health Conditions / Diseases (optional)
        </Label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DISEASE_OPTIONS.map((disease) => {
            const isChecked = data.diseases?.includes(disease) || false;

            return (
              <div
                key={disease}
                className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent transition-colors"
              >
                <Checkbox
                  id={`disease-${disease}`}
                  checked={isChecked}
                  onCheckedChange={(checked) =>
                    handleDiseaseToggle(disease, checked as boolean)
                  }
                />
                <Label
                  htmlFor={`disease-${disease}`}
                  className="flex-1 cursor-pointer font-normal"
                >
                  {disease}
                </Label>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          This helps us personalize food safety and recommendations
        </p>
      </div>

      {/* Other Dietary Restrictions */}
      <div className="space-y-2">
        <Label htmlFor="other-restrictions">
          Other Dietary Restrictions (optional)
        </Label>
        <Textarea
          id="other-restrictions"
          placeholder="E.g., Low sugar, Jain food, lactose sensitive"
          rows={4}
          value={data.other_restrictions || ''}
          onChange={handleOtherRestrictionsChange}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Tell us about any other dietary needs or preferences
        </p>
      </div>

      {/* Info box */}
      <div className="bg-accent/50 border border-accent rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Note:</strong> All fields on this page are optional. 
          You can skip this step and add this information later in your profile settings.
        </p>
      </div>
    </div>
  );
}
