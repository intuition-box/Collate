export interface PublicAppSettings {
  showActivityInNav: boolean;
}

export interface AdminSettingsResponse {
  authenticated: true;
  settings: PublicAppSettings;
}

export interface PublicSettingsResponse {
  settings: PublicAppSettings;
}
