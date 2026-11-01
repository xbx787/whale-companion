// 由 scripts/gen-icons.mjs 生成，请勿手改。
// 统一 Phosphor Regular 细线图标；颜色跟随 currentColor。
import type { CSSProperties, SVGProps } from 'react'

export type IconProps = SVGProps<SVGSVGElement> & { size?: number; style?: CSSProperties }

function withSize({ size = 18, style, ...rest }: IconProps) {
  return { ...rest, style: { width: size, height: size, flex: 'none', fill: 'currentColor', ...style } }
}

/** home — ph/house */
export const IconHome = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="m219.31 108.68l-80-80a16 16 0 0 0-22.62 0l-80 80A15.87 15.87 0 0 0 32 120v96a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8v-56h32v56a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8v-96a15.87 15.87 0 0 0-4.69-11.32M208 208h-48v-56a8 8 0 0 0-8-8h-48a8 8 0 0 0-8 8v56H48v-88l80-80l80 80Z" />
    </svg>
  )
}

/** settings — ph/gear */
export const IconSettings = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="M128 80a48 48 0 1 0 48 48a48.05 48.05 0 0 0-48-48m0 80a32 32 0 1 1 32-32a32 32 0 0 1-32 32m88-29.84q.06-2.16 0-4.32l14.92-18.64a8 8 0 0 0 1.48-7.06a107.2 107.2 0 0 0-10.88-26.25a8 8 0 0 0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186 40.54a8 8 0 0 0-3.94-6a107.7 107.7 0 0 0-26.25-10.87a8 8 0 0 0-7.06 1.49L130.16 40h-4.32L107.2 25.11a8 8 0 0 0-7.06-1.48a107.6 107.6 0 0 0-26.25 10.88a8 8 0 0 0-3.93 6l-2.64 23.76q-1.56 1.49-3 3L40.54 70a8 8 0 0 0-6 3.94a107.7 107.7 0 0 0-10.87 26.25a8 8 0 0 0 1.49 7.06L40 125.84v4.32L25.11 148.8a8 8 0 0 0-1.48 7.06a107.2 107.2 0 0 0 10.88 26.25a8 8 0 0 0 6 3.93l23.72 2.64q1.49 1.56 3 3L70 215.46a8 8 0 0 0 3.94 6a107.7 107.7 0 0 0 26.25 10.87a8 8 0 0 0 7.06-1.49L125.84 216q2.16.06 4.32 0l18.64 14.92a8 8 0 0 0 7.06 1.48a107.2 107.2 0 0 0 26.25-10.88a8 8 0 0 0 3.93-6l2.64-23.72q1.56-1.48 3-3l23.78-2.8a8 8 0 0 0 6-3.94a107.7 107.7 0 0 0 10.87-26.25a8 8 0 0 0-1.49-7.06Zm-16.1-6.5a74 74 0 0 1 0 8.68a8 8 0 0 0 1.74 5.48l14.19 17.73a91.6 91.6 0 0 1-6.23 15l-22.6 2.56a8 8 0 0 0-5.1 2.64a74 74 0 0 1-6.14 6.14a8 8 0 0 0-2.64 5.1l-2.51 22.58a91.3 91.3 0 0 1-15 6.23l-17.74-14.19a8 8 0 0 0-5-1.75h-.48a74 74 0 0 1-8.68 0a8 8 0 0 0-5.48 1.74l-17.78 14.2a91.6 91.6 0 0 1-15-6.23L82.89 187a8 8 0 0 0-2.64-5.1a74 74 0 0 1-6.14-6.14a8 8 0 0 0-5.1-2.64l-22.58-2.52a91.3 91.3 0 0 1-6.23-15l14.19-17.74a8 8 0 0 0 1.74-5.48a74 74 0 0 1 0-8.68a8 8 0 0 0-1.74-5.48L40.2 100.45a91.6 91.6 0 0 1 6.23-15L69 82.89a8 8 0 0 0 5.1-2.64a74 74 0 0 1 6.14-6.14A8 8 0 0 0 82.89 69l2.51-22.57a91.3 91.3 0 0 1 15-6.23l17.74 14.19a8 8 0 0 0 5.48 1.74a74 74 0 0 1 8.68 0a8 8 0 0 0 5.48-1.74l17.77-14.19a91.6 91.6 0 0 1 15 6.23L173.11 69a8 8 0 0 0 2.64 5.1a74 74 0 0 1 6.14 6.14a8 8 0 0 0 5.1 2.64l22.58 2.51a91.3 91.3 0 0 1 6.23 15l-14.19 17.74a8 8 0 0 0-1.74 5.53Z" />
    </svg>
  )
}

