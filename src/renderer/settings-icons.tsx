/** 设置页的图标：左栏是类别，顶部是对象或动作，两套不重复。
 *  只用 currentColor 描边，尺寸跟随字号，不引入图标字体。 */
const PATHS: Record<string, string[]> = {
  bubble: ['M4 5.5h12v8H9l-3 2.5v-2.5H4z'],
  chip: ['M7 7h6v6H7z', 'M10 3v2M10 15v2M3 10h2M15 10h2'],
  person: ['M10 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z', 'M4.5 16c.8-2.6 2.9-4 5.5-4s4.7 1.4 5.5 4'],
  palette: [
    'M10 3a7 7 0 1 0 0 14c1.4 0 2-.8 2-1.8 0-1.4-1.4-1.6-1.4-2.8 0-1 .8-1.6 1.8-1.6H14a3 3 0 0 0 3-3A7 7 0 0 0 10 3Z',
    'M7 7.5h.01M6 10.5h.01M9 12.5h.01'
  ],
  gear: [
    'M10 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z',
    'M10 3v2M10 15v2M3 10h2M15 10h2M5 5l1.5 1.5M13.5 13.5 15 15M15 5l-1.5 1.5M6.5 13.5 5 15'
  ],
  sliders: ['M4 6h12M4 10h12M4 14h12', 'M7 4.5v3M13 8.5v3M9 12.5v3'],
  quote: ['M5 6h4v4H5zM5 10c0 2 1 3 3 3', 'M11 6h4v4h-4zM11 10c0 2 1 3 3 3'],
  cube: ['M10 3 16 6.5v7L10 17l-6-3.5v-7Z', 'M4 6.5 10 10l6-3.5M10 10v7'],
  frame: ['M4 4h12v12H4z', 'M7 7h6v6H7z'],
  mic: ['M10 4a2 2 0 0 1 2 2v3a2 2 0 1 1-4 0V6a2 2 0 0 1 2-2Z', 'M6 9.5a4 4 0 0 0 8 0M10 13.5V16'],
  layout: ['M4 4h12v12H4z', 'M4 8h12M9 8v8'],
  puzzle: ['M4 4h5v3a2 2 0 1 0 0 4v3H4z', 'M11 4h5v6h-3a2 2 0 1 0-4 0H11z'],
  phone: ['M6 3h8v14H6z', 'M9 14.5h2'],
  info: ['M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z', 'M10 9v4M10 6.5h.01']
}

export function SettingsIcon({ name }: { name: string }) {
  const paths = PATHS[name] ?? PATHS.info
  return <svg className="settings-icon" viewBox="0 0 20 20" aria-hidden="true">
    {paths.map((d) => <path key={d} d={d} />)}
  </svg>
}
