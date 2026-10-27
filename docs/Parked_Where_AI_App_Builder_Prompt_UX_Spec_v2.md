# Parked Where? --- Product Requirements & AI App Builder Prompt

**Document type:** Product brief, UX specification, and build prompt\
**Product:** Parked Where?\
**Version:** 1.0\
**Platform direction:** Mobile-first responsive web app / installable
PWA prototype\
**Primary market to validate:** Urban vehicle owners, with an initial
focus on people who park in unfamiliar streets, shopping centres,
offices, hospitals, airports, and multi-level parking garages.

------------------------------------------------------------------------

# Part A --- Copy-and-paste AI app builder prompt

Use the prompt below in your AI app-building platform. If the platform
supports attaching a Markdown specification, attach this file as context
as well.

## MASTER BUILD PROMPT

You are a senior product designer and full-stack engineer. Build a
polished, functional, mobile-first application called **Parked Where?**
that helps people save where they parked and find their vehicle again
later.

Do not build only a static landing page or a set of disconnected mockup
screens. Build a usable application with working navigation, functional
forms, persistent parking records, meaningful empty states, validation,
and error handling. If a feature requires an external service or API key
that is unavailable, implement a clearly labelled demo/fallback state
rather than pretending the feature works.

### 1. Product vision

Parked Where? helps people remember their vehicle's parking location and
return to it with less confusion and wasted time.

**Core promise:** "Save your spot. Find your vehicle. Get on with your
day."

The app should store two kinds of parking memory: 1. **Geographic
location:** map pin, coordinates, nearby address or place label, and
directions where available. 2. **Physical parking details:** photo,
floor/level, zone, row, bay/pillar number, and notes.

A map pin alone is not always enough, especially in covered or
multi-level parking. Make physical details easy to add and easy to see
when returning to the vehicle.

### 2. Target users and key jobs

Primary users to validate: - Urban commuters who park scooters or
motorcycles in unfamiliar or busy places. - Drivers who park in large
shopping centres, offices, hospitals, airports, or multi-level
garages. - People who return to their vehicle hours or days after
parking.

Core jobs: - When I leave my vehicle, help me save its location
quickly. - When I return, help me understand where it is without
searching randomly. - When GPS is inaccurate or unavailable indoors, let
me rely on saved photos and physical clues. - Let me edit or remove a
saved spot and access recent records when needed.

### 3. MVP scope

Build these core capabilities first:

1.  Save current parking location.
2.  Request location permission only when the user starts saving or
    needs location-based directions; explain why it is needed.
3.  Show the location and allow manual pin correction when map/location
    support is available.
4.  Add an optional photo.
5.  Add optional floor/level, zone, row, bay/pillar number, and notes.
6.  Save and show an active parking record.
7.  Open walking directions through a supported map service or a safe
    external map link when possible.
8.  Show recent parking history.
9.  Edit, replace, or delete a record with clear confirmation and undo
    where feasible.
10. Support a manual fallback if location access or internet is
    unavailable.
11. Keep saved parking details accessible offline when technically
    feasible.
12. Provide settings for permissions guidance, privacy information, and
    clearing saved records.

Do not include in the MVP: live parking-space availability, social
networking, vehicle diagnostics, live vehicle tracking, a parking
marketplace, or automatic vehicle detection that is not genuinely
implemented.

### 4. Information architecture

Keep navigation simple. Suggested primary destinations: - **Home /
Active spot** - **Save parking** - **History** - **Settings**

When there is no active spot, make "Save parking" the primary home
action. When a spot is active, show its details immediately with a
prominent "Find my vehicle" / "Get directions" action.

### 5. Required screens and states

Build these screens or equivalent views:

**A. Onboarding** - One concise screen explaining the benefit: "Remember
exactly where you parked." - Do not force a long onboarding flow. -
Explain location permission in context, immediately before requesting
it.

**B. Home --- no active parking** - Clear empty state. - Primary "Save
parking" button. - Brief explanation of what will be saved. - Show a
useful fallback if location is unavailable.

**C. Confirm location** - Show current map/location when available. -
Display accuracy or an "approximate location" message if the platform
provides that information. - Allow the user to adjust the pin if map
integration supports it. - If location cannot be determined, let the
user continue by adding a place/landmark and parking details manually.

