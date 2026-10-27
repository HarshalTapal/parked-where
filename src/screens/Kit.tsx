import { useState } from 'react'
import { Button } from '../components/Button'
import type { ButtonVariant } from '../components/Button'
import { Card } from '../components/Card'
import { Chip } from '../components/Chip'
import { EmptyState } from '../components/EmptyState'
import { CameraIcon, HistoryIcon, HomeIcon, PinIcon, SettingsIcon } from '../components/Icons'
import {
  GarageLevelsArt,
  MapOfflineArt,
  ParkedCarArt,
  PhotoClueArt,
} from '../components/Illustrations'
import { Input } from '../components/Input'
import { Modal } from '../components/Modal'
import { TabBar } from '../components/TabBar'
import { Toast, ToastRegion } from '../components/Toast'

const SWATCHES: { name: string; value: string; note?: string }[] = [
  { name: 'primary / ink', value: '#000000' },
  { name: 'canvas', value: '#ffffff' },
  { name: 'canvas-soft', value: '#efefef' },
  { name: 'canvas-softer', value: '#f3f3f3' },
  { name: 'surface-pressed', value: '#e2e2e2' },
  { name: 'body', value: '#5e5e5e', note: 'secondary text' },
  { name: 'mute', value: '#afafaf', note: 'decoration only' },
]

const FLOORS = ['B3', 'B2', 'B1', 'G', '1', '2', '3', '4', '5', 'Other']
const VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'subtle', 'floating', 'large']

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 'var(--space-3xl)' }}>
      <h2 className="t-display-md" style={{ marginBottom: 'var(--space-lg)' }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        {children}
      </div>
    </section>
  )
}

/** Dev-only component gallery, served at #/kit. */
export default function Kit() {
  const [floor, setFloor] = useState('B2')
  const [tab, setTab] = useState('home')
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState(false)

  return (
    <main
      style={{
        maxWidth: 'var(--container-max)',
        margin: '0 auto',
        padding: 'var(--space-2xl) var(--space-lg) 120px',
      }}
    >
      <h1 className="t-display-xl">Component kit</h1>
      <p className="t-body-md t-secondary" style={{ marginTop: 'var(--space-sm)' }}>
        Dev-only. Every component the app uses. This page shows several black primary buttons
        for review; real screens show one per viewport.
      </p>

      <Section title="Colour">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-md)' }}>
          {SWATCHES.map((s) => (
            <div key={s.name} data-swatch={s.name}>
              <div
                style={{
                  height: 56,
                  borderRadius: 'var(--radius-md)',
                  background: s.value,
                  boxShadow: 'inset 0 0 0 1px var(--color-surface-pressed)',
                }}
              />
              <p className="t-body-sm-strong" style={{ marginTop: 'var(--space-xs)' }}>
                {s.name}
              </p>
              <p className="t-caption t-secondary">
                {s.value}
                {s.note ? ` · ${s.note}` : ''}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <p className="t-display-xxl">Display XXL</p>
        <p className="t-display-xl">Display XL</p>
        <p className="t-display-lg">Display LG</p>
        <p className="t-display-md">Display MD</p>
        <p className="t-display-sm">Display SM</p>
        <p className="t-body-lg">Body large, 18 / 500</p>
        <p className="t-body-md">Body medium, 16 / 400</p>
        <p className="t-body-md-strong">Body medium strong, 16 / 500</p>
        <p className="t-body-sm t-secondary">Body small, 14 / 400</p>
        <p className="t-body-sm-strong">Body small strong, 14 / 500</p>
        <p className="t-caption t-secondary">Caption, 12 / 400</p>
      </Section>

      <Section title="Buttons">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', alignItems: 'center' }}>
          {VARIANTS.map((v) => (
            <Button key={v} variant={v}>
              {v}
            </Button>
          ))}
          <Button variant="primary" disabled>
            disabled
          </Button>
        </div>
        <Button block>
          <PinIcon /> Save parking
        </Button>
        <Button block variant="secondary">
          <CameraIcon /> Take a photo
        </Button>
      </Section>

      <Section title="Cards">
        <Card variant="content">
          <p className="t-body-md-strong">card-content</p>
          <p className="t-body-sm t-secondary">Flat, hairline edge.</p>
        </Card>
        <Card variant="elevated">
          <p className="t-body-md-strong">card-elevated</p>
          <p className="t-body-sm t-secondary">Level 1 shadow. Reserved for the active spot.</p>
        </Card>
        <Card variant="soft">
          <p className="t-body-md-strong">card-soft-tinted</p>
          <p className="t-body-sm t-secondary">Info panels and history rows.</p>
        </Card>
        <Card variant="dark">
          <p className="t-body-md-strong">promo-card-on-dark</p>
          <p className="t-body-sm">Polarity flip for emphasis.</p>
          <div style={{ marginTop: 'var(--space-lg)' }}>
            <Button variant="on-dark">Action</Button>
          </div>
        </Card>
      </Section>

      <Section title="Inputs">
        <Input label="Location label" placeholder="e.g. Level 2, near the lift" hint="Shown on the saved spot." />
        <Input label="On soft surface" onSoft placeholder="Nested input" />
        <Input
          label="Row"
          defaultValue="???"
          error="Use letters and numbers only, for example A12."
        />
      </Section>

      <Section title="Chips">
        <div className="chip-row" role="group" aria-label="Floor">
          {FLOORS.map((f) => (
            <Chip key={f} selected={floor === f} onClick={() => setFloor(f)}>
              {f}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Toast and modal">
        <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          <Button variant="subtle" onClick={() => setToast(true)}>
            Show toast
          </Button>
          <Button variant="subtle" onClick={() => setModalOpen(true)}>
            Open dialog
          </Button>
        </div>
        <Toast message="Previous spot moved to history." actionLabel="Undo" />
      </Section>

      <Section title="Empty states">
        <EmptyState
          art={<ParkedCarArt title="A car parked next to a location pin" />}
          title="No parking saved"
          text="Tap Save parking when you leave your vehicle."
        />
        <EmptyState
          art={<GarageLevelsArt title="A parking garage with levels" />}
          title="Nothing in history yet"
          text="Past spots will appear here."
        />
        <EmptyState
          art={<PhotoClueArt title="A photo frame" />}
          title="No photo"
          text="A photo of the nearest pillar or sign helps most."
        />
        <EmptyState
          art={<MapOfflineArt title="A map with a crossed-out marker" />}
          title="Map unavailable offline"
          text="Your saved details and coordinates are still here."
        />
      </Section>

      <Modal
        open={modalOpen}
        title="Delete this spot?"
        onClose={() => setModalOpen(false)}
        actions={
          <>
            <Button block onClick={() => setModalOpen(false)}>
              Delete
            </Button>
            <Button block variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
          </>
        }
      >
        You can undo this for a few seconds afterwards.
      </Modal>

      {toast && (
        <ToastRegion>
          <Toast message="Spot saved." actionLabel="Dismiss" onAction={() => setToast(false)} />
        </ToastRegion>
      )}

      <TabBar
        activeId={tab}
        onSelect={setTab}
        items={[
          { id: 'home', label: 'Home', icon: <HomeIcon /> },
          { id: 'history', label: 'History', icon: <HistoryIcon /> },
          { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
        ]}
      />
    </main>
  )
}
