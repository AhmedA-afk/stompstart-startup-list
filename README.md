# Stompstart startup list

Contribute a complete startup profile for free by opening a pull request that adds
`startups/<slug>.yaml`. Run `npm ci`, then `npm run new -- your-startup-slug`
to create a profile with stable random IDs. Replace its sample facts and URLs,
then run `npm run validate` before opening the PR. The
[example](examples/example.yaml) explains the fields.
Keep the same `startup_id` and `subject_id` when correcting a profile. The file
name and `slug` must also stay fixed after publication so existing links survive.

This repository contains public authoring data only. Do not include email
addresses, private contact information, payment details, access tokens, or
unlicensed media. Put public sources in `sources` and describe unknown facts as
`unknown`; do not invent them. An official website and a usable browse, signup,
demo, or waitlist route are required for a new discovery. A prelaunch product is
welcome.

Validation here gives early feedback on the public shape. It does not publish a
listing or verify its claims. Stompstart separately captures evidence, reviews
the exact revision, and admits eligible records into a signed release. Payment
for priority processing never changes factual eligibility, ranking, or approval.
Corrections are free. This repo has no payment, private contact, capture, or
release-signing state.

The [schema](profile.schema.json) is generated from Stompstart's
`startupProfileSchema` at the commit recorded in [contract-source.json](contract-source.json).
The private product validator remains authoritative for admission.

Profile text is [CC BY 4.0](LICENSE-DATA.md); validator code is
[MIT](LICENSE-CODE). Published profiles credit the public PR author and link
to the contributing PR. [Contribution terms](CONTRIBUTING.md) explain what can
be submitted, how credit works, and how corrections work.
