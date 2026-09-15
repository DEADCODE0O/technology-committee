import * as React from "react"

const MOBILE_BREAKPOINT = 768

// ── نمط React الرسمي (useSyncExternalStore) لقراءة matchMedia ──
// بدل setState المتزامن داخل useEffect — بدون أخطاء وميض أو تعارض ترطيب
function subscribeMobile(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribeMobile,
    () => window.innerWidth < MOBILE_BREAKPOINT,
    () => false
  )
}
