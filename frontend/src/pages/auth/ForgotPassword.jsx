import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, Info } from "lucide-react";
import { forgotPassword } from "../../api/auth.api";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

export default function ForgotPassword() {
  const [successMessage, setSuccessMessage] = useState("");
  const [serverError, setServerError] = useState("");
  const [mockResetUrl, setMockResetUrl] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (data) => {
    try {
      setServerError("");
      setSuccessMessage("");
      setMockResetUrl("");
      const res = await forgotPassword(data);
      if (res.data?.success) {
        setSuccessMessage(res.data.message || "A password reset link has been sent to your email.");
        if (res.data.data?.resetUrl) {
          setMockResetUrl(res.data.data.resetUrl);
        }
      }
    } catch (error) {
      setServerError(
        error.response?.data?.message || "Failed to process forgot password. Please try again."
      );
    }
  };

  return (
    <div className="animate-slide-up">
      <div className="mb-6">
        <Link to="/login" className="inline-flex items-center text-xs text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-3 h-3 mr-1" /> Back to Login
        </Link>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-1">Reset Password</h2>
      <p className="text-gray-500 mb-6">Enter your registered email address to receive recovery details.</p>

      {serverError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {serverError}
        </div>
      )}

      {successMessage && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-sm">
            {successMessage}
          </div>

          {mockResetUrl && (
            <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 p-4 rounded-lg text-xs space-y-2">
              <p className="font-bold flex items-center gap-1">
                <Info className="w-4 h-4 text-indigo-500" /> Dev Mock Transporter link:
              </p>
              <p className="text-gray-500">Since we are using Ethereal/mock transport, you can click directly below to simulate opening the reset email link:</p>
              <a
                href={mockResetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-1 font-mono text-primary-600 hover:underline break-all"
              >
                {mockResetUrl}
              </a>
            </div>
          )}
        </div>
      )}

      {!successMessage && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            icon={Mail}
            error={errors.email?.message}
            {...register("email", { required: "Email is required" })}
          />

          <Button type="submit" loading={isSubmitting} className="w-full">
            Send Reset Link
          </Button>
        </form>
      )}
    </div>
  );
}
