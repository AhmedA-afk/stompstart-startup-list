# Contributing a startup

1. Create the files with `npm run new -- your-startup-slug`, fill in the facts, and add the logo
   and product images beside the file. Keep claims specific and cite public sources. Leave out
   what you cannot establish rather than guessing.
2. Run `npm run validate` and `npm run eligibility -- your-startup-slug`, then open one pull
   request for the one startup.
3. Keep the file name and slug fixed once the startup is published, so its links keep working.
   Corrections edit the same file.

## The checks

`validate` checks the shape of every file against the exported schemas and that each startup's
images are exactly the ones its file names. `eligibility` checks the startup a pull request adds:

- **duplicate**: its domain and name are not on Stompstart or in an earlier open pull request;
- **website** and **access**: the site answers on its own domain, is not parked, and the ways in
  work;
- **launch-window**: the launch falls in the six months before the pull request opened, and its
  source states the date; a site archived long before the window is marked for review;
- **logo**: PNG or WebP, 256 to 1,600 pixels, square or close to it, matched against the icons the
  site itself serves;
- **brand-image**: at least one product image 1,200 to 1,600 pixels wide;
- **copy**: your own words, not the site's; no em dashes; hype is marked for review;
- **links**: no tracking or referral parameters and no contact details.

A failed check blocks review until it is fixed. A check marked for review passes to a reviewer
with its reason.

## Credit and licence

By submitting text, you confirm you wrote it and can license it under [CC BY 4.0](LICENSE-DATA.md).
Logos and product images must be the startup's own, taken from its site or press kit; do not make,
redraw or generate them. Do not include private contact details, credentials or payment data.

A published profile credits the pull request's author by public GitHub username and links the pull
request and the licence. The published record may adapt the text after review; the sources used to
verify it are kept separately. If the credit should differ, say so in the pull request before
publication.

Passing checks is not admission. Stompstart verifies the exact revision and its evidence before a
release. A website that no longer answers does not by itself prove a startup closed.
