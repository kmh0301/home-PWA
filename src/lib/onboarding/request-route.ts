import type { OnboardingRoute } from "@/lib/onboarding/state";

type RequestedOnboardingRoute = {
  pathname: OnboardingRoute | null;
  joined: boolean;
};

function getOnboardingRouteFromPathname(pathname: string): OnboardingRoute | null {
  switch (pathname) {
    case "/onboarding/create":
    case "/onboarding/join":
    case "/onboarding/join/success":
    case "/onboarding/accounts":
      return pathname;
    default:
      return null;
  }
}

export function getRequestedOnboardingRouteFromHeaders(
  headerStore: Pick<Headers, "get">,
): RequestedOnboardingRoute {
  const pathname =
    headerStore.get("x-pathname") ??
    (() => {
      const nextUrl = headerStore.get("next-url");

      if (!nextUrl) {
        return null;
      }

      return new URL(nextUrl, "http://localhost").pathname;
    })() ??
    "";
  const search =
    headerStore.get("x-search") ??
    (() => {
      const nextUrl = headerStore.get("next-url");

      if (!nextUrl) {
        return "";
      }

      return new URL(nextUrl, "http://localhost").search;
    })();
  const searchParams = new URLSearchParams(search);

  return {
    pathname: getOnboardingRouteFromPathname(pathname),
    joined: searchParams.get("joined") === "1",
  };
}
