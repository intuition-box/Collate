export interface PublicAppSettings {
  showActivityInNav: boolean;
}

export interface CreationLimits {
  atomLimit: number;
  listLimit: number;
}

export interface AdminAppSettings extends PublicAppSettings, CreationLimits {
  privilegedLimit: number;
  allowlistedWallets: string[];
}

export interface CreationLimitsResponse {
  limits: CreationLimits;
}

export interface AdminSettingsResponse {
  authenticated: true;
  settings: AdminAppSettings;
}

export interface PublicSettingsResponse {
  settings: PublicAppSettings;
}
