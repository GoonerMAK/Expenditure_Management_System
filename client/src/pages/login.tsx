import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import axios from 'axios';
import { jwtDecode, JwtPayload } from 'jwt-decode'; 
import Cookies from 'js-cookie';
import useAuth from '../lib/use-auth';
import { getServerMessage } from '../lib/utils';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user: authenticatedUser } = useAuth();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      const response = await axios.post('http://localhost:4000/api/auth/login', { email, password }, { withCredentials: true });
      const decodedToken = jwtDecode<JwtPayload>(response.data.token); 

      Cookies.set('jwt', response.data.token, { expires: new Date((decodedToken as {exp:number}).exp * 1000 )})

      navigate('/dashboard');
    } catch (error) {
      setError(getServerMessage(error) || (error instanceof Error ? error.message : '') || 'Login failed');
    }
  };

  useEffect(() => {
    if (authenticatedUser) {
      navigate('/dashboard');
    }
  }, [authenticatedUser, navigate]);

  return (
    <div className="w-full flex items-center justify-center py-12 mt-20">
      <div className="mx-auto grid w-[350px] gap-6">
        <div className="grid gap-3 text-center">
          <h1 className="text-3xl font-bold">Login</h1>
          <p className="text-balance text-muted-foreground">
            Enter your email below to login to your account
          </p>
        </div>
        
        {error && <p className="text-red-500">{error}</p>}

        <form onSubmit={handleLogin} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="something@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center">
              <Label htmlFor="password">Password</Label>
              <Link
                to="/forgot-password"
                className="ml-auto inline-block text-sm underline"
              >
                Forgot your password?
              </Link>
            </div>

            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full">
            Login
          </Button>
        </form>

        <div className="mt-0 text-center text-sm">
          Don't have an account?{' '}
          <Link to="/signup" className="underline">
            Sign up
          </Link>
        </div>

      </div>
    </div>
  );
}

export default Login;
