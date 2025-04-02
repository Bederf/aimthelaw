import { LucideIcon } from "lucide-react";
import { styled } from '@/lib/styled';
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  loading?: boolean;
  className?: string;
}

const Card = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '$4',
  padding: '$6',
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '$lg',
  transition: 'all 0.3s ease',
  position: 'relative',
  overflow: 'hidden',

  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '$md',
  },
});

const IconWrapper = styled('div', {
  display: 'inline-flex',
  padding: '$4',
  borderRadius: '$lg',
  color: 'hsl(var(--primary))',
  background: 'hsl(var(--primary) / 0.2)',
  transition: 'all 0.3s ease',

  '&:hover': {
    transform: 'scale(1.05)',
    background: 'hsl(var(--primary) / 0.3)',
  }
});

const ContentWrapper = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '$2',
});

const Title = styled('h3', {
  fontSize: '$base',
  fontWeight: '$medium',
  color: 'hsl(var(--muted-foreground))',
  margin: 0,
});

const Value = styled('p', {
  fontSize: '$3xl',
  fontWeight: '$bold',
  color: 'hsl(var(--foreground))',
  margin: 0,
  lineHeight: '$none',
});

const Description = styled('p', {
  fontSize: '$sm',
  color: 'hsl(var(--muted-foreground))',
  margin: 0,
  lineHeight: '$normal',
});

const LoadingPlaceholder = styled('div', {
  height: '1rem',
  width: '60%',
  backgroundColor: 'hsl(var(--muted) / 0.2)',
  borderRadius: '$sm',
  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',

  '@keyframes pulse': {
    '0%, 100%': {
      opacity: 1,
    },
    '50%': {
      opacity: 0.5,
    },
  },
});

const StatsCard = ({ title, value, icon: Icon, description }: StatsCardProps) => {
  return (
    <div className="glass-card hover-card rounded-lg p-6">
      <div className="flex items-center gap-4">
        <div className="rounded-full bg-primary/20 p-3">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <p className="text-2xl font-bold">{value}</p>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;