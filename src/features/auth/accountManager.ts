export interface SavedAccount {
  id: string;
  email: string;
  fullName: string;
  avatarLetter: string;
  lastActive: string;
  role?: string;
  orgName?: string;
}

const STORAGE_KEY = 'staff_saved_accounts';

export const getSavedAccounts = (): SavedAccount[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Failed to parse saved accounts:', e);
    return [];
  }
};

export const saveCurrentAccount = (
  user: { id: string; email?: string | null },
  profile?: { full_name?: string | null } | null,
  orgName?: string,
  role?: string
) => {
  if (typeof window === 'undefined' || !user || !user.email) return;

  try {
    const existing = getSavedAccounts();
    const fullName =
      profile?.full_name?.trim() ||
      user.email.split('@')[0].replace(/[._]/g, ' ') ||
      'Staff User';

    const avatarLetter = (fullName.charAt(0) || user.email.charAt(0) || 'U').toUpperCase();

    const updatedAccount: SavedAccount = {
      id: user.id,
      email: user.email,
      fullName,
      avatarLetter,
      lastActive: new Date().toISOString(),
      role: role || 'Member',
      orgName: orgName || 'Default Workspace',
    };

    // Filter out same email and prepend to top
    const filtered = existing.filter((acc) => acc.email.toLowerCase() !== user.email!.toLowerCase());
    const newList = [updatedAccount, ...filtered].slice(0, 10); // keep up to 10 accounts

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
  } catch (e) {
    console.warn('Failed to save account to localStorage:', e);
  }
};

export const removeSavedAccount = (emailOrId: string) => {
  if (typeof window === 'undefined') return;
  try {
    const existing = getSavedAccounts();
    const filtered = existing.filter(
      (acc) => acc.email.toLowerCase() !== emailOrId.toLowerCase() && acc.id !== emailOrId
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Failed to remove saved account:', e);
  }
};
