export interface CountryOption {
  code: string;
  name: string;
}

const displayNames = new Intl.DisplayNames(['en'], {
  type: 'region',
  fallback: 'none',
});

// Generated from native Intl.DisplayNames without external country packages.
// Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DisplayNames
export function getCountryOptions(): CountryOption[] {
  const list: CountryOption[] = [];
  for (let i = 65; i <= 90; i++) {
    for (let j = 65; j <= 90; j++) {
      const code = String.fromCharCode(i, j);
      try {
        const name = displayNames.of(code);
        if (name && name !== 'Unknown Region' && name !== code) {
          list.push({ code, name });
        }
      } catch {
        // Skip invalid codes
      }
    }
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export function getCountryName(code: string | null | undefined): string | null {
  if (!code || !/^[A-Z]{2}$/.test(code)) return null;
  try {
    const name = displayNames.of(code);
    return name && name !== 'Unknown Region' ? name : null;
  } catch {
    return null;
  }
}
