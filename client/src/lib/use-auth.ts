import { useEffect, useState } from 'react';
import axios from 'axios';
import { User } from '../components/interfaces';

const useAuth = () => {
  const [user, setUser] = useState<User | null>(null); 
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get('http://localhost:4000/api/auth/user', { withCredentials: true });
        setUser(response.data.user);
        
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  return { user, loading };
};

export default useAuth;
