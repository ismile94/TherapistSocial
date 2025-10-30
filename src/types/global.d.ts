// src/types/global.d.ts (yeni dosya oluşturun)
export {};

declare global {
  interface Window {
    updateProfileInState?: (updatedProfile: Profile) => void;
    updateProfileInAllComponents?: (profileId: string, updates: Partial<Profile>) => void;
  }
}