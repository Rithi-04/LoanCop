import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Landmark, Lock, User, AlertCircle, Loader } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui';
import { authApi } from '../api';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Decode JWT manually to avoid extra package issues
  const decodeToken = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const data = await authApi.login(params);
      
      // Save Token
      localStorage.setItem('token', data.access_token);

      // Parse payload for role & details
      const payload = decodeToken(data.access_token);
      if (payload) {
        const role = payload.role;
        const sub = payload.sub;
        localStorage.setItem('role', role);
        localStorage.setItem('user', sub);
        
        // Redirect to dashboard (map LoanOfficer role to officer path)
        navigate(role === 'LoanOfficer' ? '/officer/dashboard' : `/${role.toLowerCase()}/dashboard`);
      } else {
        throw new Error("Could not parse JWT contents.");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 
        'Invalid credentials. Try using default seeded accounts: customer/customer123, officer/officer123, or manager/manager123.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-brand-slate min-h-screen flex flex-col items-center justify-center p-4 font-sans">
      <div className="mb-6 flex items-center space-x-2.5">
        <div className="bg-brand-navy p-1.5 rounded-md text-brand-emerald">
          <Landmark className="w-6 h-6" />
        </div>
        <span className="font-sans font-bold text-xl text-brand-navy tracking-tight">
          LEND<span className="text-brand-emerald">.AI</span>
        </span>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Sign In</CardTitle>
          <CardDescription>
            Access the loan decision intelligence workspace
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-start space-x-2 bg-slate-100 text-brand-navy border border-brand-border rounded-md p-3 text-xs font-medium leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 text-brand-muted mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="relative">
              <Input
                label="Username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="pl-9"
              />
              <User className="absolute bottom-2.5 left-3 w-4 h-4 text-brand-muted" />
            </div>

            <div className="relative">
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="pl-9"
              />
              <Lock className="absolute bottom-2.5 left-3 w-4 h-4 text-brand-muted" />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              variant="primary"
              className="w-full flex items-center justify-center gap-2 cursor-pointer"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin text-brand-emerald" />
                  <span>Authenticating...</span>
                </>
              ) : (
                'Log In'
              )}
            </Button>

            <div className="text-center text-xs text-brand-muted">
              Don't have an account?{' '}
              <Link to="/register" className="text-brand-emerald font-semibold hover:underline">
                Create Account
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
      
      {/* Seed credentials helpful panel */}
      <div className="mt-6 text-center text-xs text-brand-muted max-w-sm">
        <p className="font-semibold text-brand-navy mb-1">Testing Seed Credentials:</p>
        <p>Customer: <code className="bg-white px-1.5 py-0.5 border border-brand-border rounded">customer</code> / <code className="bg-white px-1.5 py-0.5 border border-brand-border rounded">customer123</code></p>
        <p className="mt-1">Officer: <code className="bg-white px-1.5 py-0.5 border border-brand-border rounded">officer</code> / <code className="bg-white px-1.5 py-0.5 border border-brand-border rounded">officer123</code></p>
        <p className="mt-1">Manager: <code className="bg-white px-1.5 py-0.5 border border-brand-border rounded">manager</code> / <code className="bg-white px-1.5 py-0.5 border border-brand-border rounded">manager123</code></p>
      </div>
    </div>
  );
};
