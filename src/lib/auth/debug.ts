type CookieLike = {
  name: string;
};

function getAuthCookieNames(cookies: CookieLike[]) {
  return cookies
    .map((cookie) => cookie.name)
    .filter((name) => name.startsWith("sb-"))
    .sort();
}

export function logAuthDebug(
  event: string,
  details: {
    pathname?: string;
    next?: string;
    hasCode?: boolean;
    hasUser?: boolean;
    requestCookies?: CookieLike[];
    responseCookies?: CookieLike[];
    error?: string | null;
  },
) {
  console.log(
    JSON.stringify({
      scope: "auth-debug",
      event,
      pathname: details.pathname ?? null,
      next: details.next ?? null,
      hasCode: details.hasCode ?? null,
      hasUser: details.hasUser ?? null,
      requestAuthCookies: details.requestCookies ? getAuthCookieNames(details.requestCookies) : [],
      responseAuthCookies: details.responseCookies
        ? getAuthCookieNames(details.responseCookies)
        : [],
      error: details.error ?? null,
    }),
  );
}