/** folder — ph/folder */
export const IconFolder = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="M216 72h-84.69L104 44.69A15.86 15.86 0 0 0 92.69 40H40a16 16 0 0 0-16 16v144.62A15.4 15.4 0 0 0 39.38 216h177.51A15.13 15.13 0 0 0 232 200.89V88a16 16 0 0 0-16-16M40 56h52.69l16 16H40Zm176 144H40V88h176Z" />
    </svg>
  )
}

/** file — ph/file */
export const IconFile = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="m213.66 82.34l-56-56A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v176a16 16 0 0 0 16 16h144a16 16 0 0 0 16-16V88a8 8 0 0 0-2.34-5.66M160 51.31L188.69 80H160ZM200 216H56V40h88v48a8 8 0 0 0 8 8h48z" />
    </svg>
  )
}

/** search — ph/magnifying-glass */
export const IconSearch = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="m229.66 218.34l-50.07-50.06a88.11 88.11 0 1 0-11.31 11.31l50.06 50.07a8 8 0 0 0 11.32-11.32M40 112a72 72 0 1 1 72 72a72.08 72.08 0 0 1-72-72" />
    </svg>
  )
}

/** user — ph/user */
export const IconUser = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="M230.92 212c-15.23-26.33-38.7-45.21-66.09-54.16a72 72 0 1 0-73.66 0c-27.39 8.94-50.86 27.82-66.09 54.16a8 8 0 1 0 13.85 8c18.84-32.56 52.14-52 89.07-52s70.23 19.44 89.07 52a8 8 0 1 0 13.85-8M72 96a56 56 0 1 1 56 56a56.06 56.06 0 0 1-56-56" />
    </svg>
  )
}

/** chat — ph/chat-circle */
export const IconChat = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="M128 24a104 104 0 0 0-91.82 152.88l-11.35 34.05a16 16 0 0 0 20.24 20.24l34.05-11.35A104 104 0 1 0 128 24m0 192a87.87 87.87 0 0 1-44.06-11.81a8 8 0 0 0-6.54-.67L40 216l12.47-37.4a8 8 0 0 0-.66-6.54A88 88 0 1 1 128 216" />
    </svg>
  )
}

/** send — ph/paper-plane-tilt */
export const IconSend = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="M227.32 28.68a16 16 0 0 0-15.66-4.08h-.15L19.57 82.84a16 16 0 0 0-2.49 29.8L102 154l41.3 84.87a15.86 15.86 0 0 0 14.44 9.13q.69 0 1.38-.06a15.88 15.88 0 0 0 14-11.51l58.2-191.94v-.15a16 16 0 0 0-4-15.66m-69.49 203.17l-.05.14v-.07l-40.06-82.3l48-48a8 8 0 0 0-11.31-11.31l-48 48l-82.33-40.06h-.07h.14L216 40Z" />
    </svg>
  )
}

/** play — ph/play */
export const IconPlay = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="M232.4 114.49L88.32 26.35a16 16 0 0 0-16.2-.3A15.86 15.86 0 0 0 64 39.87v176.26A15.94 15.94 0 0 0 80 232a16.07 16.07 0 0 0 8.36-2.35l144.04-88.14a15.81 15.81 0 0 0 0-27ZM80 215.94V40l143.83 88Z" />
    </svg>
  )
}

