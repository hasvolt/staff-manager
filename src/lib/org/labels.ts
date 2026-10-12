import { useOrg } from '@/features/org/orgContext';

export interface OrgLabels {
  siteLabel: string;
  workLabel: string;
  preset: string;
}

export function getPresetLabels(preset: string = 'general', customSite?: string, customWork?: string): OrgLabels {
  const defaultSiteMap: Record<string, string> = {
    construction: 'Site',
    shop: 'Shop / Branch',
    factory: 'Unit / Line',
    farm: 'Field / Plot',
    household: 'House',
    general: 'Site',
    other: 'Site',
  };

  const defaultWorkMap: Record<string, string> = {
    construction: 'Work Type',
    shop: 'Task Type',
    factory: 'Job Type',
    farm: 'Operation',
    household: 'Task',
    general: 'Work Type',
    other: 'Work Type',
  };

  const siteLabel = customSite?.trim() || defaultSiteMap[preset] || 'Site';
  const workLabel = customWork?.trim() || defaultWorkMap[preset] || 'Work Type';

  return { siteLabel, workLabel, preset };
}

export function useOrgLabels(): OrgLabels {
  const { currentOrg } = useOrg();
  const settings = currentOrg?.settings;
  const preset = settings?.terminology_preset || 'general';

  return getPresetLabels(preset, settings?.custom_site_label, settings?.custom_work_label);
}
