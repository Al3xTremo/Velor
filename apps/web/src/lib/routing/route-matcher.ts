export const routeMatches = (pathname: string, routes: string[]) => {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
};
