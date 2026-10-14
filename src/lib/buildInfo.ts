export function formatBuildLabel(version: string, commit: string, buildDate: string | null) {
  return [`v${version}`, commit, buildDate ? `${buildDate} UTC` : null].filter(Boolean).join(' · ')
}

const appVersion = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0'

export const versionLabel = `v${appVersion}`

export const buildLabel = formatBuildLabel(
  appVersion,
  typeof __APP_COMMIT__ === 'string' ? __APP_COMMIT__ : 'dev',
  typeof __APP_BUILD_DATE__ === 'string' ? __APP_BUILD_DATE__ : null,
)