**D. Add parking details** - Optional photo capture or image upload. -
Optional fields: floor/level, zone, row, bay/pillar number, notes. -
Save the core location first or make all details skippable; never force
a long form before saving. - Validate fields sensibly and preserve
entered data if an error occurs.

**E. Active parking card / saved spot details** - Location label or map
preview. - Photo, if supplied. - Floor, zone, row, bay/pillar, and notes
when supplied. - Saved date/time. - Main action: "Find my vehicle" /
"Get directions". - Secondary actions: edit, share if implemented, end
parking session, delete.

**F. Find my vehicle** - Show map-based walking directions if a map
service is configured. - Keep physical parking details and photo easy to
access. - Clearly distinguish directions to the general geographic
location from exact indoor bay guidance. - Never claim GPS can determine
an indoor floor or exact parking bay unless that capability is genuinely
implemented. - If external directions cannot open, show the saved
address/coordinates and parking clues with a copy option.

**G. Parking history** - List previous saved records by date/time and
location. - Clearly distinguish an active spot from old records. - Allow
a historical record to be viewed or reused, but do not silently make an
old record appear to be the current vehicle location.

**H. Settings / privacy** - Explain how location is used. - Explain
whether records/photos are stored locally or on a server, based on the
actual implementation. - Provide a way to delete parking records and
photos. - Provide notification settings only if notifications are
implemented. - Do not request background location unless a real feature
requires it and the user explicitly enables it.

### 6. Primary user flows

**Flow 1 --- Save a parking spot** 1. Open app. 2. Tap "Save parking".
3. Explain and request foreground location access if needed. 4.
Determine current location, or offer a manual fallback. 5. Let the user
confirm or adjust the location if supported. 6. Offer optional photo and
physical details. 7. Save the record. 8. Show a clear success state and
the active parking card.

**Flow 2 --- Find the vehicle** 1. Open app. 2. See the active saved
spot immediately. 3. Review photo, floor, zone, bay/pillar, and notes.
4. Tap "Get directions". 5. Open supported map-based directions or show
a graceful fallback. 6. When the vehicle is found, let the user end the
active session. 7. Keep the record in history if that behaviour is
selected/implemented.

**Flow 3 --- Correct an inaccurate location** 1. Open the active spot.
2. Tap edit. 3. Adjust pin or manually update the location/landmark. 4.
Save changes. 5. Show updated details and confirmation.

**Flow 4 --- Location permission denied / GPS unavailable** 1. Explain
the impact in plain language. 2. Do not trap the user on a permission
screen. 3. Let the user enter a location label or landmark and add
physical details manually. 4. Clearly label any missing geographic
location. 5. Provide a settings link/instruction if the user wants to
enable location later.

### 7. UX principles

-   **Fast capture:** save the core location before asking for optional
    details.
-   **Recognition over recall:** use photos, floor, zone, and landmarks
    to help users recognise the place.
-   **One clear primary action:** keep the most important action
    visually prominent.
-   **Honest location confidence:** distinguish an accurate location
    from an approximate one.
-   **Graceful failure:** support location denial, weak GPS, missing
    internet, and missing photos.
-   **Privacy by design:** ask only for permissions required by the
    feature being used.
-   **Accessible interactions:** readable type, strong contrast,
    labelled controls, clear focus states, touch-friendly buttons, and
    useful error messages.
-   **No fake capabilities:** do not display fabricated live location,
    live tracking, indoor navigation, automatic parking detection, or
    real-time data.

### 8. Data model

Use an appropriate persistent data store for the chosen platform. For a
local prototype, local storage or IndexedDB may be used; if the platform
provides a backend, use it only when configured and explain the storage
behaviour accurately.

Suggested `ParkingRecord` fields: - `id` - `createdAt` - `updatedAt` -
`status` (`active` or `history`) - `latitude` (nullable) - `longitude`
(nullable) - `locationLabel` (optional) - `locationAccuracyMeters`
(nullable, only if actually available) - `photoReference` or local photo
data (optional) - `floorLevel` (optional) - `zone` (optional) - `row`
(optional) - `bayOrPillar` (optional) - `notes` (optional) -
`vehicleLabel` (optional, e.g. "My scooter" or "Family car")

Do not require vehicle registration numbers. Avoid storing unnecessary
personal information.

