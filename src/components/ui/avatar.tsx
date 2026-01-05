import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  try {
    return (
      <AvatarPrimitive.Root
        data-slot="avatar"
        className={cn(
          "relative flex size-8 shrink-0 overflow-hidden rounded-full",
          className
        )}
        {...props}
      />
    )
  } catch (error) {
    // Fallback si React no está disponible
    console.warn("Avatar: React context not available", error)
    return React.createElement('div', {
      'data-slot': "avatar",
      className: cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className
      ),
      ...props
    })
  }
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  try {
    return (
      <AvatarPrimitive.Image
        data-slot="avatar-image"
        className={cn("aspect-square size-full", className)}
        {...props}
      />
    )
  } catch (error) {
    console.warn("AvatarImage: React context not available", error)
    return React.createElement('img', {
      'data-slot': "avatar-image",
      className: cn("aspect-square size-full", className),
      ...props
    })
  }
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  try {
    return (
      <AvatarPrimitive.Fallback
        data-slot="avatar-fallback"
        className={cn(
          "bg-muted flex size-full items-center justify-center rounded-full",
          className
        )}
        {...props}
      />
    )
  } catch (error) {
    console.warn("AvatarFallback: React context not available", error)
    return React.createElement('span', {
      'data-slot': "avatar-fallback",
      className: cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className
      ),
      ...props
    })
  }
}

export { Avatar, AvatarImage, AvatarFallback }
