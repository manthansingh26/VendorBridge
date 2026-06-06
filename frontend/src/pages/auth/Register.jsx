import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, User, Phone, Globe, Briefcase, Camera } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { registerSchema } from "../../validations/authSchema";
import { uploadAvatar } from "../../api/user.api";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Select from "../../components/ui/Select";
import Textarea from "../../components/ui/Textarea";

export default function Register() {
  const [serverError, setServerError] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: "PROCUREMENT_OFFICER",
      country: "India",
    }
  });

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data) => {
    try {
      setServerError("");
      const { confirmPassword, ...userData } = data;
      // Combine first name and last name
      userData.name = `${data.firstName} ${data.lastName}`;
      
      // Call authentication register
      await registerUser(userData);
      
      // If user selected an avatar, upload it now
      if (avatarFile) {
        const formData = new FormData();
        formData.append("avatar", avatarFile);
        await uploadAvatar(formData);
      }
      
      navigate("/dashboard");
    } catch (error) {
      setServerError(
        error.response?.data?.message || "Registration failed. Please try again."
      );
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Create account</h2>
      <p className="text-gray-500 mb-6">Get started with your free account</p>

      {serverError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Avatar Upload Container */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-50 flex items-center justify-center shadow-sm">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-gray-300" />
            )}
            <label className="absolute bottom-0 right-0 left-0 bg-black/60 hover:bg-black/85 cursor-pointer text-white py-1 flex items-center justify-center transition-colors">
              <Camera className="w-3.5 h-3.5" />
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
          </div>
          <span className="text-[10px] text-gray-400 mt-1.5 uppercase font-semibold">Upload profile photo</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            type="text"
            placeholder="John"
            icon={User}
            error={errors.firstName?.message}
            {...register("firstName")}
          />
          <Input
            label="Last Name"
            type="text"
            placeholder="Doe"
            icon={User}
            error={errors.lastName?.message}
            {...register("lastName")}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            icon={Mail}
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label="Username"
            type="text"
            placeholder="username"
            icon={User}
            error={errors.username?.message}
            {...register("username")}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Phone"
            type="tel"
            placeholder="9876543210"
            icon={Phone}
            error={errors.phone?.message}
            {...register("phone")}
          />
          <Select
            label="Role / Title"
            options={[
              { value: "PROCUREMENT_OFFICER", label: "Procurement Officer" },
              { value: "MANAGER", label: "Procurement Manager" },
              { value: "VENDOR", label: "Supplier / Vendor Portal" },
              { value: "ADMIN", label: "System Administrator" },
            ]}
            error={errors.role?.message}
            {...register("role")}
          />
        </div>

        <Input
          label="Country"
          type="text"
          placeholder="India"
          icon={Globe}
          error={errors.country?.message}
          {...register("country")}
        />

        <Textarea
          label="Professional Information (Bio)"
          placeholder="Enter experience, department details, or business certification info..."
          icon={Briefcase}
          error={errors.professionalInfo?.message}
          {...register("professionalInfo")}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Password"
            type="password"
            placeholder="Min 6 characters"
            icon={Lock}
            error={errors.password?.message}
            {...register("password")}
          />
          <Input
            label="Confirm Password"
            type="password"
            placeholder="Re-enter password"
            icon={Lock}
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
        </div>

        <Button type="submit" loading={isSubmitting} className="w-full">
          Create Account
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Already have an account?{" "}
        <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