### 9. Design reference file

I will attach a separate design reference file for this system. **Use
that attached design file as the exact visual reference** for the
application's UI.

Follow the attached reference for visual styling and design decisions,
including layout, components, spacing, color, typography, icon style,
borders, radii, shadows, and interaction patterns wherever specified. Do
not invent a separate visual design system, introduce new styling
choices, or override the reference with your own defaults. If the
reference does not specify a detail, extend it consistently with the
closest existing pattern in the reference.

Treat this product specification as the source of truth for
functionality, requirements, flows, data, and behaviour; treat the
attached design file as the source of truth for visual design. If any
visual detail is unclear, prefer consistency with the reference and keep
the implementation accessible and responsive.

### 10. Technical and integration requirements

-   Use the platform's supported framework and conventions.
-   Make the app mobile-first and responsive on larger screens.
-   Use the browser/device geolocation API where available and only
    after a user action and appropriate permission.
-   If a map provider is used, keep API keys in the platform's secure
    environment/configuration; never hard-code private keys into client
    source.
-   If no map provider/API key is configured, show a useful map
    placeholder or location summary and provide a safe external
    directions fallback where possible.
-   Use native camera/file selection where supported for parking photos.
-   Handle permission denial, timeouts, unavailable location, offline
    state, and storage errors.
-   Ensure the main save and retrieval flows work even if optional
    integrations are missing.
-   Include basic validation and useful loading, success, and error
    states.
-   Do not claim that an external link, map, notification, or
    persistence feature works unless it has been implemented and tested.

### 11. Acceptance criteria

The build is successful when:

1.  A user can save a parking record without completing optional fields.
2.  The active spot appears when the app is reopened.
3.  A user can add and view a parking photo when supported.
4.  A user can add and view floor, zone, row, bay/pillar, and notes.
5.  A user can edit and delete a saved record.
6.  A user can open directions when location and map support are
    available.
7.  A user can still access saved physical details when GPS or internet
    is unavailable, subject to the platform's offline/storage limits.
8.  Permission denial produces a useful manual fallback.
9.  The app clearly distinguishes active parking from history.
10. The interface never claims precise indoor positioning or automatic
    detection unless actually implemented.
11. The UI is usable on common mobile screen sizes and has accessible
    labels and contrast.
12. No buttons are decorative/inert: every visible action works or is
    clearly marked as unavailable in the current prototype.

### 12. Build process

Before finishing: 1. Implement the main save and find flows first. 2.
Test the app with no saved spot, an active spot, and multiple historical
records. 3. Test location permission granted, denied, and unavailable.
4. Test missing photo, missing network, and storage failure states where
possible. 5. Check every button and navigation item. 6. Summarise what
is genuinely functional, what requires API keys or device support, and
what remains a prototype.

Deliver the working application and a short implementation summary. Do
not stop at a design description.

------------------------------------------------------------------------

# Part B --- Product and UX specification

## 1. Product summary

Parked Where? is a mobile-first parking memory utility. It helps a user
save the geographic location and physical clues associated with a parked
vehicle, then retrieve those details later.

**Core promise:** Save your spot. Find your vehicle. Get on with your
day.

**Primary design challenge:** Make it meaningfully easier to save and
retrieve a parking spot than relying on memory or a basic map pin alone.

## 2. Problem statement

People who park in unfamiliar or large parking areas need a quick and
reliable way to remember their vehicle's location and the physical clues
around it, because a map pin alone may not be enough to find the vehicle
again.

This is a hypothesis to validate through user interviews and usability
testing.

## 3. Research scenarios to investigate

-   Shopping mall: multiple levels and similar parking rows.
-   Street parking: unfamiliar streets and nearby landmarks that look
    similar.
-   Airport or long-stay parking: returning hours or days later.
-   Basement parking: GPS may not identify the correct floor, row, or
    bay.
-   Two-wheeler parking: crowded scooter/motorcycle parking in urban
    areas.

Do not treat these scenarios as validated user findings until research
has been conducted.

## 4. Research plan

Interview 5--8 people who park in unfamiliar streets, malls, offices,
hospitals, airports, or multi-level garages.

