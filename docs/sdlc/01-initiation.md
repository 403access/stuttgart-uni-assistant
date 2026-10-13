# 1. Initiation

## Purpose

Decide whether the product is worth a first build, who it is for, and which claims it must not make.

## Opportunity

Students at the University of Stuttgart already have the information they need, spread across C@MPUS, ILIAS, SDG Campus, faculty pages, stuvus, and chats with other students. The cost is not a missing portal. The cost is assembling a week: which lecture is today, which registration closes soon, which elective is actually open, and which slide answers the question they have tonight.

The product is a companion that reads those sources and answers in the student's language. It is not a replacement for the Prüfungsamt, and it is not an official university app.

## Stakeholders

| Who | Interest in this phase |
| --- | --- |
| Students in degree programs on both campuses | A single place for the week, the degree, and the material |
| International students | English as well as German, without translating the official system names |
| Student representation (stuvus) and Fachgruppen | A channel in the news feed, not a governance role in the prototype |
| University IT and the Prüfungsamt | Out of scope until a real integration agreement exists |
| The builder of this repository | A demonstration that can be shown without university credentials |

## Constraints discovered at the start

- SIAM credentials must not be collected and sent to a private server. A password field that forwards the password would be the wrong product, even as a demo. The later sign-in opens the TIK identity provider and keeps the password on that page. See [oidc-login.md](../engineering/oidc-login.md).
- C@MPUS, ILIAS, and SDG Campus do not offer a public student API that this project can call.
- Past exam papers are often copyrighted. An index of topics is in scope. Hosting the papers is not.
- The corporate design (anthracite, mid blue, light blue, the circle motif) is published. The signet and the Univers typeface are not free to embed.
- The assistant has to work when no model key is configured, because a demo that only works with a paid API is a demo that fails in the room.

## Outcome of initiation

Proceed with a local-first Expo prototype for one fictional student in B.Sc. Informatik, Faculty 5, with both campuses, both languages, and an assistant that prefers the bundled record over a free-form model.

Name the app **Stuttgart Uni**. Say, in the product and on the sign-in screen, that it is not an offer of the university.

## Exit check

Initiation is complete when the boundary above is written down and the build will not cross it to look more official. That text lives in this file, in the product description, and on the sign-in screen.
