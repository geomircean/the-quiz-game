import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/utils';

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
  {
    variants: {
      theme: {
        default: 'text-foreground',
        purple: 'text-purple-200',
      },
    },
    defaultVariants: {
      theme: 'default',
    },
  },
);

const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, theme, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants({ theme }), className)} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