/** stop — ph/stop */
export const IconStop = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="M200 40H56a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h144a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16m0 160H56V56h144z" />
    </svg>
  )
}

/** plus — ph/plus */
export const IconPlus = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="M224 128a8 8 0 0 1-8 8h-80v80a8 8 0 0 1-16 0v-80H40a8 8 0 0 1 0-16h80V40a8 8 0 0 1 16 0v80h80a8 8 0 0 1 8 8" />
    </svg>
  )
}

/** close — ph/x */
export const IconClose = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128L50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z" />
    </svg>
  )
}

/** chevronDown — ph/caret-down */
export const IconChevronDown = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="m213.66 101.66l-80 80a8 8 0 0 1-11.32 0l-80-80a8 8 0 0 1 11.32-11.32L128 164.69l74.34-74.35a8 8 0 0 1 11.32 11.32" />
    </svg>
  )
}

/** chevronRight — ph/caret-right */
export const IconChevronRight = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="m181.66 133.66l-80 80a8 8 0 0 1-11.32-11.32L164.69 128L90.34 53.66a8 8 0 0 1 11.32-11.32l80 80a8 8 0 0 1 0 11.32" />
    </svg>
  )
}

/** more — ph/dots-three */
export const IconMore = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="M140 128a12 12 0 1 1-12-12a12 12 0 0 1 12 12m56-12a12 12 0 1 0 12 12a12 12 0 0 0-12-12m-136 0a12 12 0 1 0 12 12a12 12 0 0 0-12-12" />
    </svg>
  )
}

/** refresh — ph/arrows-clockwise */
export const IconRefresh = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="M224 48v48a8 8 0 0 1-8 8h-48a8 8 0 0 1 0-16h28.69l-14.63-14.63a79.56 79.56 0 0 0-56.13-23.43h-.45a79.52 79.52 0 0 0-55.89 22.77a8 8 0 0 1-11.18-11.44a96 96 0 0 1 135 .79L208 76.69V48a8 8 0 0 1 16 0m-37.59 135.29a80 80 0 0 1-112.47-.66L59.31 168H88a8 8 0 0 0 0-16H40a8 8 0 0 0-8 8v48a8 8 0 0 0 16 0v-28.69l14.63 14.63A95.43 95.43 0 0 0 130 222.06h.53a95.36 95.36 0 0 0 67.07-27.33a8 8 0 0 0-11.18-11.44Z" />
    </svg>
  )
}

/** copy — ph/copy */
export const IconCopy = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="M216 32H88a8 8 0 0 0-8 8v40H40a8 8 0 0 0-8 8v128a8 8 0 0 0 8 8h128a8 8 0 0 0 8-8v-40h40a8 8 0 0 0 8-8V40a8 8 0 0 0-8-8m-56 176H48V96h112Zm48-48h-32V88a8 8 0 0 0-8-8H96V48h112Z" />
    </svg>
  )
}

/** check — ph/check */
export const IconCheck = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="m229.66 77.66l-128 128a8 8 0 0 1-11.32 0l-56-56a8 8 0 0 1 11.32-11.32L96 188.69L218.34 66.34a8 8 0 0 1 11.32 11.32" />
    </svg>
  )
}

/** warning — ph/warning */
export const IconWarning = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="M236.8 188.09L149.35 36.22a24.76 24.76 0 0 0-42.7 0L19.2 188.09a23.51 23.51 0 0 0 0 23.72A24.35 24.35 0 0 0 40.55 224h174.9a24.35 24.35 0 0 0 21.33-12.19a23.51 23.51 0 0 0 .02-23.72m-13.87 15.71a8.5 8.5 0 0 1-7.48 4.2H40.55a8.5 8.5 0 0 1-7.48-4.2a7.59 7.59 0 0 1 0-7.72l87.45-151.87a8.75 8.75 0 0 1 15 0l87.45 151.87a7.59 7.59 0 0 1-.04 7.72M120 144v-40a8 8 0 0 1 16 0v40a8 8 0 0 1-16 0m20 36a12 12 0 1 1-12-12a12 12 0 0 1 12 12" />
    </svg>
  )
}

