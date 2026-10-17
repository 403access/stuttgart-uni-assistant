# Campus: live courses, structures, rooms, and the map

The **Campus** tab and its screens are where the live C@MPUS reads and the map live. This is also where the difference between the demonstration record and real data is widest — the descriptions below keep them apart.

## Live from C@MPUS

These screens read your enrolled studies from the university through the assistant server. Changing study in the selector re-reads the structure.

| Screen | What you do |
| --- | --- |
| C@MPUS tab in `/campus-info` | The curriculum structure of your selected study: root and groups, tap through to children. A reload button re-reads. **Alles laden** runs a full server sync job and fills the on-device cache with the whole study. |
| Kurse toggle in `/campus-info` | The courses of the node you are looking at: title, type, semester, lecturers, time, room, and registration state. An empty list is a valid answer — not every node carries courses. |
| `/kurse` | All courses of a study: type pills, search, and sorting by title, type, or next appointment. Cached per study; a sync resumes where it stopped. |
| Course detail `/kurs/[id]` | Number, SWS, next appointment, and links to the official C@MPUS page. |
| `/strukturen` (web only) | Browse the cached trees of all enrolled studies with search, filters, and sort. Browsing never refetches. |

Everything a server call touches is stored on the device as it arrives, so a portal outage later answers from the cache and marks itself `cached: true`. The app shows when the data went stale instead of pretending it is fresh.

## The map (Karte)

| Screen | What it shows |
| --- | --- |
| `https://maps.uni-stuttgart.de/` embedded | The official university map, active by default. If embedding fails, the app opens it in the browser. |
| Übersicht tab | Vaihingen and Stadtmitte as a schematic with dots. The screen says itself that this is not a live location. |

## Rooms and buildings

Search for or tap a room or building — lecture halls (K I, K II and their spellings), offices, study space, libraries, and the Mensa. **"Mensa Vaihingen"** resolves to Pfaffenwaldring 45. A room screen lists the address and every session of yours that is held there.

There is no GPS navigation in this build. The map stays schematic until a live location feature is added.
