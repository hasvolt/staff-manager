import './setup';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveCurrentAccount,
  getSavedAccounts,
  removeSavedAccount,
} from '@/features/auth/accountManager';
import { APP_VERSION, BUILD_DATE } from '@/lib/pwa/useAppUpdate';

describe('Account Switcher & App Version Update Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and retrieves multiple accounts on device', () => {
    expect(getSavedAccounts()).toEqual([]);

    saveCurrentAccount(
      { id: 'user-1', email: 'owner@shop.com' },
      { full_name: 'Rajesh Sharma' },
      'Apex Electricals',
      'owner'
    );

    const accounts1 = getSavedAccounts();
    expect(accounts1.length).toBe(1);
    expect(accounts1[0].email).toBe('owner@shop.com');
    expect(accounts1[0].fullName).toBe('Rajesh Sharma');
    expect(accounts1[0].orgName).toBe('Apex Electricals');
    expect(accounts1[0].avatarLetter).toBe('R');

    // Save a second account
    saveCurrentAccount(
      { id: 'user-2', email: 'supervisor@site.com' },
      { full_name: 'Anil Kumar' },
      'Metro Construction',
      'supervisor'
    );

    const accounts2 = getSavedAccounts();
    expect(accounts2.length).toBe(2);
    expect(accounts2[0].email).toBe('supervisor@site.com'); // Prepend most recent
    expect(accounts2[1].email).toBe('owner@shop.com');
  });

  it('updates existing account without creating duplicate entries', () => {
    saveCurrentAccount(
      { id: 'user-1', email: 'owner@shop.com' },
      { full_name: 'Rajesh' },
      'Shop A',
      'owner'
    );

    saveCurrentAccount(
      { id: 'user-1', email: 'owner@shop.com' },
      { full_name: 'Rajesh Sharma Updated' },
      'Shop B',
      'manager'
    );

    const accounts = getSavedAccounts();
    expect(accounts.length).toBe(1);
    expect(accounts[0].fullName).toBe('Rajesh Sharma Updated');
    expect(accounts[0].orgName).toBe('Shop B');
    expect(accounts[0].role).toBe('manager');
  });

  it('removes a saved account correctly', () => {
    saveCurrentAccount({ id: 'user-1', email: 'owner@shop.com' });
    saveCurrentAccount({ id: 'user-2', email: 'staff@shop.com' });

    expect(getSavedAccounts().length).toBe(2);

    removeSavedAccount('owner@shop.com');
    const remaining = getSavedAccounts();
    expect(remaining.length).toBe(1);
    expect(remaining[0].email).toBe('staff@shop.com');
  });

  it('has valid APP_VERSION and BUILD_DATE defined', () => {
    expect(APP_VERSION).toBeDefined();
    expect(APP_VERSION).toMatch(/^[0-9]+\.[0-9]+\.[0-9]+/);
    expect(BUILD_DATE).toBeDefined();
  });
});