/** trash — ph/trash */
export const IconTrash = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="M216 48h-40v-8a24 24 0 0 0-24-24h-48a24 24 0 0 0-24 24v8H40a8 8 0 0 0 0 16h8v144a16 16 0 0 0 16 16h128a16 16 0 0 0 16-16V64h8a8 8 0 0 0 0-16M96 40a8 8 0 0 1 8-8h48a8 8 0 0 1 8 8v8H96Zm96 168H64V64h128Zm-80-104v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0m48 0v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0" />
    </svg>
  )
}

/** edit — ph/pencil-simple */
export const IconEdit = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="m227.31 73.37l-44.68-44.69a16 16 0 0 0-22.63 0L36.69 152A15.86 15.86 0 0 0 32 163.31V208a16 16 0 0 0 16 16h44.69a15.86 15.86 0 0 0 11.31-4.69L227.31 96a16 16 0 0 0 0-22.63M92.69 208H48v-44.69l88-88L180.69 120ZM192 108.68L147.31 64l24-24L216 84.68Z" />
    </svg>
  )
}

/** pin — ph/push-pin */
export const IconPin = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="m235.32 81.37l-60.69-60.68a16 16 0 0 0-22.63 0l-53.63 53.8c-10.66-3.34-35-7.37-60.4 13.14a16 16 0 0 0-1.29 23.78L85 159.71l-42.66 42.63a8 8 0 0 0 11.32 11.32L96.29 171l48.29 48.29A16 16 0 0 0 155.9 224h1.13a15.93 15.93 0 0 0 11.64-6.33c19.64-26.1 17.75-47.32 13.19-60L235.33 104a16 16 0 0 0-.01-22.63M224 92.69l-57.27 57.46a8 8 0 0 0-1.49 9.22c9.46 18.93-1.8 38.59-9.34 48.62L48 100.08c12.08-9.74 23.64-12.31 32.48-12.31A40.1 40.1 0 0 1 96.81 91a8 8 0 0 0 9.25-1.51L163.32 32L224 92.68Z" />
    </svg>
  )
}

/** pinFill — ph/push-pin-fill */
export const IconPinFill = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="m235.33 104l-53.47 53.65c4.56 12.67 6.45 33.89-13.19 60A15.93 15.93 0 0 1 157 224h-1.13a16 16 0 0 1-11.32-4.69L96.29 171l-42.63 42.66a8 8 0 0 1-11.32-11.32L85 159.71l-48.3-48.3A16 16 0 0 1 38 87.63c25.42-20.51 49.75-16.48 60.4-13.14L152 20.7a16 16 0 0 1 22.63 0l60.69 60.68a16 16 0 0 1 .01 22.62" />
    </svg>
  )
}

/** archive — ph/archive */
export const IconArchive = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="M224 48H32a16 16 0 0 0-16 16v24a16 16 0 0 0 16 16v88a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16v-88a16 16 0 0 0 16-16V64a16 16 0 0 0-16-16m-16 144H48v-88h160Zm16-104H32V64h192zM96 136a8 8 0 0 1 8-8h48a8 8 0 0 1 0 16h-48a8 8 0 0 1-8-8" />
    </svg>
  )
}

/** attach — ph/paperclip */
export const IconAttach = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="M209.66 122.34a8 8 0 0 1 0 11.32l-82.05 82a56 56 0 0 1-79.2-79.21l99.26-100.72a40 40 0 1 1 56.61 56.55L105 193a24 24 0 1 1-34-34l83.3-84.62a8 8 0 1 1 11.4 11.22l-83.31 84.71a8 8 0 1 0 11.27 11.36L192.93 81A24 24 0 1 0 159 47L59.76 147.68a40 40 0 1 0 56.53 56.62l82.06-82a8 8 0 0 1 11.31.04" />
    </svg>
  )
}

