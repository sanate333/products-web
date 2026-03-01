import React from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import useStoreContextSync from '../hooks/useStoreContextSync';

export default function StoreDashboardLayout() {
    useStoreContextSync();
    return <Outlet />;
}

export function StoreDashboardRedirect() {
    const { storeSlug } = useParams();
    const location = useLocation();
    const suffix = (location.pathname || '').replace(new RegExp(`^/dashboard/${storeSlug}`), '') || '';
    const search = location.search || '';
    const hash = location.hash || '';

    return <Navigate to={`/dashboard/s/${storeSlug}${suffix}${search}${hash}`} replace />;
}
