import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Lock, ArrowLeft, CheckCircle } from "lucide-react";
import { resetPassword } from "../../api/auth.api";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();

  const newPassword = watch("password");

  useEffect(() => {
    if (!token) {
      setServerError("Reset token is missing from the URL. Please verify your email link.");
    }
  }, [token]);

  const onSubmit = async (data) => {
    try {
      setServerError("");
      await resetPassword({
        token,
        password: data.password,
      });
      setSuccess(true);
    } catch (error) {
      setServerError(
        error.response?.data?.message || "Failed to reset password. The link may have expired."
      );
    }
  };

  return (
    <div className="animate-slide-up">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Set New Password</h2>
      <p className="text-gray-500 mb-6">Choose a secure, strong password for your account.</p>

      {serverError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {serverError}
        </div>
      )}

      {success ? (
        <div className="space-y-6 text-center py-4">
          <div className="flex justify-center">
            <CheckCircle className="w-16 h-16 text-emerald-500 animate-bounce" />
          </div>
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-sm font-medium">
            Your password has been reset successfully.
          </div>
          <Link
            to="/login"
            className="inline-flex items-center justify-center w-full px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Go to Login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="New Password"
            type="password"
            placeholder="••••••••"
            icon={Lock}
            error={errors.password?.message}
            disabled={!token}
            {...register("password", {
              required: "Password is required",
              minLength: { value: 6, message: "Password must be at least 6 characters" },
            })}
          />

          <Input
            label="Confirm New Password"
            type="password"
            placeholder="••••••••"
            icon={Lock}
            error={errors.confirmPassword?.message}
            disabled={!token}
            {...register("confirmPassword", {
              required: "Please confirm your password",
              validate: (val) => val === newPassword || "Passwords do not match",
            })}
          />

          <Button type="submit" loading={isSubmitting} disabled={!token} className="w-full">
            Reset Password
          </Button>

          <div className="text-center mt-6">
            <Link to="/login" className="inline-flex items-center text-xs text-primary-600 hover:underline">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Login
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