/** mic — ph/microphone */
export const IconMic = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="M128 176a48.05 48.05 0 0 0 48-48V64a48 48 0 0 0-96 0v64a48.05 48.05 0 0 0 48 48M96 64a32 32 0 0 1 64 0v64a32 32 0 0 1-64 0Zm40 143.6V240a8 8 0 0 1-16 0v-32.4A80.11 80.11 0 0 1 48 128a8 8 0 0 1 16 0a64 64 0 0 0 128 0a8 8 0 0 1 16 0a80.11 80.11 0 0 1-72 79.6" />
    </svg>
  )
}

/** panel — ph/sidebar-simple */
export const IconPanel = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="M216 40H40a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16M40 56h40v144H40Zm176 144H96V56h120z" />
    </svg>
  )
}

/** target — ph/target */
export const IconTarget = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="M221.87 83.16A104.1 104.1 0 1 1 195.67 49l22.67-22.68a8 8 0 0 1 11.32 11.32l-96 96a8 8 0 0 1-11.32-11.32l27.72-27.72a40 40 0 1 0 17.87 31.09a8 8 0 1 1 16-.9a56 56 0 1 1-22.38-41.65l22.75-22.75a87.88 87.88 0 1 0 23.13 29.67a8 8 0 0 1 14.44-6.9" />
    </svg>
  )
}

/** checklist — ph/list-checks */
export const IconChecklist = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="M224 128a8 8 0 0 1-8 8h-88a8 8 0 0 1 0-16h88a8 8 0 0 1 8 8m-96-56h88a8 8 0 0 0 0-16h-88a8 8 0 0 0 0 16m88 112h-88a8 8 0 0 0 0 16h88a8 8 0 0 0 0-16M82.34 42.34L56 68.69L45.66 58.34a8 8 0 0 0-11.32 11.32l16 16a8 8 0 0 0 11.32 0l32-32a8 8 0 0 0-11.32-11.32m0 64L56 132.69l-10.34-10.35a8 8 0 0 0-11.32 11.32l16 16a8 8 0 0 0 11.32 0l32-32a8 8 0 0 0-11.32-11.32m0 64L56 196.69l-10.34-10.35a8 8 0 0 0-11.32 11.32l16 16a8 8 0 0 0 11.32 0l32-32a8 8 0 0 0-11.32-11.32" />
    </svg>
  )
}

/** language — ph/globe */
export const IconLanguage = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="M128 24a104 104 0 1 0 104 104A104.12 104.12 0 0 0 128 24m88 104a87.6 87.6 0 0 1-3.33 24h-38.51a157.4 157.4 0 0 0 0-48h38.51a87.6 87.6 0 0 1 3.33 24m-114 40h52a115.1 115.1 0 0 1-26 45a115.3 115.3 0 0 1-26-45m-3.9-16a140.8 140.8 0 0 1 0-48h59.88a140.8 140.8 0 0 1 0 48ZM40 128a87.6 87.6 0 0 1 3.33-24h38.51a157.4 157.4 0 0 0 0 48H43.33A87.6 87.6 0 0 1 40 128m114-40h-52a115.1 115.1 0 0 1 26-45a115.3 115.3 0 0 1 26 45m52.33 0h-35.62a135.3 135.3 0 0 0-22.3-45.6A88.29 88.29 0 0 1 206.37 88Zm-98.74-45.6A135.3 135.3 0 0 0 85.29 88H49.63a88.29 88.29 0 0 1 57.96-45.6M49.63 168h35.66a135.3 135.3 0 0 0 22.3 45.6A88.29 88.29 0 0 1 49.63 168m98.78 45.6a135.3 135.3 0 0 0 22.3-45.6h35.66a88.29 88.29 0 0 1-57.96 45.6" />
    </svg>
  )
}

