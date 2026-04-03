"use client";

import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { AclProfile, CompanyMembership, UserProfile, UserRole } from '@/lib/definitions';
import { resolvePermission, type Action, type Resource } from '@/lib/rbac';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  activeCompanyId: string | null;
  memberships: CompanyMembership[];
  activeRole: UserRole | null;
  activeAclProfile: AclProfile | null;
  hasPermission: (resource: Resource, action: Action) => boolean;
  reloadTenantContext: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  activeCompanyId: null,
  memberships: [],
  activeRole: null,
  activeAclProfile: null,
  hasPermission: () => false,
  reloadTenantContext: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<CompanyMembership[]>([]);
  const [activeRole, setActiveRole] = useState<UserRole | null>(null);
  const [activeAclProfile, setActiveAclProfile] = useState<AclProfile | null>(null);

  const loadTenantContext = async (currentUser: User) => {
    const profileRef = doc(db, 'user_profiles', currentUser.uid);
    const profileSnap = await getDoc(profileRef);
    const profile = profileSnap.exists() ? (profileSnap.data() as UserProfile) : null;

    const membershipQuery = query(
      collection(db, 'company_memberships'),
      where('userId', '==', currentUser.uid),
      where('status', '==', 'active')
    );
    const membershipSnap = await getDocs(membershipQuery);
    const loadedMemberships = membershipSnap.docs.map((membershipDoc) => ({
      id: membershipDoc.id,
      ...(membershipDoc.data() as Omit<CompanyMembership, 'id'>),
    }));

    const preferredCompanyId = profile?.activeCompanyId ?? null;
    const fallbackCompanyId = loadedMemberships[0]?.companyId ?? null;
    const resolvedCompanyId = preferredCompanyId || fallbackCompanyId;

    setMemberships(loadedMemberships);
    setActiveCompanyId(resolvedCompanyId);

    const resolvedMembership = loadedMemberships.find(
      (membership) => membership.companyId === resolvedCompanyId
    );
    const resolvedRole = resolvedMembership?.role ?? null;
    setActiveRole(resolvedRole);

    // Load ACL profile if the membership has one assigned
    const aclProfileId = resolvedMembership?.aclProfileId;
    if (aclProfileId && resolvedCompanyId) {
      try {
        const aclProfileRef = doc(db, 'acl_profiles', aclProfileId);
        const aclProfileSnap = await getDoc(aclProfileRef);
        if (aclProfileSnap.exists() && aclProfileSnap.data().companyId === resolvedCompanyId) {
          const aclData = aclProfileSnap.data();
          setActiveAclProfile({
            id: aclProfileSnap.id,
            companyId: aclData.companyId,
            name: aclData.name,
            description: aclData.description ?? '',
            permissions: aclData.permissions ?? {},
            isSystem: aclData.isSystem ?? false,
            createdAt: aclData.createdAt?.toDate() ?? new Date(),
            createdBy: aclData.createdBy ?? '',
          });
        } else {
          setActiveAclProfile(null);
        }
      } catch {
        setActiveAclProfile(null);
      }
    } else {
      setActiveAclProfile(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      if (!user) {
        setActiveCompanyId(null);
        setMemberships([]);
        setActiveRole(null);
        setActiveAclProfile(null);
        setLoading(false);
        return;
      }

      try {
        await loadTenantContext(user);
      } catch (error) {
        console.error('Error loading tenant context:', error);
        setActiveCompanyId(null);
        setMemberships([]);
        setActiveRole(null);
        setActiveAclProfile(null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const reloadTenantContext = async () => {
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      await loadTenantContext(auth.currentUser);
    } catch (error) {
      console.error('Error reloading tenant context:', error);
      setActiveCompanyId(null);
      setMemberships([]);
      setActiveRole(null);
      setActiveAclProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (resource: Resource, action: Action) =>
    resolvePermission(activeRole, activeAclProfile, resource, action);

  return (
    <AuthContext.Provider
      value={{ user, loading, activeCompanyId, memberships, activeRole, activeAclProfile, hasPermission, reloadTenantContext }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
