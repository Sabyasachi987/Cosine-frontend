"use client"

import { Button } from "@/components/ui/button"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/contexts/ThemeContext"

interface ThemeToggleProps {
  size?: "sm" | "default" | "lg"
  variant?: "default" | "outline" | "ghost" | "secondary"
  className?: string
}

export function ThemeToggle({ size = "sm", variant = "outline", className = "" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleTheme}
      className={`${className} hover:bg-opacity-80 transition-colors`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      {theme === 'light' ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
