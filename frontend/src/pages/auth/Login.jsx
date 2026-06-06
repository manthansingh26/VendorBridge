import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { loginSchema } from "../../validations/authSchema";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

export default function Login() {
  const [serverError, setServerError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    try {
      setServerError("");
      const user = await login(data);
      // Redirect based on role
      if (user.role === "ADMIN") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      setServerError(
        error.response?.data?.message || "Login failed. Please try again."
      );
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
      <p className="text-gray-500 mb-6">Sign in to your account</p>

      {serverError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          icon={Mail}
          error={errors.email?.message}
          {...register("email")}
        />

        <div className="relative">
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            icon={Lock}
            error={errors.password?.message}
            {...register("password")}
          />
          <div className="flex justify-end mt-1">
            <Link to="/forgot-password" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
              Forgot password?
            </Link>
          </div>
        </div>

        <Button type="submit" loading={isSubmitting} className="w-full">
          Sign In
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Don't have an account?{" "}
        <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
          Sign up
        </Link>
      </p>
    </div>
  );
}
