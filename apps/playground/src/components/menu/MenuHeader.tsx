import type { JSX, ParentProps } from 'solid-js';

interface Props {
  title: JSX.Element;
  open?: boolean;
  href?: string;
  onOpen?: () => void;
}

export default function MenuHeader(props: ParentProps<Props>) {
  return (
    <li>
      <details
        open={props.open}
        onToggle={(e) => {
          if (e.currentTarget.open) props.onOpen?.();
        }}
      >
        <summary class="cursor-default">{props.title}</summary>
        <ul class="min-w-52 z-10">{props.children}</ul>
      </details>
    </li>
  );
}
