# Prototype Fund — application draft (Jahrgang 03)

**Programme.** Prototype Fund, a project of the Open Knowledge Foundation Germany, funded by the BMFTR.
**Window.** 1 October – **30 November 2026, 15:00 CET**. Submit at [bewerben.prototypefund.de](https://bewerben.prototypefund.de/).
**Recommended line.** **Resilienz** (free alternatives to proprietary, centralised software). Fallback: **Innovation** (data security / software infrastructure). Note: *Resilienz* obliges you to also apply for the Second Stage with a concept, and runs ten months; *Up and Coming* only covers data-security and software-infrastructure topics.
**Language.** The first-stage form can be answered largely in English, but the formal application and several documents must be in German. The text below is German, with an English gloss.
**Amount.** Up to €47,500 (solo) / €95,000 (team) for the six-month phase. **Resilienz runs ten months** and requires the Second Stage, so the ceiling is up to €79,167 (solo) / €158,333 (team).

## Applicant status — verified 19 October 2026

| Question | Answer | Consequence |
| --- | --- | --- |
| Enrolled? | Yes — B.Sc., University of Stuttgart | Meets the "Up and Coming" study criterion; also eligible for Route C scholarships |
| Employed? | Yes — at a company owned by the applicant's mother | Does **not** meet the solo self-employment rule unless the employer releases the applicant part-time in writing |
| Legal form | None | Solo needs self-employment or a release; alternatively a GbR team |
| Licence | AGPL-3.0-or-later | Meets the open-source requirement |
| Repository public? | **No** — HTTP 404 anonymously | Must be made public |

**Verdict: not eligible as a solo applicant in the current form.** The published rule is: resident in Germany **and** *selbständig oder freiberuflich* **or** released part-time by the employer for the project period. Employment — including at a family-owned company — is not self-employment.

**Three ways to qualify before 30 November 2026:**

1. **Get a written part-time release** from the employer for the funded period. The programme expressly allows this ("oder für die Projektlaufzeit (anteilig) vom Arbeitgeber freigestellt"). Template: [employer-release-template.md](employer-release-template.md).
2. **Register as a freelancer** (*Freiberufler*) with the Finanzamt, and check the employment contract for consent to secondary self-employment.
3. **Apply as a GbR team** seated in Germany (up to four people). Team members may be employed; the GbR is the applicant.

Until one of these exists, do not submit — the formal check would reject the application.

> Replace every remaining `[…]`. Do not leave a placeholder in the submitted form. Do not claim the university endorses the project.

## Eligibility gate — tick these before you start

- [x] I am 18 or older.
- [ ] **Residence and status.** I am resident in Germany **and** *selbständig oder freiberuflich*, **or** my employer has released me part-time for the project, **or** I apply as a **GbR seated in Germany**. *(Current status: employed at a family-owned company — **not yet met**.)*
- [x] My idea is a software project released under an open-source licence (AGPL-3.0-or-later).
- [x] I am not applying as a company, association or other organisation.
- [ ] The repository is public.

If the second box cannot be ticked, you are not eligible yet (see [eligibility-and-gaps.md](../eligibility-and-gaps.md) and the release template).

## 1. Worum geht es? (project idea)

*German draft — this is the core free-text.*

**University Assistant** ist ein quelloffener, lokal-first Lernbegleiter für Studierende an Hochschulen mit einem Campus-Management-System. Die App bündelt den eigenen Stundenplan, den Studienfortschritt, Fristen und Kursmaterial an einer Stelle und beantwortet Fragen dazu in Deutsch oder Englisch. Der entscheidende Unterschied zu geschlossenen Hochschulportalen: **Der Studien-Datensatz bleibt auf dem Gerät der Studierenden.** Es gibt keinen zentralen Server, der ein Transcript speichert; die Antworten entstehen lokal aus dem eigenen Datensatz, und eine optionale Sprachmodell-Anbindung ist nur eine umschaltbare Ebene, kein Datenspeicher.

Ein funktionierender Prototyp existiert bereits (Expo/React Native, TypeScript). In der Förderphase wird daraus ein installierbares, veröffentlichungsreifes Open-Source-Werkzeug mit dokumentierter Schnittstelle zu Campus-Systemen, mit Barrierefreiheit, Zweisprachigkeit und einem echten Nutzer\*innen-Test.

**English gloss.** An open-source, local-first study companion. It keeps the student's own record on the device, answers from it, and treats the optional LLM as a replaceable layer, not a store. A working prototype exists; the funded work turns it into a releasable tool with a documented campus interface, accessibility, bilingual UI and a real user test.

## 2. Bezug zum Förderschwerpunkt "Resilienz"

*German draft.*

Studierende sind heute auf zentralisierte, proprietäre Hochschul-Ökosysteme angewiesen, deren Datenhaltung sie weder einsehen noch verlassen können. Das Projekt liefert eine **freie, dezentrale Alternative**: ein offener Client, der die Datenhoheit zu den Nutzer\*innen zurückschiebt und von jeder Hochschule nachgenutzt und angepasst werden kann. Damit stärkt es die im Schwerpunkt "Resilienz" gesuchte **selbstbestimmte, datensparsame und nachnutzbare** Software. Der Code wird vollständig unter einer Freien Lizenz veröffentlicht; die Schnittstellen-Definition ist offen dokumentiert, damit weitere Hochschulen eigene Adapter beitragen können.

*(Fallback für die Linie "Innovation": betone Datensicherheit — lokale Speicherung, kein zentrales Transcript, Opt-in-Credential-Vault — und Software-Infrastruktur — die offene, dokumentierte Campus-Schnittstelle und der wiederverwendbare Datenstandard.)*

## 3. Was wird in sechs (bzw. zehn) Monaten gebaut?

*German draft.*

- **Reifegrad:** Von der Demonstration (fiktiver Datensatz) zu einem installierbaren Prototyp mit Onboarding und klarer Trennung zwischen Demo- und Echtdaten.
- **Offene Schnittstelle:** eine dokumentierte, versionierte Definition eines "Campus Record" und ein Referenz-Client gegen SIAM/OIDC.
- **Lokal-first, auditierbar:** lokale Speicherung, nachvollziehbare Datenflüsse, dokumentierte Grenzen dessen, was das Gerät verlässt.
- **Barrierefreiheit und Zweisprachigkeit:** vollständig geprüfte Screenreader-Tauglichkeit und deutsche/englische Kataloge.
- **Nutzer\*innen-Test:** begleitete Tests mit [Anzahl] Studierenden, Ergebnis offen veröffentlicht.
- **Release:** veröffentlichter Open-Source-Prototyp mit Tests und Beitragenden-Anleitung.

## 4. Gesellschaftlicher Mehrwert

*German draft.*

Alle Studierenden einer Hochschule mit Campus-Management-System sind die Zielgruppe — zuerst an der Universität Stuttgart, dann übertragbar. Der Nutzen ist doppelt: Studierende erhalten Transparenz und Kontrolle über ihre eigenen akademischen Daten, und Hochschulen erhalten einen offenen, auditierbaren Client, der keine zentrale Sammlung sensibler Leistungsdaten erfordert.

## 5. Team

**Solo, with a part-time release.** "Ich bin Einzelentwickler\*in mit Wohnsitz in Deutschland. Mein Arbeitgeber hat mich für den Förderzeitraum anteilig freigestellt; die Freistellungsbestätigung liegt bei."

*Alternative:* a **GbR team** seated in Germany (up to four people); team members may be employed.

## 6. Beantragte Laufzeit und Budget (Größenordnung)

- **Laufzeit:** **10 Monate** (Förderlinie Resilienz: 01.06.2027–30.11.2027 plus Second Stage 01.12.2027–31.03.2028).
- **Personal:** `[x]` Personenmonate à `[y]` Stunden zu `[50]` €/h (der Satz ist gedeckelt).
- **Sachmittel:** kleine Beträge für Nutzer\*innen-Tests, Barrierefreiheits- und Sicherheitsüberprüfung.
- **Summe:** `[Betrag]` €, höchstens **79.167 €** (Einzelperson, 10 Monate inkl. Second Stage).

## 7. Second-Stage-Konzept (bei Linie Resilienz verpflichtend)

*German draft.* Nach der Prototyp-Phase: Aufbau einer Beitragenden-Community, Veröffentlichung des Datenstandards, Gewinnung weiterer Hochschulen als Adapter-Beitragende, und ein tragfähiges Modell zur Weiterführung (Trägerverein, Hochschulpartnerschaft oder Hosting-Genossenschaft). Ziel: Das Werkzeug lebt nach der Förderung weiter, unabhängig von einem einzelnen Anbieter.

## 8. Nachweise, die du anhängen kannst

- `docs/product/personas-and-journeys.md` — Nutzer\*innen und Wege.
- `docs/engineering/architecture.md`, `docs/engineering/data-model.md` — Entwurf.
- `docs/engineering/security-and-privacy.md` — lokal-first, Datenschutz.
- `npm run check` — automatisierte Prüfungen.

## 9. Generative KI offenlegen

The Prototype Fund FAQ asks whether you used AI to write the application and whether the project is "vibe-coded". Answer truthfully: state which parts of the code were AI-assisted, keep the human design (domain model, credit rules, tests, privacy boundary) as the funded work, and describe your disclosure practice (see [`CONTRIBUTING.md`](https://github.com/403access/stuttgart-uni-assistant/blob/main/CONTRIBUTING.md)).
