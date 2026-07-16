import { useState, useEffect } from 'react';

export type Path = 'landing' | 'login' | 'dashboard';

export interface Route {
  path: Path;
  params: Record<string, string>;
}

type Listener = (route: Route) => void;

class RouterService {
  private listeners: Set<Listener> = new Set();
  private currentRoute: Route = { path: 'landing', params: {} };

  constructor() {
    if (typeof window !== 'undefined') {
      this.parseUrl();
      window.addEventListener('popstate', () => {
        this.parseUrl();
        this.notify();
      });
    }
  }

  private parseUrl() {
    const hash = window.location.hash.replace('#', '');
    const [pathPart, queryPart] = hash.split('?');
    
    let path: Path = 'landing';
    if (pathPart === 'login' || pathPart === 'dashboard') {
      path = pathPart;
    }
    
    const params: Record<string, string> = {};
    if (queryPart) {
      const searchParams = new URLSearchParams(queryPart);
      searchParams.forEach((value, key) => {
        params[key] = value;
      });
    }

    this.currentRoute = { path, params };
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.currentRoute));
  }

  public getRoute(): Route {
    return this.currentRoute;
  }

  public navigate(path: Path, params: Record<string, string> = {}) {
    this.currentRoute = { path, params };
    
    if (typeof window !== 'undefined') {
      const queryStr = new URLSearchParams(params).toString();
      const hash = `${path}${queryStr ? '?' + queryStr : ''}`;
      window.history.pushState(null, '', `#${hash}`);
    }
    
    this.notify();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const navigation = new RouterService();

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(navigation.getRoute());

  useEffect(() => {
    return navigation.subscribe((newRoute) => {
      setRoute(newRoute);
    });
  }, []);

  return route;
}
