const THEME_KEY = 'gin_layout_theme'

export function getPreferredTheme() {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'dark' || saved === 'light') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(theme) {
  const target = theme === 'dark' ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', target)
  document.documentElement.style.colorScheme = target
  localStorage.setItem(THEME_KEY, target)
  return target
}

export function initTheme() {
  const current = getPreferredTheme()
  applyTheme(current)

  // 监听系统偏好变化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(THEME_KEY)) {
      applyTheme(e.matches ? 'dark' : 'light')
    }
  })

  return current
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || getPreferredTheme()
  const next = current === 'dark' ? 'light' : 'dark'
  return applyTheme(next)
}
