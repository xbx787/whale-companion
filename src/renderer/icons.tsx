// 由 scripts/gen-icons.mjs 生成，请勿手改。
// 主用 Material Symbols，缺失的用 Phosphor Fill 补；颜色跟随 currentColor。
import type { CSSProperties, SVGProps } from 'react'

export type IconProps = SVGProps<SVGSVGElement> & { size?: number; style?: CSSProperties }

function withSize({ size = 18, style, ...rest }: IconProps) {
  return { ...rest, style: { width: size, height: size, flex: 'none', fill: 'currentColor', stroke: 'none', ...style } }
}

/** home — material-symbols/home */
export const IconHome = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="M4 21V9l8-6l8 6v12h-6v-7h-4v7z" />
    </svg>
  )
}

/** settings — material-symbols/settings */
export const IconSettings = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="m9.25 22l-.4-3.2q-.325-.125-.612-.3t-.563-.375L4.7 19.375l-2.75-4.75l2.575-1.95Q4.5 12.5 4.5 12.338v-.675q0-.163.025-.338L1.95 9.375l2.75-4.75l2.975 1.25q.275-.2.575-.375t.6-.3l.4-3.2h5.5l.4 3.2q.325.125.613.3t.562.375l2.975-1.25l2.75 4.75l-2.575 1.95q.025.175.025.338v.674q0 .163-.05.338l2.575 1.95l-2.75 4.75l-2.95-1.25q-.275.2-.575.375t-.6.3l-.4 3.2zm2.8-6.5q1.45 0 2.475-1.025T15.55 12t-1.025-2.475T12.05 8.5q-1.475 0-2.488 1.025T8.55 12t1.013 2.475T12.05 15.5" />
    </svg>
  )
}

/** folder — material-symbols/folder */
export const IconFolder = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="M4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h6l2 2h8q.825 0 1.413.588T22 8v10q0 .825-.587 1.413T20 20z" />
    </svg>
  )
}

/** file — material-symbols/description */
export const IconFile = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="M8 18h8v-2H8zm0-4h8v-2H8zm-2 8q-.825 0-1.412-.587T4 20V4q0-.825.588-1.412T6 2h8l6 6v12q0 .825-.587 1.413T18 22zm7-13h5l-5-5z" />
    </svg>
  )
}

/** search — material-symbols/search */
export const IconSearch = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="m19.6 21l-6.3-6.3q-.75.6-1.725.95T9.5 16q-2.725 0-4.612-1.888T3 9.5t1.888-4.612T9.5 3t4.613 1.888T16 9.5q0 1.1-.35 2.075T14.7 13.3l6.3 6.3zM9.5 14q1.875 0 3.188-1.312T14 9.5t-1.312-3.187T9.5 5T6.313 6.313T5 9.5t1.313 3.188T9.5 14" />
    </svg>
  )
}

/** user — material-symbols/person */
export const IconUser = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="M9.175 10.825Q8 9.65 8 8t1.175-2.825T12 4t2.825 1.175T16 8t-1.175 2.825T12 12t-2.825-1.175M4 20v-2.8q0-.85.438-1.562T5.6 14.55q1.55-.775 3.15-1.162T12 13t3.25.388t3.15 1.162q.725.375 1.163 1.088T20 17.2V20z" />
    </svg>
  )
}

/** chat — material-symbols/chat */
export const IconChat = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="M2 22V4q0-.825.588-1.412T4 2h16q.825 0 1.413.588T22 4v12q0 .825-.587 1.413T20 18H6zm4-8h8v-2H6zm0-3h12V9H6zm0-3h12V6H6z" />
    </svg>
  )
}

/** send — material-symbols/send */
export const IconSend = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="M3 20v-6l8-2l-8-2V4l19 8z" />
    </svg>
  )
}

/** play — material-symbols/play-arrow */
export const IconPlay = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="M8 19V5l11 7z" />
    </svg>
  )
}

/** stop — material-symbols/stop */
export const IconStop = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="M6 18V6h12v12z" />
    </svg>
  )
}

/** plus — material-symbols/add */
export const IconPlus = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="M11 13H5v-2h6V5h2v6h6v2h-6v6h-2z" />
    </svg>
  )
}

/** close — material-symbols/close */
export const IconClose = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="M6.4 19L5 17.6l5.6-5.6L5 6.4L6.4 5l5.6 5.6L17.6 5L19 6.4L13.4 12l5.6 5.6l-1.4 1.4l-5.6-5.6z" />
    </svg>
  )
}

/** chevronDown — material-symbols/keyboard-arrow-down */
export const IconChevronDown = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="m12 15.4l-6-6L7.4 8l4.6 4.6L16.6 8L18 9.4z" />
    </svg>
  )
}

/** chevronRight — material-symbols/keyboard-arrow-right */
export const IconChevronRight = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="M12.6 12L8 7.4L9.4 6l6 6l-6 6L8 16.6z" />
    </svg>
  )
}

