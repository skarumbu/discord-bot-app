---
status: accepted
date: 2026-03-19
decision-makers: nishyfish
---

# GitHub Actions CI/CD with OIDC and Automated Terraform Deploy

## Context and Problem Statement

The bot source (`discord-bot-app`) and its infrastructure (`discord-bot-infra`) live in separate repos. Every push to `main` in the app repo should result in a running updated container with no manual steps — no local `docker push`, no `terraform apply` from a developer's machine.

## Decision

Use a GitHub Actions workflow in `discord-bot-app` that, on every push to `main`:

1. Runs the test suite. Deployment is blocked if tests fail.
2. Builds the Docker image and pushes it to Azure Container Registry, tagged `sha-<short-sha>` (immutable, traceable) and `latest`.
3. Checks out `discord-bot-infra` and runs `terraform apply -var="image=<new-tag>"` against `environments/prod`.

Authentication to Azure uses OIDC federated identity — no static credentials are stored anywhere. The workflow's service principal is granted only the permissions it needs: `AcrPush` on the registry, `Contributor` on the prod resource group, and `Storage Blob Data Contributor` on the Terraform state storage account.

The infra repo is accessed via a fine-grained GitHub PAT (`INFRA_REPO_PAT`) scoped to read-only contents of `discord-bot-infra`.

## Image Tagging

`sha-<7-char-sha>` is the immutable tag used for deployment; `latest` is pushed alongside it for convenience. Semver tagging is not used — the bot has no public API contract requiring version semantics, and continuous deployment from `main` makes commit SHAs the natural identifier.

## Consequences

**Good:**
- Zero manual steps after merging to `main`.
- No static Azure credentials in GitHub Secrets — OIDC tokens are short-lived and scoped.
- Tests gate deployment; a broken build never reaches prod.
- Every deployed image is traceable to an exact commit.

**Neutral:**
- The app repo's workflow drives infrastructure changes. This is intentional: the only infra change triggered by app pushes is the container image tag. Structural infra changes are still applied manually from the infra repo.
- `INFRA_REPO_PAT` requires periodic rotation (fine-grained PATs have a max 1-year expiry).

**Bad:**
- `TF_VAR_secret_env_vars` (containing `DISCORD_TOKEN`) must be kept in sync as a GitHub Secret if the token is rotated. Rotating the token means updating both the Discord developer portal and this secret.
