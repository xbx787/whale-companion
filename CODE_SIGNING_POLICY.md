# Code signing policy

Free code signing provided by [SignPath.io](https://signpath.io/), certificate by [SignPath Foundation](https://signpath.org/).

## Scope

Only Windows release artifacts built from the public repository
[`xbx787/whale-companion`](https://github.com/xbx787/whale-companion) on
GitHub-hosted Actions runners are signed. The signed artifact is the NSIS
installer produced by `.github/workflows/signpath-release.yml`.

Local development builds and artifacts built outside GitHub Actions are not
submitted for signing.

## Roles

- Authors and reviewers: repository collaborators listed by GitHub.
- Approvers: the repository owner (`xbx787`). Every production signing request
  requires manual approval in SignPath.
- Signing operator: the repository owner.

All project members with repository or signing access must use multi-factor
authentication for GitHub and SignPath.

## Build and release controls

- Release installers are built by GitHub Actions from an exact commit.
- The workflow uploads the unsigned installer as a GitHub Actions artifact;
  SignPath verifies the artifact origin before signing.
- The signed installer is downloaded, verified with
  `Get-AuthenticodeSignature`, and uploaded as a separate artifact.
- Signing is skipped when `SIGNPATH_ORGANIZATION_ID` is not configured.
