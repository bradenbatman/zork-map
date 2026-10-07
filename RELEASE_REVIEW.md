# Release boundaries

Reviewed October 7, 2026. This is a practical packaging review, not a legal
opinion or permission to publish. The completed package may be kept as a private
project; public release remains a separate decision.

## Scope and findings

- The supplied project is a map and expedition record. It contains JavaScript,
  Python build helpers, JSON data, ASCII scenes, a command log, and documentation.
  It does not contain a Zork story-file binary, a game interpreter, a raw game
  transcript, commercial box art, or identified CAS logo/image assets.
- The room names, connections, objects, and descriptions are derived from Zork I.
  The room notes and walkthrough are narrative summaries; they should not be
  represented as unrelated original game content.
- Three.js 0.180.0, including OrbitControls, is bundled into the 3D view. esbuild
  0.25.12 is the pinned build tool. Their upstream MIT notices are recorded in
  `THIRD_PARTY_NOTICES.md`. Retain the Three.js notice whenever distributing the
  bundle or a standalone HTML copy, not only with the full source archive.
- No credential/key patterns, email addresses, private sharing URLs, or symlinks
  were found in the inspected application sources. This is a bounded source
  review, not a guarantee that every possible secret format was detected.
- The original handoff included personal attribution, local-machine paths,
  account-specific resumption notes, and CAS/Summit branding text. Build-tool
  paths are now portable; the standalone HTML excludes the resumption notes.
  The original data is retained in the private review archive; this public candidate
  removes the account-specific resumption instructions from source too. These are
  provenance and presentation details, not authorization to represent the
  project as an official CAS product.
- Original art is represented as ASCII text or programmatic geometry. No
  separately imported image, audio, model, texture, or font asset was found.
  This review cannot independently establish authorship of every source file.

## Zork licensing context

Microsoft announced the MIT release of the Zork I, II, and III source on
November 20, 2025. The canonical Zork I repository now includes Microsoft's MIT
notice. Its announcement expressly excludes commercial packaging, marketing
materials, and trademark or brand rights. Do not treat this as a blanket license
for unrelated CAS assets, existing commercial story-file downloads, or project
branding. The historical game revision named in the expedition metadata has
not been byte-compared with a build from that source.

Primary sources:

- https://opensource.microsoft.com/blog/2025/11/20/preserving-code-that-shaped-generations-zork-i-ii-and-iii-go-open-source/
- https://github.com/historicalsource/zork1/blob/master/LICENSE
- https://github.com/mrdoob/three.js/blob/r180/LICENSE
- https://github.com/evanw/esbuild/blob/v0.25.12/LICENSE.md

## Minimal checks before any public release

1. Make an explicit publication decision and choose a license, if desired, for
   the project's original source and artwork. No project-source license was
   selected by this review; third-party notices do not license original work.
2. Keep local-machine paths, private repository provenance, personal attribution,
   and account/browser resumption instructions out of a public copy unless their
   inclusion is intentional. Preserve the private original separately.
3. Decide whether to retain CAS/Summit references as historical attribution or
   use a neutral title and description. Do not imply sponsorship or endorsement.
   Preserve accurate game and dependency attribution.
4. Keep raw game transcripts, story files, interpreters, commercial artwork,
   credentials, browser profiles, and unrelated workspace files excluded. Any
   later additions need their own provenance and license check.
5. Include third-party notices in the source archive and the standalone HTML.
   If font files are later bundled, include their specific license files too.
6. Rebuild and rescan the final files after redactions. Generate the final
   manifest only after all source and documentation edits are complete.

Private GitHub review is authorized by the owner. Public visibility, site
publication, third-party sharing and an original-code license remain unapproved.
The original game save is not accessed by this project.
