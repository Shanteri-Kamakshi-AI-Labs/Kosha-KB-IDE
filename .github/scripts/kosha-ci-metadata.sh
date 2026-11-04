#!/usr/bin/env bash
# Shared CI metadata for Kosha-KB-IDE publish workflows.
# Source from a workflow step:  source .github/scripts/kosha-ci-metadata.sh
# Requires: version.conf at repo root; GITHUB_REPOSITORY + GITHUB_REF_NAME (or args).
# Optional env: REGISTRY, NEXUS_REPOSITORY, NEXUS_BASE_URL, NEXUS_RAW_REPOSITORY

set -euo pipefail

kosha_sanitize() {
  printf '%s' "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed 's#[^a-z0-9._-]#-#g' \
    | sed 's#--*#-#g' \
    | sed 's#^[._-]*##; s#[._-]*$##'
}

kosha_read_version() {
  if [ ! -f "version.conf" ]; then
    echo "version.conf not found." >&2
    exit 1
  fi

  VERSION="$(sed \
    -e 's/\r$//' \
    -e '/^[[:space:]]*#/d' \
    -e '/^[[:space:]]*$/d' \
    -e 's/^[[:space:]]*VERSION[[:space:]]*=[[:space:]]*//' \
    -e 's/^[[:space:]]*//' \
    -e 's/[[:space:]]*$//' \
    version.conf \
    | head -n 1)"

  if [ -z "${VERSION}" ]; then
    echo "The version read from version.conf is empty." >&2
    exit 1
  fi

  if ! printf '%s' "${VERSION}" \
    | grep -Eq '^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$'; then
    echo "Invalid version tag: ${VERSION}" >&2
    exit 1
  fi
}

kosha_init_metadata() {
  REGISTRY="${REGISTRY:-registry.skaill.app}"
  NEXUS_REPOSITORY="${NEXUS_REPOSITORY:-docker-hosted}"
  NEXUS_BASE_URL="${NEXUS_BASE_URL:-https://registry.skaill.app}"
  NEXUS_RAW_REPOSITORY="${NEXUS_RAW_REPOSITORY:-raw-hosted}"

  REPO_NAME="$(kosha_sanitize "${GITHUB_REPOSITORY##*/}")"
  BRANCH_NAME="$(kosha_sanitize "${GITHUB_REF_NAME}")"
  kosha_read_version

  if [ -z "${REPO_NAME}" ] || [ -z "${BRANCH_NAME}" ]; then
    echo "Unable to determine repository or branch name." >&2
    exit 1
  fi

  IMAGE_NAME="${REPO_NAME}-${BRANCH_NAME}"
  IMAGE_PATH="${REGISTRY}/${NEXUS_REPOSITORY}/${IMAGE_NAME}"
  FULL_IMAGE="${IMAGE_PATH}:${VERSION}"
}

kosha_desktop_artifact_name() {
  # Args: suffix including platform/arch/kind and extension
  # Example: windows-x64-user-setup.exe
  # Result:  <repo>-<branch>-kosha-<version>-windows-x64-user-setup.exe
  printf '%s-%s-kosha-%s-%s\n' \
    "${REPO_NAME}" "${BRANCH_NAME}" "${VERSION}" "$1"
}

kosha_nexus_raw_url() {
  # Args: relative path under raw repo (e.g. desktop/repo/branch/file.exe)
  local rel="$1"
  printf '%s/repository/%s/%s\n' "${NEXUS_BASE_URL}" "${NEXUS_RAW_REPOSITORY}" "${rel}"
}

kosha_write_github_output() {
  if [ -z "${GITHUB_OUTPUT:-}" ]; then
    return 0
  fi
  {
    echo "repo_name=${REPO_NAME}"
    echo "branch_name=${BRANCH_NAME}"
    echo "version=${VERSION}"
    echo "version_source=version.conf"
    echo "image_name=${IMAGE_NAME}"
    echo "image_path=${IMAGE_PATH}"
    echo "full_image=${FULL_IMAGE}"
  } >> "${GITHUB_OUTPUT}"
}

kosha_init_metadata
kosha_write_github_output

echo "Repository:     ${REPO_NAME}"
echo "Branch:         ${BRANCH_NAME}"
echo "Version:        ${VERSION}"
echo "Docker image:   ${FULL_IMAGE}"