Ask: 1. Tell me about the last time you had trouble finding your parked
vehicle. 2. Where had you parked, and how long were you away? 3. How did
you try to find it? 4. Did you use a map, take a photo, remember a
pillar number, or ask someone? 5. What was the most frustrating part? 6.
Have you ever saved your parking location? What made you do it or skip
it? 7. What information would have helped you find it faster? 8. What
would make you trust a parking-location app?

Record actual answers. Do not fabricate interview quotes, user counts,
percentages, or validated pain points.

## 5. Competitive landscape

### Google Maps

Existing parking-location features can include saving a location,
notes/photos, map display, and directions. This means basic pin saving
is not enough differentiation.

### Apple Maps

Can automatically mark a parked car in supported vehicle/device
configurations and provide directions. The feature depends on compatible
connections and settings.

### Dedicated parking locator apps

Some offer parking photos, floor/level details, timers,
compass/breadcrumb guidance, history, or automatic detection. Feature
availability differs by app and platform.

### Opportunity hypotheses

Test whether users value: - A fast capture flow that saves first and
asks for optional details later. - Physical parking memory (photo,
floor, zone, row, bay/pillar, notes). - A retrieval screen that
prioritises parking clues, not just the map. - A reliable manual
fallback when GPS or internet is unavailable.

These are hypotheses, not proven competitive advantages.

## 6. Target users

### Primary segment to investigate

Urban commuters who park scooters or motorcycles in busy, unfamiliar, or
changing locations.

### Secondary segment

Drivers who park in malls, hospitals, offices, airports, and multi-level
garages.

### Potential later segment

Travellers who leave vehicles parked for extended periods.

### Jobs to Be Done

-   Functional: Help me locate my vehicle without searching randomly.
-   Emotional: Help me feel confident that I can find it later.
-   Contextual: Help me use physical clues when GPS is unreliable.
-   Secondary: Let me share a saved spot when someone else needs to find
    the vehicle.

## 7. MVP feature prioritisation

### P0 --- Essential

-   Save current location.
-   Manual location fallback and pin correction where supported.
-   Optional parking photo.
-   Optional floor, zone, row, bay/pillar, and notes.
-   Active parking record.
-   Directions through a supported map service where available.
-   Recent parking history.
-   Edit, replace, and delete.
-   Permission-denied and weak-location states.
-   Privacy information and record deletion.

### P1 --- Useful enhancements

-   Parking timer/reminders.
-   Share saved spot.
-   Recent history improvements.
-   Vehicle labels/profiles.
-   Home-screen shortcut where supported.
-   Offline access to saved details.

### P2 --- Later, subject to feasibility

-   Automatic parking detection.
-   Indoor navigation with compatible positioning/map infrastructure.
-   Multiple vehicle profiles and shared access.
-   Photo-assisted recognition of parking signs.
-   Voice-assisted retrieval.

### Out of scope for MVP

-   Live parking-space availability.
-   Parking marketplace.
-   Social network.
-   Vehicle diagnostics or live vehicle tracking.
-   Unvalidated AI features.

## 8. Information architecture

Primary destinations: - Home / Active spot - Save parking - History -
Settings

Home behaviour: - No active record: make "Save parking" the primary
action. - Active record: show its details and "Find my vehicle" / "Get
directions" immediately.

## 9. Core user flows

### Save a spot

Open app → Save parking → request location access in context → confirm
or manually enter location → optionally add photo/details → save → show
active spot.

### Find the vehicle

Open app → view active spot → review physical details → get directions
when available → use photo/notes at the parking area → end session when
found.

### Correct a location

Open active spot → edit → adjust pin or location label → save → show
updated details.

### Permission denied or GPS unavailable

Explain the impact → offer manual location/landmark and physical details
→ clearly label missing location data → let the user enable location
later if desired.

## 10. Screen inventory

1.  Onboarding
2.  Home with no active spot
3.  Confirm location
4.  Add parking details
5.  Active parking card / saved spot
6.  Find my vehicle
7.  Parking history
8.  Settings and privacy

Important additional states: - Location permission denied - GPS weak or
unavailable - Offline - Photo unavailable/permission denied - Save
failure - Duplicate/second spot - Delete confirmation and undo where
feasible - Stale parking record - Directions unavailable

## 11. Data model

Suggested parking record:

