import React from 'react';

import { cn } from '@/utils';
// const Card = ({ title, children, className, isActive, onClick }) => {
//   const wrapperClassNames = classNames(
//     'group relative block h-60 basis-1/5 ',
//     className,
//     {
//       'cursor-not-allowed bg-gray-500/20': !isActive,
//       'cursor-pointer': isActive,
//     });
//
//   return (
//     <a onClick={isActive ? onClick : noop} className={wrapperClassNames}>
//       <span className="absolute inset-0 border-2 border-dashed border-white"></span>
//
//       <div
//         className="relative flex h-full transform items-end border-2 border-white bg-inherit transition-transform group-hover:-translate-x-2 group-hover:-translate-y-2"
//       >
//         <div
//           className="p-4 !pt-0 transition-opacity group-hover:absolute group-hover:opacity-0 sm:p-6 lg:p-8"
//         >
//           <h2 className="mt-4 text-xl font-medium sm:text-2xl">{title}</h2>
//         </div>
//
//         <div
//           className="absolute p-4 opacity-0 transition-opacity group-hover:relative group-hover:opacity-100 sm:p-6 lg:p-8"
//         >
//           <h3 className="mt-4 text-xl font-medium sm:text-2xl">{title}</h3>
//
//           <p className="mt-4 text-sm sm:text-base">
//             {children}
//           </p>
//
//         </div>
//       </div>
//     </a>
//   )
// };

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)} {...props} />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...props} />
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  ),
);
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />,
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  ),
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
