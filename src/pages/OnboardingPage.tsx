import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import { OnboardingStep1 } from '@/components/onboarding/OnboardingStep1';
import { OnboardingStep2 } from '@/components/onboarding/OnboardingStep2';
import { OnboardingStep3 } from '@/components/onboarding/OnboardingStep3';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import {
  validateStep1,
  validateStep2,
  formatOnboardingData,
  saveOnboardingToSession,
  loadOnboardingFromSession,
  clearOnboardingSession,
} from '@/lib/onboarding';
import { INITIAL_ONBOARDING_DATA, type OnboardingFormData } from '@/types/onboarding';
import logo from '@/assets/nutrinani-logo.png';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile, saveProfile } = useProfile();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<OnboardingFormData>>(INITIAL_ONBOARDING_DATA);
  const [errors, setErrors] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load saved data from session storage on mount
  useEffect(() => {
    const saved = loadOnboardingFromSession();
    if (saved) {
      setFormData(saved);
    }
  }, []);

  // Save data to session storage whenever it changes
  useEffect(() => {
    saveOnboardingToSession(formData);
  }, [formData]);

  const handleDataChange = (newData: Partial<OnboardingFormData>) => {
    setFormData(newData);
    // Clear errors when user makes changes
    setErrors({});
  };

  const handleNext = () => {
    // Validate current step before proceeding
    if (currentStep === 1) {
      const validation = validateStep1(formData);
      if (!validation.isValid) {
        setErrors(validation.errors);
        return;
      }
    } else if (currentStep === 2) {
      const validation = validateStep2(formData);
      if (!validation.isValid) {
        setErrors(validation.errors);
        return;
      }
    }

    // Move to next step
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
      setErrors({});
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  const handleSubmit = async (completed: boolean) => {
    setIsSubmitting(true);

    try {
      // Format data for submission
      const submissionData = formatOnboardingData({
        ...formData,
        onboarding_completed: completed,
      });

      await saveProfile(submissionData);
      console.log('Onboarding data submitted:', submissionData);

      // Clear session storage
      clearOnboardingSession();

      // Show success message
      toast({
        title: completed ? 'Profile setup complete!' : 'Setup skipped',
        description: completed 
          ? 'Your profile has been saved successfully.'
          : 'You can complete your profile anytime from settings.',
      });

      // Redirect to dashboard
      navigate('/');
    } catch (error: any) {
      console.error('Onboarding submission error:', error);
      toast({
        title: 'Submission failed',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = () => handleSubmit(true);
  const handleSkip = () => handleSubmit(false);
  // Prefill from saved profile (if any) and Cognito name
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      ...(profile || {}),
      name: prev.name || (profile?.name as string) || user?.name || '',
    }));
  }, [profile, user?.name]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={logo} alt="NutriNani Logo" className="w-20 h-20 mx-auto mb-4 rounded-full shadow-lg" />
          <h1 className="text-3xl font-bold mb-1">
            <span style={{ color: '#6DAA33' }}>Nutri</span>
            <span style={{ color: '#C86A3B' }}>Nani</span>
          </h1>
          <p className="text-muted-foreground">Let's personalize your experience</p>
        </div>

        {/* Progress Indicator */}
        <OnboardingProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />

        {/* Form Card */}
        <Card className="shadow-xl border-0">
          <CardContent className="p-6 sm:p-8">
            {/* Step Content */}
            {currentStep === 1 && (
              <OnboardingStep1
                data={formData}
                onChange={handleDataChange}
                errors={errors}
              />
            )}
            {currentStep === 2 && (
              <OnboardingStep2
                data={formData}
                onChange={handleDataChange}
                errors={errors}
              />
            )}
            {currentStep === 3 && (
              <OnboardingStep3
                data={formData}
                onChange={handleDataChange}
              />
            )}

            {/* Navigation Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              {/* Back Button */}
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="sm:w-auto"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Next/Complete/Skip Buttons */}
              {currentStep < TOTAL_STEPS ? (
                <Button
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="sm:w-auto"
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                    disabled={isSubmitting}
                    className="sm:w-auto"
                  >
                    Skip for now
                  </Button>
                  <Button
                    onClick={handleComplete}
                    disabled={isSubmitting}
                    className="sm:w-auto"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Complete setup'
                    )}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