``` json
{
  "id": "unique-id",
  "createdAt": "ISO-8601 timestamp",
  "updatedAt": "ISO-8601 timestamp",
  "status": "active",
  "latitude": null,
  "longitude": null,
  "locationLabel": "",
  "locationAccuracyMeters": null,
  "photoReference": null,
  "floorLevel": "",
  "zone": "",
  "row": "",
  "bayOrPillar": "",
  "notes": "",
  "vehicleLabel": ""
}
```

Only populate coordinates and accuracy when they are genuinely
available. The location label and physical details should remain useful
even if coordinates are absent. Choose local or server storage according
to the actual platform and explain the choice to the user.

## 12. UX principles

-   Save the core location before asking for optional details.
-   Prioritise recognition using photos and physical clues.
-   Keep one primary action prominent.
-   Clearly communicate location confidence and limitations.
-   Provide recovery paths for failures.
-   Request only necessary permissions.
-   Make controls accessible and readable.
-   Keep saved records distinguishable from current/live vehicle
    position.
-   Do not imply that a saved pin means the vehicle is currently there
    if the record may be old.

## 13. Privacy and permissions

-   Request foreground location in context.
-   Avoid background location for manual saving.
-   Explain background access if a future automatic-detection feature
    truly needs it.
-   State whether photos and records are stored locally or on a server.
-   Allow users to delete saved data.
-   Do not collect registration numbers without a validated need.
-   Do not claim secure cloud sync or encryption unless implemented.

## 14. Location and indoor navigation constraints

A geographic coordinate and a physical parking bay are different things.

-   Outdoor map directions can help users reach the general area.
-   Indoor GPS may not reliably identify the correct level, row, or bay.
-   Photos, floor, zone, bay/pillar, and landmarks can supplement the
    geographic location.
-   Do not claim exact indoor navigation without appropriate
    infrastructure or a tested positioning solution.
-   Provide a manual fallback for weak GPS or no network.

## 15. Design reference

A separate design reference file will be attached for the application's
visual design. Use that file as the exact reference for UI styling,
layout, components, spacing, color, typography, iconography, borders,
radii, shadows, and interaction patterns wherever specified.

Do not define or invent a separate design system in this product
specification. If the reference does not specify a detail, extend it
consistently with the closest existing pattern. Keep the implementation
accessible and responsive without overriding the supplied reference.

This Markdown file defines product functionality, UX requirements, user
flows, data, edge cases, and acceptance criteria. The attached design
file defines the visual design.

## 16. Validation plan

Test a clickable prototype with 5 participants who match the target
audience.

Tasks: 1. Save a parking location. 2. Add a photo and floor/landmark. 3.
Leave and reopen the app to find the saved spot. 4. Find directions. 5.
Correct an inaccurate pin. 6. Handle unavailable location access.

Observe task completion, hesitation, errors, help required, and
confidence. Use the first test to find usability issues; do not claim
statistical proof from a small sample.

## 17. Metrics to track

-   Task completion rate.
-   Time to save.
-   Time to retrieve the saved record.
-   Error rate.
-   Help required.
-   User confidence in being able to find the vehicle.

Establish baseline results before setting numerical success targets.

## 18. Case study outline

1.  Project overview
2.  Discovery research
3.  Competitive analysis
4.  Validated problem definition
5.  Product strategy and MVP
6.  Information architecture and user flows
7.  Wireframes and iteration
8.  Reference-driven UI implementation and prototype
9.  Usability testing
10. Outcomes, limitations, and next steps

Be transparent about which work is research, which is a design
hypothesis, which is a prototype, and which results were actually
measured.

## 19. Reference links

-   Google Maps Help --- save/find parking:
    https://support.google.com/maps/answer/7257797?co=GENIE.Platform%3DAndroid&hl=en-IN
-   Apple Support --- find your parked car:
    https://support.apple.com/en-au/101587
-   Indoor parking research (iJIM):
    https://online-journals.org/index.php/i-jim/article/view/14385
-   W3C mobile accessibility mapping:
    https://www.w3.org/TR/mobile-accessibility-mapping/

------------------------------------------------------------------------

# Final instruction

Build the smallest reliable product that helps a user save and retrieve
a parking spot. Prioritise the save and find flows, physical parking
memory, location honesty, privacy, and graceful fallbacks. Do not add
features just to make the app look more advanced. Report what works,
what requires external configuration, and what is still a prototype.
