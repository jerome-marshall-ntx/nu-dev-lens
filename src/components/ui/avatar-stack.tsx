"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface AvatarStackItem {
  name: string;
  avatarUrl?: string;
  href?: string;
}

interface AvatarStackProps {
  avatars: AvatarStackItem[];
  max?: number;
  size?: "sm" | "default" | "lg";
  showTooltip?: boolean;
  className?: string;
}

export function AvatarStack({
  avatars,
  max = 5,
  size = "default",
  showTooltip = true,
  className,
}: AvatarStackProps) {
  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;
  const hasMore = remainingCount > 0;

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  const renderAvatar = (avatar: AvatarStackItem, index: number) => {
    const avatarElement = (
      <Avatar key={index} size={size}>
        {avatar.avatarUrl ? (
          <AvatarImage src={avatar.avatarUrl} alt={avatar.name} />
        ) : null}
        <AvatarFallback>{getInitials(avatar.name)}</AvatarFallback>
      </Avatar>
    );

    if (!showTooltip) {
      return avatarElement;
    }

    return (
      <TooltipTrigger key={index} asChild>
        {avatarElement}
      </TooltipTrigger>
    );
  };

  const content = (
    <AvatarGroup className={cn(className)}>
      {visibleAvatars.map((avatar, index) => {
        if (showTooltip) {
          return (
            <Tooltip key={index}>
              {renderAvatar(avatar, index)}
              <TooltipContent>
                <p>@{avatar.name}</p>
              </TooltipContent>
            </Tooltip>
          );
        }
        return renderAvatar(avatar, index);
      })}
      {hasMore && (
        <Tooltip>
          <TooltipTrigger asChild>
            <AvatarGroupCount>+{remainingCount}</AvatarGroupCount>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {remainingCount} more contributor{remainingCount !== 1 ? "s" : ""}
            </p>
          </TooltipContent>
        </Tooltip>
      )}
    </AvatarGroup>
  );

  if (showTooltip) {
    return <TooltipProvider delayDuration={300}>{content}</TooltipProvider>;
  }

  return content;
}
