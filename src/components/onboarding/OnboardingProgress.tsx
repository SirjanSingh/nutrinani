import { Check } from 'lucide-react';

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function OnboardingProgress({ currentStep, totalSteps }: OnboardingProgressProps) {
  return (
    <div className="w-full max-w-md mx-auto mb-8">
      {/* Step indicator text */}
      <div className="text-center mb-4">
        <p className="text-sm text-muted-foreground">
          Step {currentStep} of {totalSteps}
        </p> 
      </div>

      {/* Progress circles and lines */}
      <div className="flex items-center justify-center">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isFuture = stepNumber > currentStep;

          return (
            <div key={stepNumber} className="flex items-center">
              {/* Circle */}
              <div
                className={`
                  relative flex items-center justify-center
                  w-10 h-10 rounded-full border-2 transition-all duration-300
                  ${
                    isCompleted
                      ? 'bg-primary border-primary text-primary-foreground'
                      : isCurrent
                      ? 'border-primary bg-background text-primary'
                      : 'border-muted bg-background text-muted-foreground'
                  }
                `}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-medium">{stepNumber}</span>
                )}
              </div>

              {/* Connecting line (don't show after last step) */}
              {stepNumber < totalSteps && (
                <div
                  className={`
                    h-0.5 w-16 mx-2 transition-all duration-300
                    ${isCompleted ? 'bg-primary' : 'bg-muted'}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
