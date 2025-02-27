import { Index, Show, type JSX, type ParentProps } from 'solid-js';

interface Props {
  shortcut?: string[];
  class?: string;
  onClick?: () => void;
}

export default function MenuButton(props: ParentProps<Props>) {
  const onClick: JSX.EventHandler<HTMLLIElement, MouseEvent> = (event) => {
    event.target.closest('details')?.removeAttribute('open');
    props.onClick?.();
  };

  return (
    <li onClick={onClick}>
      <a class={props.class}>
        {props.children}
        <span class="ml-auto">
          <Index each={props.shortcut}>
            {(key, index) => (
              <>
                <Show when={index > 0}>+</Show>
                <kbd class="kbd kbd-xs">{key()}</kbd>
              </>
            )}
          </Index>
        </span>
      </a>
    </li>
  );
}
