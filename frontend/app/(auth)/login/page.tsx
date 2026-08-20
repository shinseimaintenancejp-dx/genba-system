"use client";

/**
 * Genba Management System — Login Page.
 *
 * Implements:
 * - react-hook-form + zod validation (FE§6)
 * - Japanese error messages
 * - Loading state with Loader2 spinner (ui-ux-genba-spec.md §5.2)
 * - httpOnly cookie auth (no token in JS)
 * - Auto-redirect after successful login
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Metadata } from "next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, Building2 } from "lucide-react";
import { useLogin } from "@/hooks/useAuth";

// =============================================================================
// Form Validation Schema (FE§6)
// =============================================================================
const loginSchema = z.object({
  username: z
    .string()
    .min(1, "ユーザー名を入力してください")
    .max(100, "ユーザー名が長すぎます"),
  password: z
    .string()
    .min(1, "パスワードを入力してください")
    .max(200, "パスワードが長すぎます"),
});

type LoginFormData = z.infer<typeof loginSchema>;

// =============================================================================
// Login Page Component
// =============================================================================
const LoginPage = () => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const { mutate: login, isPending, error } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = (data: LoginFormData) => {
    login(data, {
      onSuccess: () => {
        router.push("/genba");
        router.refresh();
      },
    });
  };

  // Extract Japanese error message from API response
  const getApiError = (): string | null => {
    if (!error) return null;
    const axiosError = error as { response?: { data?: { error?: { message?: string } } } };
    return axiosError?.response?.data?.error?.message ?? "ログインに失敗しました";
  };

  return (
    <div className="w-full">
      {/* Logo & System Name */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-500/30">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          現場管理システム
        </h1>
        <p className="text-slate-400 text-sm mt-1">株式会社シンセイ</p>
      </div>

      {/* Login Card */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
        <h2 className="text-lg font-semibold text-white mb-6">ログイン</h2>

        {/* API Error Message */}
        {getApiError() && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
          >
            {getApiError()}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {/* Username Field */}
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-slate-300 mb-1.5"
            >
              ユーザー名
              <span className="text-red-400 ml-1">*</span>
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              autoFocus
              aria-invalid={!!errors.username}
              aria-describedby={errors.username ? "username-error" : undefined}
              className={`
                w-full h-10 px-3 rounded-lg text-sm
                bg-white/10 border text-white placeholder:text-slate-500
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                transition-colors duration-150
                ${errors.username
                  ? "border-red-500/50 focus:ring-red-500"
                  : "border-white/10 hover:border-white/20"
                }
              `}
              placeholder="ユーザー名を入力"
              {...register("username")}
            />
            {errors.username && (
              <p id="username-error" className="mt-1 text-xs text-red-400">
                {errors.username.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-300 mb-1.5"
            >
              パスワード
              <span className="text-red-400 ml-1">*</span>
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
                className={`
                  w-full h-10 pl-3 pr-10 rounded-lg text-sm
                  bg-white/10 border text-white placeholder:text-slate-500
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  transition-colors duration-150
                  ${errors.password
                    ? "border-red-500/50 focus:ring-red-500"
                    : "border-white/10 hover:border-white/20"
                  }
                `}
                placeholder="パスワードを入力"
                {...register("password")}
              />
              <button
                type="button"
                id="toggle-password-visibility"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "パスワードを非表示" : "パスワードを表示"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p id="password-error" className="mt-1 text-xs text-red-400">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Submit Button (ui-ux-genba-spec.md §2.1 + §2.2.1) */}
          <button
            id="login-submit"
            type="submit"
            disabled={isPending}
            className={`
              w-full h-10 rounded-lg text-sm font-medium
              flex items-center justify-center gap-2
              transition-all duration-150
              ${isPending
                ? "bg-blue-600/50 text-white/50 cursor-not-allowed pointer-events-none opacity-50"
                : "bg-[#1E60F2] hover:bg-[#0F4FD0] text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-[0.98]"
              }
            `}
            aria-busy={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>ログイン中...</span>
              </>
            ) : (
              "ログイン"
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p className="text-center text-slate-600 text-xs mt-6">
        © 2026 Shinsei Co., Ltd. All rights reserved.
      </p>
    </div>
  );
};

export default LoginPage;
