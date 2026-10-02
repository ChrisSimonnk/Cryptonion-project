import { create } from 'zustand';
import { UserDTO, OrganizationDTO, Role, Permission, AuthenticatedContextDTO } from '@cryptonion/shared';

interface AuthState {
  token: string | null;
  user: UserDTO | null;
  organization: OrganizationDTO | null;
  role: Role | null;
  permissions: Permission[];
  availableOrganizations: Array<{ organization: OrganizationDTO; role: Role }>;
  isAuthenticated: boolean;
  setAuth: (data: { 
    token: string; 
    user: UserDTO; 
    organization: OrganizationDTO; 
    role: Role; 
    permissions?: Permission[]; 
    availableOrganizations?: Array<{ organization: OrganizationDTO; role: Role }> 
  }) => void;
  switchOrganization: (token: string, organization: OrganizationDTO, role: Role, permissions?: Permission[]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('cryptonion_token') : null,
  user: typeof window !== 'undefined' && localStorage.getItem('cryptonion_user') ? JSON.parse(localStorage.getItem('cryptonion_user')!) : null,
  organization: typeof window !== 'undefined' && localStorage.getItem('cryptonion_org') ? JSON.parse(localStorage.getItem('cryptonion_org')!) : null,
  role: typeof window !== 'undefined' && localStorage.getItem('cryptonion_role') ? (localStorage.getItem('cryptonion_role') as Role) : null,
  permissions: typeof window !== 'undefined' && localStorage.getItem('cryptonion_perms') ? JSON.parse(localStorage.getItem('cryptonion_perms')!) : [],
  availableOrganizations: typeof window !== 'undefined' && localStorage.getItem('cryptonion_orgs') ? JSON.parse(localStorage.getItem('cryptonion_orgs')!) : [],
  isAuthenticated: typeof window !== 'undefined' ? !!localStorage.getItem('cryptonion_token') : false,

  setAuth: ({ token, user, organization, role, permissions = [], availableOrganizations = [] }) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cryptonion_token', token);
      localStorage.setItem('cryptonion_user', JSON.stringify(user));
      localStorage.setItem('cryptonion_org', JSON.stringify(organization));
      localStorage.setItem('cryptonion_role', role);
      localStorage.setItem('cryptonion_perms', JSON.stringify(permissions));
      localStorage.setItem('cryptonion_orgs', JSON.stringify(availableOrganizations));
    }
    set({ token, user, organization, role, permissions, availableOrganizations, isAuthenticated: true });
  },

  switchOrganization: (token, organization, role, permissions = []) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cryptonion_token', token);
      localStorage.setItem('cryptonion_org', JSON.stringify(organization));
      localStorage.setItem('cryptonion_role', role);
      localStorage.setItem('cryptonion_perms', JSON.stringify(permissions));
    }
    set({ token, organization, role, permissions });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cryptonion_token');
      localStorage.removeItem('cryptonion_user');
      localStorage.removeItem('cryptonion_org');
      localStorage.removeItem('cryptonion_role');
      localStorage.removeItem('cryptonion_perms');
      localStorage.removeItem('cryptonion_orgs');
    }
    set({ token: null, user: null, organization: null, role: null, permissions: [], availableOrganizations: [], isAuthenticated: false });
  },
}));
