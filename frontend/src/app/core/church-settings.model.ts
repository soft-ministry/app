export interface ChurchSummary {
  id: number;
  name: string;
  avatarUrl?: string | null;
  pastorName?: string | null;
  denomination?: string | null;
  address?: string | null;
  treasurerName?: string | null;
  secretaryName?: string | null;
  contactPerson?: string | null;
}

export interface ChurchSettings {
  id: number;
  name: string;
  avatarUrl?: string | null;
  pastorName?: string | null;
  denomination?: string | null;
  address?: string | null;
  treasurerName?: string | null;
  secretaryName?: string | null;
  contactPerson?: string | null;
  attendanceEnabled: boolean;
  churches: ChurchSummary[];
}

export interface ChurchSettingsRequest {
  name: string;
  pastorName?: string | null;
  denomination?: string | null;
  address?: string | null;
  treasurerName?: string | null;
  secretaryName?: string | null;
  contactPerson?: string | null;
}
