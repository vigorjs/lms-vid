"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";

export function SubmitButton({ children, className, pendingLabel = "Menyimpan…", variant = "primary", ...props }) {
  const { pending } = useFormStatus();
  return <Button className={className} variant={variant} disabled={pending || props.disabled} {...props}>{pending ? <LoaderCircle size={17} className="animate-spin" /> : null}{pending ? pendingLabel : children}</Button>;
}

export function StateToast({ state }) {
  const router = useRouter();
  useEffect(() => {
    if (!state?.message) return;
    (state.ok ? toast.success : toast.error)(state.message);
    if (state.ok && state.redirectTo) {
      router.push(state.redirectTo);
      router.refresh();
    }
  }, [state, router]);
  return null;
}

export function ActionButtonForm({ action, fields, children, className, buttonClassName, pendingLabel, ...buttonProps }) {
  const [state, formAction] = useActionState(action, null);
  return <form action={formAction} className={className}>
    <StateToast state={state} />
    {Object.entries(fields || {}).map(([name, value]) => <input key={name} type="hidden" name={name} value={String(value)} />)}
    <SubmitButton className={buttonClassName || (className?.includes("w-full") ? "w-full" : undefined)} pendingLabel={pendingLabel} {...buttonProps}>{children}</SubmitButton>
  </form>;
}
