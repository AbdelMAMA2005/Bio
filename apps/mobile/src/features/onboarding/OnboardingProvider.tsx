import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { markOnboardingSeen } from '@/features/onboarding/onboardingStorage';

type OnboardingContextValue = {
  seen: boolean;
  complete: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children, initialSeen }: { children: ReactNode; initialSeen: boolean }) {
  const [seen, setSeen] = useState(initialSeen);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      seen,
      complete: () => {
        setSeen(true);
        markOnboardingSeen().catch(() => {});
      },
    }),
    [seen],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
