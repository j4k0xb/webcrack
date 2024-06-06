import type { ParentProps } from 'solid-js';

export default function MenuSetting(props: ParentProps) {
  return (
    <li>
      <label class="flex items-center">{props.children}</label>
    </li>
  );
}
