"use client";
import { useEffect } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";

export function SubmitButton({ children, className, variant = "primary", ...props }) {
  const { pending } = useFormStatus();
  return <Button className={className} variant={variant} disabled={pending || props.disabled} {...props}>{pending ? <LoaderCircle size={17} className="animate-spin" /> : null}{pending ? "Menyimpan…" : children}</Button>;
}
export function StateToast({ state }) {
  useEffect(() => { if (state?.message) (state.ok ? toast.success : toast.error)(state.message); }, [state]);
  return null;
}
