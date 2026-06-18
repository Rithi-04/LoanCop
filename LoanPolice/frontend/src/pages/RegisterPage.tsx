import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Landmark, AlertCircle, CheckCircle2, Loader } from 'lucide-react';
import { Button, Input, Select, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui';
import { authApi } from '../api';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Customer');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !username || !password) {
      setError('Please fill in all the required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      await authApi.register({
        username,
        password,
        full_name: fullName,
        email,
        role,
      });

      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Username may already be in use.');
    } finally {
      setIsLoading(false);
    }
  };

  const roleOptions = [
    { value: 'Customer', label: 'Customer (Borrower/Applicant)' },
    { value: 'LoanOfficer', label: 'Loan Officer (Credit Evaluator)' },
    { value: 'Manager', label: 'Branch/Compliance Manager' }
  ];

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
          <CardTitle>Create Account</CardTitle>
          <CardDescription>
            Register to join the lending decision workspace
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-start space-x-2 bg-slate-100 text-brand-navy border border-brand-border rounded-md p-3 text-xs font-medium leading-normal">
                <AlertCircle className="w-4 h-4 shrink-0 text-brand-muted mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-start space-x-2 bg-emerald-50 text-brand-emerald border border-emerald-200 rounded-md p-3 text-xs font-medium leading-normal">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <Input
              label="Full Name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Alice Johnson"
            />

            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. alice@example.com"
            />

            <Input
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Pick a unique username"
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
            />

            <Select
              label="Account Workspace Role"
              options={roleOptions}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
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
                  <span>Registering...</span>
                </>
              ) : (
                'Create Account'
              )}
            </Button>

            <div className="text-center text-xs text-brand-muted">
              Already have an account?{' '}
              <Link to="/login" className="text-brand-emerald font-semibold hover:underline">
                Sign In
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
