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

/** target — material-symbols/target */
export const IconTarget = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="M8.1 21.213q-1.825-.788-3.175-2.138T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22t-3.9-.788m9.575-3.537Q20 15.35 20 12t-2.325-5.675T12 4T6.325 6.325T4 12t2.325 5.675T12 20t5.675-2.325M7.75 16.25Q6 14.5 6 12t1.75-4.25T12 6t4.25 1.75T18 12t-1.75 4.25T12 18t-4.25-1.75m7.075-1.425Q16 13.65 16 12t-1.175-2.825T12 8T9.175 9.175T8 12t1.175 2.825T12 16t2.825-1.175m-4.237-1.412Q10 12.825 10 12t.588-1.412T12 10t1.413.588T14 12t-.587 1.413T12 14t-1.412-.587" />
    </svg>
  )
}

/** checklist — material-symbols/checklist */
export const IconChecklist = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="M5.55 19L2 15.45l1.4-1.4l2.125 2.125l4.25-4.25l1.4 1.425zm0-8L2 7.45l1.4-1.4l2.125 2.125l4.25-4.25l1.4 1.425zM13 17v-2h9v2zm0-8V7h9v2z" />
    </svg>
  )
}

/** language — material-symbols/language */
export const IconLanguage = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="M8.125 21.213q-1.825-.788-3.187-2.15t-2.15-3.188T2 11.988t.788-3.875t2.15-3.175t3.187-2.15T12.013 2t3.875.788t3.175 2.15t2.15 3.175t.787 3.875t-.787 3.887t-2.15 3.188t-3.175 2.15t-3.875.787t-3.888-.787M12 19.95q.65-.9 1.125-1.875T13.9 16h-3.8q.3 1.1.775 2.075T12 19.95m-2.6-.4q-.45-.825-.787-1.713T8.05 16H5.1q.725 1.25 1.813 2.175T9.4 19.55m5.2 0q1.4-.45 2.488-1.375T18.9 16h-2.95q-.225.95-.562 1.838T14.6 19.55M4.25 14h3.4q-.075-.5-.112-.987T7.5 12t.038-1.012T7.65 10h-3.4q-.125.5-.187.988T4 12t.063 1.013t.187.987m5.4 0h4.7q.075-.5.113-.987T14.5 12t-.038-1.012T14.35 10h-4.7q-.075.5-.112.988T9.5 12t.038 1.013t.112.987m6.7 0h3.4q.125-.5.188-.987T20 12t-.062-1.012T19.75 10h-3.4q.075.5.113.988T16.5 12t-.038 1.013t-.112.987m-.4-6h2.95q-.725-1.25-1.812-2.175T14.6 4.45q.45.825.788 1.713T15.95 8M10.1 8h3.8q-.3-1.1-.775-2.075T12 4.05q-.65.9-1.125 1.875T10.1 8m-5 0h2.95q.225-.95.563-1.838T9.4 4.45Q8 4.9 6.912 5.825T5.1 8" />
    </svg>
  )
}

/** dragIndicator — material-symbols/drag-indicator */
export const IconDragIndicator = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="M9 20q-.825 0-1.412-.587T7 18t.588-1.412T9 16t1.413.588T11 18t-.587 1.413T9 20m6 0q-.825 0-1.412-.587T13 18t.588-1.412T15 16t1.413.588T17 18t-.587 1.413T15 20m-6-6q-.825 0-1.412-.587T7 12t.588-1.412T9 10t1.413.588T11 12t-.587 1.413T9 14m6 0q-.825 0-1.412-.587T13 12t.588-1.412T15 10t1.413.588T17 12t-.587 1.413T15 14M9 8q-.825 0-1.412-.587T7 6t.588-1.412T9 4t1.413.588T11 6t-.587 1.413T9 8m6 0q-.825 0-1.412-.587T13 6t.588-1.412T15 4t1.413.588T17 6t-.587 1.413T15 8" />
    </svg>
  )
}

/** keyboardReturn — material-symbols/keyboard-return */
export const IconKeyboardReturn = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="m9 18l-6-6l6-6l1.4 1.4L6.8 11H19V7h2v6H6.8l3.6 3.6z" />
    </svg>
  )
}

/** tune — material-symbols/tune */
export const IconTune = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="M11 21v-6h2v2h8v2h-8v2zm-8-2v-2h6v2zm4-4v-2H3v-2h4V9h2v6zm4-2v-2h10v2zm4-4V3h2v2h4v2h-4v2zM3 7V5h10v2z" />
    </svg>
  )
}

/** checkBox — material-symbols/check-box */
export const IconCheckBox = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="m10.6 16.2l7.05-7.05l-1.4-1.4l-5.65 5.65l-2.85-2.85l-1.4 1.4zM5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21z" />
    </svg>
  )
}

/** download — material-symbols/download */
export const IconDownload = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="m12 16l-5-5l1.4-1.45l2.6 2.6V4h2v8.15l2.6-2.6L17 11zm-6 4q-.825 0-1.412-.587T4 18v-3h2v3h12v-3h2v3q0 .825-.587 1.413T18 20z" />
    </svg>
  )
}

/** upload — material-symbols/upload */
export const IconUpload = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="M11 16V7.85l-2.6 2.6L7 9l5-5l5 5l-1.4 1.45l-2.6-2.6V16zm-5 4q-.825 0-1.412-.587T4 18v-3h2v3h12v-3h2v3q0 .825-.587 1.413T18 20z" />
    </svg>
  )
}

/** panTool — material-symbols/pan-tool */
export const IconPanTool = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="M10.05 23q-.75 0-1.4-.337T7.575 21.7L1.2 12.375l.6-.575q.475-.475 1.125-.55t1.175.3L7 13.575V4q0-.425.288-.712T8 3t.713.288T9 4v8h2V2q0-.425.288-.712T12 1t.713.288T13 2v10h2V3q0-.425.288-.712T16 2t.713.288T17 3v9h2V5q0-.425.288-.712T20 4t.713.288T21 5v14q0 1.65-1.175 2.825T17 23z" />
    </svg>
  )
}

/** verifiedUser — material-symbols/verified-user */
export const IconVerifiedUser = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="M10.95 15.55L16.6 9.9l-1.425-1.425L10.95 12.7l-2.1-2.1l-1.425 1.425zM12 22q-3.475-.875-5.737-3.988T4 11.1V5l8-3l8 3v6.1q0 3.8-2.262 6.913T12 22" />
    </svg>
  )
}

/** hexagon — material-symbols/hexagon */
export const IconHexagon = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...sized}>
      <path d="m6.8 21l-5.2-9l5.2-9h10.4l5.2 9l-5.2 9z" />
    </svg>
  )
}
