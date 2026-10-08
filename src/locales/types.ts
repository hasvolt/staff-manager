export type LanguageCode =
  | 'en'
  | 'hi'
  | 'ur'
  | 'bn'
  | 'mr'
  | 'gu'
  | 'pa'
  | 'ta'
  | 'te'
  | 'kn'
  | 'ml'
  | 'or'
  | 'as'
  | 'ne'
  | 'ar'
  | 'es';

export interface LanguageMeta {
  code: LanguageCode;
  name: string;
  nativeName: string;
  isRTL: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: 'en', name: 'English', nativeName: 'English', isRTL: false },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', isRTL: false },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', isRTL: true },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', isRTL: false },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', isRTL: false },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', isRTL: false },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', isRTL: false },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', isRTL: false },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', isRTL: false },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', isRTL: false },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', isRTL: false },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', isRTL: false },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', isRTL: false },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', isRTL: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', isRTL: true },
  { code: 'es', name: 'Spanish', nativeName: 'Español', isRTL: false },
];

export type Translations = Record<string, string>;