/** dragIndicator — ph/dots-six-vertical */
export const IconDragIndicator = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="M104 60a12 12 0 1 1-12-12a12 12 0 0 1 12 12m60 12a12 12 0 1 0-12-12a12 12 0 0 0 12 12m-72 44a12 12 0 1 0 12 12a12 12 0 0 0-12-12m72 0a12 12 0 1 0 12 12a12 12 0 0 0-12-12m-72 68a12 12 0 1 0 12 12a12 12 0 0 0-12-12m72 0a12 12 0 1 0 12 12a12 12 0 0 0-12-12" />
    </svg>
  )
}

/** keyboardReturn — ph/arrow-elbow-down-left */
export const IconKeyboardReturn = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="M200 32v144a8 8 0 0 1-8 8H67.31l34.35 34.34a8 8 0 0 1-11.32 11.32l-48-48a8 8 0 0 1 0-11.32l48-48a8 8 0 0 1 11.32 11.32L67.31 168H184V32a8 8 0 0 1 16 0" />
    </svg>
  )
}

/** tune — ph/sliders */
export const IconTune = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="M64 105V40a8 8 0 0 0-16 0v65a32 32 0 0 0 0 62v49a8 8 0 0 0 16 0v-49a32 32 0 0 0 0-62m-8 47a16 16 0 1 1 16-16a16 16 0 0 1-16 16m80-95V40a8 8 0 0 0-16 0v17a32 32 0 0 0 0 62v97a8 8 0 0 0 16 0v-97a32 32 0 0 0 0-62m-8 47a16 16 0 1 1 16-16a16 16 0 0 1-16 16m104 64a32.06 32.06 0 0 0-24-31V40a8 8 0 0 0-16 0v97a32 32 0 0 0 0 62v17a8 8 0 0 0 16 0v-17a32.06 32.06 0 0 0 24-31m-32 16a16 16 0 1 1 16-16a16 16 0 0 1-16 16" />
    </svg>
  )
}

/** checkBox — ph/check-square */
export const IconCheckBox = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="M173.66 98.34a8 8 0 0 1 0 11.32l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 0M224 48v160a16 16 0 0 1-16 16H48a16 16 0 0 1-16-16V48a16 16 0 0 1 16-16h160a16 16 0 0 1 16 16m-16 160V48H48v160z" />
    </svg>
  )
}

/** download — ph/download */
export const IconDownload = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="M240 136v64a16 16 0 0 1-16 16H32a16 16 0 0 1-16-16v-64a16 16 0 0 1 16-16h40a8 8 0 0 1 0 16H32v64h192v-64h-40a8 8 0 0 1 0-16h40a16 16 0 0 1 16 16m-117.66-2.34a8 8 0 0 0 11.32 0l48-48a8 8 0 0 0-11.32-11.32L136 108.69V24a8 8 0 0 0-16 0v84.69L85.66 74.34a8 8 0 0 0-11.32 11.32ZM200 168a12 12 0 1 0-12 12a12 12 0 0 0 12-12" />
    </svg>
  )
}

/** upload — ph/upload */
export const IconUpload = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="M240 136v64a16 16 0 0 1-16 16H32a16 16 0 0 1-16-16v-64a16 16 0 0 1 16-16h48a8 8 0 0 1 0 16H32v64h192v-64h-48a8 8 0 0 1 0-16h48a16 16 0 0 1 16 16M85.66 77.66L120 43.31V128a8 8 0 0 0 16 0V43.31l34.34 34.35a8 8 0 0 0 11.32-11.32l-48-48a8 8 0 0 0-11.32 0l-48 48a8 8 0 0 0 11.32 11.32M200 168a12 12 0 1 0-12 12a12 12 0 0 0 12-12" />
    </svg>
  )
}

