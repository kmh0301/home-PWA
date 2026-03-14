"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import {
  ArrowRight,
  Eye,
  EyeOff,
  Mail,
  Sparkles,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface PupilProps {
  size?: number
  maxDistance?: number
  pupilColor?: string
  forceLookX?: number
  forceLookY?: number
}

const Pupil = ({
  size = 12,
  maxDistance = 5,
  pupilColor = "black",
  forceLookX,
  forceLookY,
}: PupilProps) => {
  const [pupilPosition, setPupilPosition] = useState({ x: 0, y: 0 })
  const pupilRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!pupilRef.current) return

      const pupil = pupilRef.current.getBoundingClientRect()
      const pupilCenterX = pupil.left + pupil.width / 2
      const pupilCenterY = pupil.top + pupil.height / 2
      const deltaX = e.clientX - pupilCenterX
      const deltaY = e.clientY - pupilCenterY
      const distance = Math.min(
        Math.sqrt(deltaX ** 2 + deltaY ** 2),
        maxDistance
      )
      const angle = Math.atan2(deltaY, deltaX)

      setPupilPosition({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
      })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [maxDistance])

  const renderedPupilPosition =
    forceLookX !== undefined && forceLookY !== undefined
      ? { x: forceLookX, y: forceLookY }
      : pupilPosition

  return (
    <div
      ref={pupilRef}
      className="rounded-full"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: pupilColor,
        transform: `translate(${renderedPupilPosition.x}px, ${renderedPupilPosition.y}px)`,
        transition: "transform 0.1s ease-out",
      }}
    />
  )
}

interface EyeBallProps {
  size?: number
  pupilSize?: number
  maxDistance?: number
  eyeColor?: string
  pupilColor?: string
  isBlinking?: boolean
  forceLookX?: number
  forceLookY?: number
}

const EyeBall = ({
  size = 48,
  pupilSize = 16,
  maxDistance = 10,
  eyeColor = "white",
  pupilColor = "black",
  isBlinking = false,
  forceLookX,
  forceLookY,
}: EyeBallProps) => {
  const [pupilPosition, setPupilPosition] = useState({ x: 0, y: 0 })
  const eyeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!eyeRef.current) return

      const eye = eyeRef.current.getBoundingClientRect()
      const eyeCenterX = eye.left + eye.width / 2
      const eyeCenterY = eye.top + eye.height / 2
      const deltaX = e.clientX - eyeCenterX
      const deltaY = e.clientY - eyeCenterY
      const distance = Math.min(
        Math.sqrt(deltaX ** 2 + deltaY ** 2),
        maxDistance
      )
      const angle = Math.atan2(deltaY, deltaX)

      setPupilPosition({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
      })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [maxDistance])

  const renderedPupilPosition =
    forceLookX !== undefined && forceLookY !== undefined
      ? { x: forceLookX, y: forceLookY }
      : pupilPosition

  return (
    <div
      ref={eyeRef}
      className="flex items-center justify-center rounded-full transition-all duration-150"
      style={{
        width: `${size}px`,
        height: isBlinking ? "2px" : `${size}px`,
        backgroundColor: eyeColor,
        overflow: "hidden",
      }}
    >
      {!isBlinking && (
        <div
          className="rounded-full"
          style={{
            width: `${pupilSize}px`,
            height: `${pupilSize}px`,
            backgroundColor: pupilColor,
            transform: `translate(${renderedPupilPosition.x}px, ${renderedPupilPosition.y}px)`,
            transition: "transform 0.1s ease-out",
          }}
        />
      )}
    </div>
  )
}

type AnimatedCharactersLoginPageProps = {
  mode?: "login" | "register"
  next?: string
  error?: string | null
  message?: string | null
  submitAction: (formData: FormData) => void | Promise<void>
  googleAction: (formData: FormData) => void | Promise<void>
  resetPasswordAction: (formData: FormData) => void | Promise<void>
}

function resolveThemeColor(variable: string) {
  return `var(${variable})`
}

