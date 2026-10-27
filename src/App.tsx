import { Suspense, lazy, useEffect, useState } from 'react'

// The kit page is dev-only: the dynamic import is dropped from production builds.
const Kit = import.meta.env.DEV ? lazy(() => import('./screens/Kit')) : null
const DataLab = import.meta.env.DEV ? lazy(() => import('./screens/DataLab')) : null

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

export default function App() {
  const route = useHashRoute()

  if (Kit && route === '#/kit') {
    return (
      <Suspense fallback={null}>
        <Kit />
      </Suspense>
    )
  }

  if (DataLab && route === '#/data') {
    return (
      <Suspense fallback={null}>
        <DataLab />
      </Suspense>
    )
  }

  return (
    <main style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: 'var(--space-2xl) var(--space-lg)' }}>
      <h1 className="t-display-xl">Parked Where?</h1>
      <p className="t-body-md t-secondary">App screens arrive in later phases.</p>
    </main>
  )
}
