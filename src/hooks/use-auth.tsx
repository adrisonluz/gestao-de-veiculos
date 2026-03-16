"use client";

import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { CompanyMembership, UserProfile, UserRole } from '@/lib/definitions';
import { can, type Action, type Resource } from '@/lib/rbac';

interface AuthContextType {
  user: User | null;
  loading: boolean;
    activeCompanyId: string | null;
    memberships: CompanyMembership[];
    activeRole: UserRole | null;
    hasPermission: (resource: Resource, action: Action) => boolean;
    reloadTenantContext: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    activeCompanyId: null,
    memberships: [],
    activeRole: null,
    hasPermission: () => false,
    reloadTenantContext: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
    const [memberships, setMemberships] = useState<CompanyMembership[]>([]);
    const [activeRole, setActiveRole] = useState<UserRole | null>(null);

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
        setActiveRole(resolvedMembership?.role ?? null);
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);

            if (!user) {
                setActiveCompanyId(null);
                setMemberships([]);
                setActiveRole(null);
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
            } finally {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const reloadTenantContext = async () => {
        if (!auth.currentUser) {
            return;
        }

        setLoading(true);
        try {
            await loadTenantContext(auth.currentUser);
        } catch (error) {
            console.error('Error reloading tenant context:', error);
            setActiveCompanyId(null);
            setMemberships([]);
            setActiveRole(null);
        } finally {
            setLoading(false);
        }
    };

    const hasPermission = (resource: Resource, action: Action) => can(activeRole, resource, action);

    return (
        <AuthContext.Provider
            value={{ user, loading, activeCompanyId, memberships, activeRole, hasPermission, reloadTenantContext }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
