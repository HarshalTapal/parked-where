import { describe, expect, it } from 'vitest'
import { PhotoError, downscaleImage, fitWithin } from './photo'
import { FLOOR_OTHER, composeFloor, parseFloor } from './floor'

describe('fitWithin', () => {
  it('leaves small images alone', () => {
    expect(fitWithin(800, 600, 1280)).toEqual({ width: 800, height: 600 })
    expect(fitWithin(1280, 1280, 1280)).toEqual({ width: 1280, height: 1280 })
  })
  it('scales landscape and portrait to 1280 on the longest side, keeping aspect', () => {
    expect(fitWithin(4000, 3000, 1280)).toEqual({ width: 1280, height: 960 })
    expect(fitWithin(3000, 4000, 1280)).toEqual({ width: 960, height: 1280 })
  })
  it('never returns a zero dimension', () => {
    expect(fitWithin(100000, 10, 1280)).toEqual({ width: 1280, height: 1 })
  })
})

describe('downscaleImage input checks', () => {
  it('rejects a non-image file with a plain message', async () => {
    const err = await downscaleImage(new Blob(['hello'], { type: 'text/plain' })).catch((e) => e)
    expect(err).toBeInstanceOf(PhotoError)
    expect(err.userMessage).toMatch(/isn't a picture/)
  })
  it('rejects an oversized file', async () => {
    const big = { type: 'image/jpeg', size: 31 * 1024 * 1024 } as Blob
    const err = await downscaleImage(big).catch((e) => e)
    expect(err.userMessage).toMatch(/too large/)
  })
})

describe('floor chips', () => {
  it('round-trips chips and custom text', () => {
    expect(parseFloor('')).toEqual({ choice: '', other: '' })
    expect(parseFloor('B2')).toEqual({ choice: 'B2', other: '' })
    expect(parseFloor(' G ')).toEqual({ choice: 'G', other: '' })
    expect(parseFloor('Roof')).toEqual({ choice: FLOOR_OTHER, other: 'Roof' })
    expect(composeFloor({ choice: 'B2', other: 'ignored' })).toBe('B2')
    expect(composeFloor({ choice: FLOOR_OTHER, other: '  P2 ' })).toBe('P2')
    expect(composeFloor({ choice: '', other: '' })).toBe('')
  })
})