/** panTool — ph/hand */
export const IconPanTool = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="M188 48a27.75 27.75 0 0 0-12 2.71V44a28 28 0 0 0-54.65-8.6A28 28 0 0 0 80 60v64l-3.82-6.13a28 28 0 0 0-48.6 27.82c16 33.77 28.93 57.72 43.72 72.69C86.24 233.54 103.2 240 128 240a88.1 88.1 0 0 0 88-88V76a28 28 0 0 0-28-28m12 104a72.08 72.08 0 0 1-72 72c-20.38 0-33.51-4.88-45.33-16.85C69.44 193.74 57.26 171 41.9 138.58a6 6 0 0 0-.3-.58a12 12 0 0 1 20.79-12a2 2 0 0 0 .14.23l18.67 30A8 8 0 0 0 96 152V60a12 12 0 0 1 24 0v60a8 8 0 0 0 16 0V44a12 12 0 0 1 24 0v76a8 8 0 0 0 16 0V76a12 12 0 0 1 24 0Z" />
    </svg>
  )
}

/** verifiedUser — ph/shield-check */
export const IconVerifiedUser = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="M208 40H48a16 16 0 0 0-16 16v56c0 52.72 25.52 84.67 46.93 102.19c23.06 18.86 46 25.26 47 25.53a8 8 0 0 0 4.2 0c1-.27 23.91-6.67 47-25.53C198.48 196.67 224 164.72 224 112V56a16 16 0 0 0-16-16m0 72c0 37.07-13.66 67.16-40.6 89.42a129.3 129.3 0 0 1-39.4 22.2a128.3 128.3 0 0 1-38.92-21.81C61.82 179.51 48 149.3 48 112V56h160ZM82.34 141.66a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 11.32l-56 56a8 8 0 0 1-11.32 0Z" />
    </svg>
  )
}

/** hexagon — ph/hexagon */
export const IconHexagon = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="m223.68 66.15l-88-48.15a15.88 15.88 0 0 0-15.36 0l-88 48.17a16 16 0 0 0-8.32 14v95.64a16 16 0 0 0 8.32 14l88 48.17a15.88 15.88 0 0 0 15.36 0l88-48.17a16 16 0 0 0 8.32-14V80.18a16 16 0 0 0-8.32-14.03M216 175.82L128 224l-88-48.18V80.18L128 32l88 48.17Z" />
    </svg>
  )
}

/** sparkle — ph/sparkle */
export const IconSparkle = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="M197.58 129.06L146 110l-19-51.62a15.92 15.92 0 0 0-29.88 0L78 110l-51.62 19a15.92 15.92 0 0 0 0 29.88L78 178l19 51.62a15.92 15.92 0 0 0 29.88 0L146 178l51.62-19a15.92 15.92 0 0 0 0-29.88ZM137 164.22a8 8 0 0 0-4.74 4.74L112 223.85L91.78 169a8 8 0 0 0-4.78-4.78L32.15 144L87 123.78a8 8 0 0 0 4.78-4.78L112 64.15L132.22 119a8 8 0 0 0 4.74 4.74L191.85 144ZM144 40a8 8 0 0 1 8-8h16V16a8 8 0 0 1 16 0v16h16a8 8 0 0 1 0 16h-16v16a8 8 0 0 1-16 0V48h-16a8 8 0 0 1-8-8m104 48a8 8 0 0 1-8 8h-8v8a8 8 0 0 1-16 0v-8h-8a8 8 0 0 1 0-16h8v-8a8 8 0 0 1 16 0v8h8a8 8 0 0 1 8 8" />
    </svg>
  )
}

/** arrowRight — ph/arrow-fat-right */
export const IconArrowRight = (props: IconProps) => {
  const sized = withSize(props)
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" {...sized}>
      <path d="m237.66 122.34l-96-96A8 8 0 0 0 128 32v40H48a16 16 0 0 0-16 16v80a16 16 0 0 0 16 16h80v40a8 8 0 0 0 13.66 5.66l96-96a8 8 0 0 0 0-11.32M144 204.69V176a8 8 0 0 0-8-8H48V88h88a8 8 0 0 0 8-8V51.31L220.69 128Z" />
    </svg>
  )
}
