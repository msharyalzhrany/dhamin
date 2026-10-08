import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const variants = {
  primary: 'bg-brand text-on-brand hover:brightness-110 shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--brand)_70%,transparent)]',
  dark: 'bg-deep text-white hover:bg-black dark:bg-mist dark:text-deep dark:hover:bg-white',
  outline: 'border border-line bg-surface text-ink hover:bg-surface-2',
  ghost: 'text-ink hover:bg-surface-2',
  soft: 'bg-brand-soft text-brand-text hover:brightness-95',
  glass: 'border border-white/25 bg-white/10 text-white backdrop-blur hover:bg-white/20',
} as const;
const sizes = { sm: 'h-9 px-4 text-sm', md: 'h-11 px-5 text-sm', lg: 'h-12 px-7 text-base', icon: 'size-10 p-0' } as const;

export function buttonStyles(variant: keyof typeof variants = 'primary', size: keyof typeof sizes = 'md', className?: string) {
  return cn(
    'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
    variants[variant], sizes[size], className,
  );
}

type BProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants; size?: keyof typeof sizes; loading?: boolean };
export const Button = forwardRef<HTMLButtonElement, BProps>(({ variant, size, loading, className, children, disabled, ...p }, ref) => (
  <button ref={ref} className={buttonStyles(variant, size, className)} disabled={disabled || loading} {...p}>
    {loading && <Loader2 className="size-4 animate-spin" />}
    {children}
  </button>
));
Button.displayName = 'Button';

export function LinkButton({ variant, size, className, children, ...p }: LinkProps & { variant?: keyof typeof variants; size?: keyof typeof sizes; children: ReactNode }) {
  return <Link className={buttonStyles(variant, size, className)} {...p}>{children}</Link>;
}
