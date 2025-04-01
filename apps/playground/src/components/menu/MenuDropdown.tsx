import type { JSX, ParentProps } from 'solid-js';

interface Props {
  title: JSX.Element;
}

export default function MenuDropdown(props: ParentProps<Props>) {
  return (
    <li>
      <div class="dropdown dropdown-right dropdown-hover flex">
        <div tabindex="0" role="button">
          {props.title}
        </div>
        <svg
          class="ml-auto"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <path d="M9 6l6 6l-6 6" />
        </svg>
        <ul
          tabindex="0"
          class="dropdown-content z-10 menu ml-0 p-2 shadow-sm bg-base-100 rounded-box -translate-y-4"
        >
          {props.children}
        </ul>
      </div>
    </li>
  );
}
