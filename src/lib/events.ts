import { useEffect } from "react";

const REFRESH_EVENT = "transaction-refresh";

export function emitRefresh() {
  window.dispatchEvent(new CustomEvent(REFRESH_EVENT));
}

export function useRefreshListener(callback: () => void) {
  useEffect(() => {
    window.addEventListener(REFRESH_EVENT, callback);
    return () => window.removeEventListener(REFRESH_EVENT, callback);
  }, [callback]);
}
