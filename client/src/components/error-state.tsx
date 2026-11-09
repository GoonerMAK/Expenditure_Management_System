import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

const ErrorState = ({ message, onRetry, className }: ErrorStateProps) => (
  <div role="alert" className={cn('flex items-center gap-3 text-sm text-destructive', className)}>
    <p>{message}</p>
    {onRetry && <Button variant="outline" size="sm" onClick={onRetry}>Try again</Button>}
  </div>
);

export default ErrorState;
