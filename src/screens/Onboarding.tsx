import { Button } from '../components/Button'
import { ParkedCarArt } from '../components/Illustrations'

export default function Onboarding({ onDone }: { onDone: () => void }) {
  return (
    <main className="screen">
      <div className="screen__spacer" />
      <div className="empty__art" style={{ alignSelf: 'center' }}>
        <ParkedCarArt title="A car parked beside a location pin" />
      </div>
      <div className="stack">
        <h1 className="t-display-xl">Remember exactly where you parked.</h1>
        <p className="t-body-lg t-secondary">
          Save your spot in one tap. Add a photo and a note about the floor and row, so you can
          find it again.
        </p>
        <p className="t-body-sm t-secondary">Everything stays on this device. No account needed.</p>
      </div>
      <div className="screen__spacer" />
      <Button block onClick={onDone}>
        Get started
      </Button>
    </main>
  )
}
