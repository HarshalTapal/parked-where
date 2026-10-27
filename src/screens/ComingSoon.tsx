import { Card } from '../components/Card'

/** Honest placeholder for tabs that are not built yet, so no button is inert. */
export default function ComingSoon({ title }: { title: string }) {
  return (
    <main className="screen screen--with-tabs">
      <h1 className="t-display-lg">{title}</h1>
      <Card variant="soft">
        <p className="t-body-md-strong">Not built yet</p>
        <p className="t-body-md t-secondary">This screen arrives in a later phase of the build.</p>
      </Card>
    </main>
  )
}