/** more — material-symbols/more-horiz */
export const IconMore = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="M6 14q-.825 0-1.412-.587T4 12t.588-1.412T6 10t1.413.588T8 12t-.587 1.413T6 14m6 0q-.825 0-1.412-.587T10 12t.588-1.412T12 10t1.413.588T14 12t-.587 1.413T12 14m6 0q-.825 0-1.412-.587T16 12t.588-1.412T18 10t1.413.588T20 12t-.587 1.413T18 14" />
    </svg>
  )
}

/** refresh — material-symbols/refresh */
export const IconRefresh = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="M12 20q-3.35 0-5.675-2.325T4 12t2.325-5.675T12 4q1.725 0 3.3.712T18 6.75V4h2v7h-7V9h4.2q-.8-1.4-2.187-2.2T12 6Q9.5 6 7.75 7.75T6 12t1.75 4.25T12 18q1.925 0 3.475-1.1T17.65 14h2.1q-.7 2.65-2.85 4.325T12 20" />
    </svg>
  )
}

/** copy — material-symbols/content-copy */
export const IconCopy = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="M9 18q-.825 0-1.412-.587T7 16V4q0-.825.588-1.412T9 2h9q.825 0 1.413.588T20 4v12q0 .825-.587 1.413T18 18zm-4 4q-.825 0-1.412-.587T3 20V6h2v14h11v2z" />
    </svg>
  )
}

/** check — material-symbols/check */
export const IconCheck = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="m9.55 18l-5.7-5.7l1.425-1.425L9.55 15.15l9.175-9.175L20.15 7.4z" />
    </svg>
  )
}

/** warning — material-symbols/warning */
export const IconWarning = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="M1 21L12 2l11 19zm11.713-3.287Q13 17.425 13 17t-.288-.712T12 16t-.712.288T11 17t.288.713T12 18t.713-.288M11 15h2v-5h-2z" />
    </svg>
  )
}

/** trash — material-symbols/delete */
export const IconTrash = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="M7 21q-.825 0-1.412-.587T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.587 1.413T17 21zm2-4h2V8H9zm4 0h2V8h-2z" />
    </svg>
  )
}

/** edit — material-symbols/edit */
export const IconEdit = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="M3 21v-4.25L16.2 3.575q.3-.275.663-.425t.762-.15t.775.15t.65.45L20.425 5q.3.275.438.65T21 6.4q0 .4-.137.763t-.438.662L7.25 21zM17.6 7.8L19 6.4L17.6 5l-1.4 1.4z" />
    </svg>
  )
}

/** pin — material-symbols/push-pin */
export const IconPin = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="m16 12l2 2v2h-5v6l-1 1l-1-1v-6H6v-2l2-2V5H7V3h10v2h-1z" />
    </svg>
  )
}

/** archive — material-symbols/archive */
export const IconArchive = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="m12 18l4-4l-1.4-1.4l-1.6 1.6V10h-2v4.2l-1.6-1.6L8 14zm-7 3q-.825 0-1.412-.587T3 19V6.525q0-.35.113-.675t.337-.6L4.7 3.725q.275-.35.687-.538T6.25 3h11.5q.45 0 .863.188t.687.537l1.25 1.525q.225.275.338.6t.112.675V19q0 .825-.587 1.413T19 21zm.4-15h13.2l-.85-1H6.25z" />
    </svg>
  )
}

/** attach — material-symbols/attach-file */
export const IconAttach = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="M18 15.75q0 2.6-1.825 4.425T11.75 22t-4.425-1.825T5.5 15.75V6.5q0-1.875 1.313-3.187T10 2t3.188 1.313T14.5 6.5v8.75q0 1.15-.8 1.95t-1.95.8t-1.95-.8t-.8-1.95V6h2v9.25q0 .325.213.538t.537.212t.538-.213t.212-.537V6.5q-.025-1.05-.737-1.775T10 4t-1.775.725T7.5 6.5v9.25q-.025 1.775 1.225 3.013T11.75 20q1.75 0 2.975-1.237T16 15.75V6h2z" />
    </svg>
  )
}

/** mic — material-symbols/mic */
export const IconMic = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="M9.875 13.125Q9 12.25 9 11V5q0-1.25.875-2.125T12 2t2.125.875T15 5v6q0 1.25-.875 2.125T12 14t-2.125-.875M11 21v-3.075q-2.6-.35-4.3-2.325T5 11h2q0 2.075 1.463 3.538T12 16t3.538-1.463T17 11h2q0 2.625-1.7 4.6T13 17.925V21z" />
    </svg>
  )
}

/** panel — material-symbols/right-panel-open */
export const IconPanel = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="M11.5 16V8l-4 4zM5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm9-2V5H5v14z" />
    </svg>
  )
}
