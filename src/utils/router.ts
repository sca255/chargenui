import type { Request, Response } from "bun";

export interface RouteParams {
  [key: string]: string;
}

export type RequestHandler = {
  method: string;
  path: string;
  handler: (req: Request, params: RouteParams) => Promise<Response>;
};

export function matchRoute(pathname: string, routePath: string): RouteParams | null {
  const routeParts = routePath.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);

  if (routePath.endsWith("/*")) {
    // Wildcard route - match prefix
    const prefix = routePath.slice(0, -2);
    if (pathname.startsWith(prefix)) {
      return {};
    }
    return null;
  }

  if (routeParts.length !== pathParts.length) {
    return null;
  }

  const params: RouteParams = {};
  for (let i = 0; i < routeParts.length; i++) {
    const routePart = routeParts[i];
    const pathPart = pathParts[i];
    if (routePart.startsWith(":")) {
      params[routePart.slice(1)] = decodeURIComponent(pathPart);
    } else if (routePart !== pathPart) {
      return null;
    }
  }
  return params;
}

export function findRoute(routes: RequestHandler[], method: string, pathname: string): { handler: RequestHandler["handler"]; params: RouteParams } | null {
  for (const route of routes) {
    if (route.method !== method) continue;
    const params = matchRoute(pathname, route.path);
    if (params) {
      return { handler: route.handler, params };
    }
  }
  return null;
}