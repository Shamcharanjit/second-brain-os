import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageview } from "@/lib/analytics/ga4";

/**
 * Reports a GA4 `page_view` event whenever the SPA route changes.
 * The base gtag.js script is loaded in index.html.
 */
export default function GA4RouteTracker() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname + location.search;
    trackPageview(path);
  }, [location.pathname, location.search]);

  return null;
}