function AnimatedCharactersLoginPage({
  mode = "login",
  next = "/",
  error,
  message,
  submitAction,
  googleAction,
  resetPasswordAction,
}: AnimatedCharactersLoginPageProps) {
  const isRegister = mode === "register"
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false)
  const [isBlackBlinking, setIsBlackBlinking] = useState(false)
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false)
  const [isPurplePeeking, setIsPurplePeeking] = useState(false)
  const [purplePos, setPurplePos] = useState({ faceX: 0, faceY: 0, bodySkew: 0 })
  const [blackPos, setBlackPos] = useState({ faceX: 0, faceY: 0, bodySkew: 0 })
  const [yellowPos, setYellowPos] = useState({ faceX: 0, faceY: 0, bodySkew: 0 })
  const [orangePos, setOrangePos] = useState({ faceX: 0, faceY: 0, bodySkew: 0 })
  const purpleRef = useRef<HTMLDivElement>(null)
  const blackRef = useRef<HTMLDivElement>(null)
  const yellowRef = useRef<HTMLDivElement>(null)
  const orangeRef = useRef<HTMLDivElement>(null)
  const statusTone = error ? "error" : message ? "success" : null

  useEffect(() => {
    const calculatePosition = (
      ref: React.RefObject<HTMLDivElement | null>,
      pointerX: number,
      pointerY: number
    ) => {
      if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 }

      const rect = ref.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 3
      const deltaX = pointerX - centerX
      const deltaY = pointerY - centerY

      return {
        faceX: Math.max(-15, Math.min(15, deltaX / 20)),
        faceY: Math.max(-10, Math.min(10, deltaY / 30)),
        bodySkew: Math.max(-6, Math.min(6, -deltaX / 120)),
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      setPurplePos(calculatePosition(purpleRef, e.clientX, e.clientY))
      setBlackPos(calculatePosition(blackRef, e.clientX, e.clientY))
      setYellowPos(calculatePosition(yellowRef, e.clientX, e.clientY))
      setOrangePos(calculatePosition(orangeRef, e.clientX, e.clientY))
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  useEffect(() => {
    const getRandomBlinkInterval = () => Math.random() * 4000 + 3000

    const scheduleBlink = () => {
      const blinkTimeout = setTimeout(() => {
        setIsPurpleBlinking(true)
        setTimeout(() => {
          setIsPurpleBlinking(false)
          scheduleBlink()
        }, 150)
      }, getRandomBlinkInterval())

      return blinkTimeout
    }

    const timeout = scheduleBlink()
    return () => clearTimeout(timeout)
  }, [])

  useEffect(() => {
    const getRandomBlinkInterval = () => Math.random() * 4000 + 3000

    const scheduleBlink = () => {
      const blinkTimeout = setTimeout(() => {
        setIsBlackBlinking(true)
        setTimeout(() => {
          setIsBlackBlinking(false)
          scheduleBlink()
        }, 150)
      }, getRandomBlinkInterval())

      return blinkTimeout
    }

    const timeout = scheduleBlink()
    return () => clearTimeout(timeout)
  }, [])

  useEffect(() => {
    if (!(password.length > 0 && showPassword)) return

    const peekInterval = setTimeout(() => {
      setIsPurplePeeking(true)
      setTimeout(() => {
        setIsPurplePeeking(false)
      }, 800)
    }, Math.random() * 3000 + 2000)

    return () => clearTimeout(peekInterval)
  }, [password, showPassword, isPurplePeeking])

  const triggerTypingAnimation = () => {
    setIsTyping(true)
    setIsLookingAtEachOther(true)
    window.setTimeout(() => {
      setIsLookingAtEachOther(false)
    }, 800)
  }

  return (
    <div className="min-h-screen grid bg-background lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:bg-gradient-to-br lg:from-primary lg:via-primary lg:to-secondary lg:p-12 lg:text-primary-foreground">
        <div className="relative z-20">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary-foreground/10 backdrop-blur-sm">
              <Sparkles className="size-4" />
            </div>
            <span>Home PWA</span>
          </div>
        </div>

        <div className="relative z-20 flex h-[500px] items-end justify-center">
          <div className="relative h-[400px] w-[550px]">
            <div
              ref={purpleRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: "70px",
                width: "180px",
                height:
                  isTyping || (password.length > 0 && !showPassword)
                    ? "440px"
                    : "400px",
                backgroundColor: resolveThemeColor("--primary"),
                borderRadius: "10px 10px 0 0",
                zIndex: 1,
                transform:
                  password.length > 0 && showPassword
                    ? "skewX(0deg)"
                    : isTyping || (password.length > 0 && !showPassword)
                      ? `skewX(${(purplePos.bodySkew || 0) - 12}deg) translateX(40px)`
                      : `skewX(${purplePos.bodySkew || 0}deg)`,
                transformOrigin: "bottom center",
              }}
            >
              <div
                className="absolute flex gap-8 transition-all duration-700 ease-in-out"
                style={{
                  left:
                    password.length > 0 && showPassword
                      ? "20px"
                      : isLookingAtEachOther
                        ? "55px"
                        : `${45 + purplePos.faceX}px`,
                  top:
                    password.length > 0 && showPassword
                      ? "35px"
                      : isLookingAtEachOther
                        ? "65px"
                        : `${40 + purplePos.faceY}px`,
                }}
              >
                <EyeBall
                  size={18}
                  pupilSize={7}
                  maxDistance={5}
                  eyeColor={resolveThemeColor("--primary-foreground")}
                  pupilColor={resolveThemeColor("--foreground")}
                  isBlinking={isPurpleBlinking}
                  forceLookX={
                    password.length > 0 && showPassword
                      ? isPurplePeeking
                        ? 4
                        : -4
                      : isLookingAtEachOther
                        ? 3
                        : undefined
                  }
                  forceLookY={
                    password.length > 0 && showPassword
                      ? isPurplePeeking
                        ? 5
                        : -4
                      : isLookingAtEachOther
                        ? 4
                        : undefined
                  }
                />
                <EyeBall
                  size={18}
                  pupilSize={7}
                  maxDistance={5}
                  eyeColor={resolveThemeColor("--primary-foreground")}
                  pupilColor={resolveThemeColor("--foreground")}
                  isBlinking={isPurpleBlinking}
                  forceLookX={
                    password.length > 0 && showPassword
                      ? isPurplePeeking
                        ? 4
                        : -4
                      : isLookingAtEachOther
                        ? 3
                        : undefined
                  }
                  forceLookY={
                    password.length > 0 && showPassword
                      ? isPurplePeeking
                        ? 5
                        : -4
                      : isLookingAtEachOther
                        ? 4
                        : undefined
                  }
                />
              </div>
            </div>

            <div
              ref={blackRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: "240px",
                width: "120px",
                height: "310px",
                backgroundColor: resolveThemeColor("--foreground"),
                borderRadius: "8px 8px 0 0",
                zIndex: 2,
                transform:
                  password.length > 0 && showPassword
                    ? "skewX(0deg)"
                    : isLookingAtEachOther
                      ? `skewX(${(blackPos.bodySkew || 0) * 1.5 + 10}deg) translateX(20px)`
                      : isTyping || (password.length > 0 && !showPassword)
                        ? `skewX(${(blackPos.bodySkew || 0) * 1.5}deg)`
                        : `skewX(${blackPos.bodySkew || 0}deg)`,
                transformOrigin: "bottom center",
              }}
            >
              <div
                className="absolute flex gap-6 transition-all duration-700 ease-in-out"
                style={{
                  left:
                    password.length > 0 && showPassword
                      ? "10px"
                      : isLookingAtEachOther
                        ? "32px"
                        : `${26 + blackPos.faceX}px`,
                  top:
                    password.length > 0 && showPassword
                      ? "28px"
                      : isLookingAtEachOther
                        ? "12px"
                        : `${32 + blackPos.faceY}px`,
                }}
              >
                <EyeBall
                  size={16}
                  pupilSize={6}
                  maxDistance={4}
                  eyeColor={resolveThemeColor("--background")}
                  pupilColor={resolveThemeColor("--foreground")}
                  isBlinking={isBlackBlinking}
                  forceLookX={
                    password.length > 0 && showPassword
                      ? -4
                      : isLookingAtEachOther
                        ? 0
                        : undefined
                  }
                  forceLookY={
                    password.length > 0 && showPassword
                      ? -4
                      : isLookingAtEachOther
                        ? -4
                        : undefined
                  }
                />
                <EyeBall
                  size={16}
                  pupilSize={6}
                  maxDistance={4}
                  eyeColor={resolveThemeColor("--background")}
                  pupilColor={resolveThemeColor("--foreground")}
                  isBlinking={isBlackBlinking}
                  forceLookX={
                    password.length > 0 && showPassword
                      ? -4
                      : isLookingAtEachOther
                        ? 0
                        : undefined
                  }
                  forceLookY={
                    password.length > 0 && showPassword
                      ? -4
                      : isLookingAtEachOther
                        ? -4
                        : undefined
                  }
                />
              </div>
            </div>

            <div
              ref={orangeRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: "0px",
                width: "240px",
                height: "200px",
                zIndex: 3,
                backgroundColor: resolveThemeColor("--chart-2"),
                borderRadius: "120px 120px 0 0",
                transform:
                  password.length > 0 && showPassword
                    ? "skewX(0deg)"
                    : `skewX(${orangePos.bodySkew || 0}deg)`,
                transformOrigin: "bottom center",
              }}
            >
              <div
                className="absolute flex gap-8 transition-all duration-200 ease-out"
                style={{
                  left:
                    password.length > 0 && showPassword
                      ? "50px"
                      : `${82 + (orangePos.faceX || 0)}px`,
                  top:
                    password.length > 0 && showPassword
                      ? "85px"
                      : `${90 + (orangePos.faceY || 0)}px`,
                }}
              >
                <Pupil
                  size={12}
                  maxDistance={5}
                  pupilColor={resolveThemeColor("--foreground")}
                  forceLookX={password.length > 0 && showPassword ? -5 : undefined}
                  forceLookY={password.length > 0 && showPassword ? -4 : undefined}
                />
                <Pupil
                  size={12}
                  maxDistance={5}
                  pupilColor={resolveThemeColor("--foreground")}
                  forceLookX={password.length > 0 && showPassword ? -5 : undefined}
                  forceLookY={password.length > 0 && showPassword ? -4 : undefined}
                />
              </div>
            </div>

            <div
              ref={yellowRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: "310px",
                width: "140px",
                height: "230px",
                backgroundColor: resolveThemeColor("--chart-3"),
                borderRadius: "70px 70px 0 0",
                zIndex: 4,
                transform:
                  password.length > 0 && showPassword
                    ? "skewX(0deg)"
                    : `skewX(${yellowPos.bodySkew || 0}deg)`,
                transformOrigin: "bottom center",
              }}
            >
              <div
                className="absolute flex gap-6 transition-all duration-200 ease-out"
                style={{
                  left:
                    password.length > 0 && showPassword
                      ? "20px"
                      : `${52 + (yellowPos.faceX || 0)}px`,
                  top:
                    password.length > 0 && showPassword
                      ? "35px"
                      : `${40 + (yellowPos.faceY || 0)}px`,
                }}
              >
                <Pupil
                  size={12}
                  maxDistance={5}
                  pupilColor={resolveThemeColor("--foreground")}
                  forceLookX={password.length > 0 && showPassword ? -5 : undefined}
                  forceLookY={password.length > 0 && showPassword ? -4 : undefined}
                />
                <Pupil
                  size={12}
                  maxDistance={5}
                  pupilColor={resolveThemeColor("--foreground")}
                  forceLookX={password.length > 0 && showPassword ? -5 : undefined}
                  forceLookY={password.length > 0 && showPassword ? -4 : undefined}
                />
              </div>
              <div
                className="absolute h-[4px] w-20 rounded-full transition-all duration-200 ease-out"
                style={{
                  left:
                    password.length > 0 && showPassword
                      ? "10px"
                      : `${40 + (yellowPos.faceX || 0)}px`,
                  top:
                    password.length > 0 && showPassword
                      ? "88px"
                      : `${88 + (yellowPos.faceY || 0)}px`,
                  backgroundColor: resolveThemeColor("--foreground"),
                }}
              />
            </div>
          </div>
        </div>

        <div className="relative z-20 flex items-center gap-8 text-sm text-primary-foreground/70">
          <Link href="#" className="transition-colors hover:text-primary-foreground">
            Privacy Policy
          </Link>
          <Link href="#" className="transition-colors hover:text-primary-foreground">
            Terms of Service
          </Link>
          <Link href="#" className="transition-colors hover:text-primary-foreground">
            Contact
          </Link>
        </div>

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(0_0%_100%_/_0.16),transparent_28%),radial-gradient(circle_at_bottom_left,hsl(0_0%_100%_/_0.08),transparent_35%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(hsl(0_0%_100%_/_0.05)_1px,transparent_1px),linear-gradient(90deg,hsl(0_0%_100%_/_0.05)_1px,transparent_1px)] bg-[size:20px_20px]" />
      </div>

      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-[420px]">
          <div className="mb-12 flex items-center justify-center gap-2 text-lg font-semibold lg:hidden">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="size-4 text-primary" />
            </div>
            <span>Home PWA</span>
          </div>

          <div className="mb-10 text-center">
            <h1 className="mb-2 text-3xl font-bold tracking-tight">
              {isRegister ? "Create your account" : "Welcome back!"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isRegister
                ? "Set up your account to start collaborating"
                : "Please enter your details"}
            </p>
          </div>

          {statusTone ? (
            <Alert
              className={cn(
                "mb-6",
                statusTone === "error" ? "border-destructive/50" : "border-secondary/40"
              )}
            >
              <AlertTitle>
                {statusTone === "error" ? "Unable to continue" : "Check your inbox"}
              </AlertTitle>
              <AlertDescription>{error ?? message}</AlertDescription>
            </Alert>
          ) : null}

          <form action={submitAction} className="flex flex-col gap-5">
            <input name="next" type="hidden" value={next} />
            <input
              name="mode"
              type="hidden"
              value={isRegister ? "register" : "login"}
            />

            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="anna@gmail.com"
                autoComplete="email"
                onFocus={triggerTypingAnimation}
                onBlur={() => {
                  setIsTyping(false)
                  setIsLookingAtEachOther(false)
                }}
                required
                className="h-12 border-border/60 bg-background focus-visible:ring-primary"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={triggerTypingAnimation}
                  onBlur={() => {
                    setIsTyping(false)
                    setIsLookingAtEachOther(false)
                  }}
                  required
                  className="h-12 border-border/60 bg-background pr-10 focus-visible:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="size-5" />
                  ) : (
                    <Eye className="size-5" />
                  )}
                </button>
              </div>
            </div>

            {isRegister ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="passwordConfirm" className="text-sm font-medium">
                  Confirm password
                </Label>
                <Input
                  id="passwordConfirm"
                  name="passwordConfirm"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  onFocus={triggerTypingAnimation}
                  onBlur={() => {
                    setIsTyping(false)
                    setIsLookingAtEachOther(false)
                  }}
                  required
                  className="h-12 border-border/60 bg-background focus-visible:ring-primary"
                />
              </div>
            ) : null}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="remember" />
                <Label
                  htmlFor="remember"
                  className="cursor-pointer text-sm font-normal"
                >
                  Remember for 30 days
                </Label>
              </div>
              {!isRegister ? (
                <button
                  type="submit"
                  formAction={resetPasswordAction}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Forgot password?
                </button>
              ) : null}
            </div>

            <Button type="submit" className="h-12 w-full text-base font-medium" size="lg">
              {isRegister ? "Create account" : "Log in"}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </form>

          <div className="mt-6">
            <form action={googleAction}>
              <input name="provider" type="hidden" value="google" />
              <input name="next" type="hidden" value={next} />
              <Button
                variant="outline"
                className="h-12 w-full border-border/60 bg-background hover:bg-accent"
                type="submit"
              >
                <Mail className="mr-2 size-5" />
                Continue with Google
              </Button>
            </form>
          </div>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
            <Link
              href={
                isRegister
                  ? `/login?next=${encodeURIComponent(next)}`
                  : `/login?mode=register&next=${encodeURIComponent(next)}`
              }
              className="font-medium text-foreground hover:underline"
            >
              {isRegister ? "Log in" : "Sign Up"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export { AnimatedCharactersLoginPage }
export const Component = AnimatedCharactersLoginPage
