import type { JSX, ParentProps } from 'solid-js';

interface Props {
  title: JSX.Element;
}

export default function MenuDropdown(props: ParentProps<Props>) {
  return (
    <li>
      <div class="dropdown dropdown-right dropdown-hover transform-none">
        <div tabindex="0" role="button">
          {props.title}
        </div>
        <ul
          tabindex="0"
          class="dropdown-content z-10 menu ml-0 p-2 shadow bg-base-100 rounded-box"
        >
          {props.children}
        </ul>
      </div>
    </li>
  );
}
