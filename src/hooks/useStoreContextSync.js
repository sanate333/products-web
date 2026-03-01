import { useEffect } from 'react';
import baseURL from '../Components/url';
import { getTiendaSlug } from '../utils/tienda';
import { useLocation } from 'react-router-dom';

export default function useStoreContextSync() {
  const location = useLocation();

  useEffect(() => {
    const slug = getTiendaSlug();
    const payload = new FormData();
    payload.append('slug', slug || 'principal');

    fetch(`${baseURL}/storeContextPost.php`, {
      method: 'POST',
      body: payload,
      credentials: 'include',
    }).catch(() => {});
  }, [location.pathname, location.search]);
}
