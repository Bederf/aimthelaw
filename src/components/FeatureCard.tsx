import { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  link: string;
  className?: string;
  onFeatureClick?: () => void;
  disabled?: boolean;
  isNew?: boolean;
}

const FeatureCard = ({ 
  title, 
  description, 
  icon: Icon, 
  link, 
  className,
  onFeatureClick,
  disabled = false,
  isNew = false
}: FeatureCardProps) => {
  const handleClick = () => {
    if (!disabled && onFeatureClick) {
      onFeatureClick();
    }
  };

  return (
    <Link 
      to={disabled ? "#" : link}
      className={cn(
        "block no-underline text-foreground outline-none transition-all",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        disabled && "pointer-events-none opacity-60",
        className
      )}
      onClick={handleClick}
      aria-disabled={disabled}
    >
      <Card className={cn(
        "h-full transition-all hover:shadow-md",
        "hover:border-primary/50",
        "dark:hover:border-primary/50",
        disabled && "hover:shadow-none"
      )}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={cn(
                "p-2 rounded-md",
                "bg-primary/10 text-primary",
                "dark:bg-primary/20"
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex items-center">
                <CardTitle className="text-lg font-semibold">
                  {title}
                </CardTitle>
                {isNew && (
                  <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                    New
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm text-muted-foreground">
            {description}
          </CardDescription>
        </CardContent>
      </Card>
    </Link>
  );
};

export default FeatureCard;