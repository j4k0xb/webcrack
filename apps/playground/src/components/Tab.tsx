import { basename } from 'path';

interface Props {
  path: string;
  active?: boolean;
  onClick?: () => void;
  onClose?: () => void;
}

export default function Tab(props: Props) {
  return (
    <label
      class="tab flex-nowrap min-w-[120px] whitespace-nowrap group"
      title={props.path}
      onClick={props.onClick}
    >
      <input type="radio" name="tab" checked={props.active} />
      <span class="max-w-[200px] truncate ml-1">{basename(props.path)}</span>
      <button
        class="btn btn-xs btn-ghost btn-circle ml-auto mr-1.5 translate-x-2! group-hover:visible"
        classList={{ invisible: !props.active }}
        title="Close tab"
        onClick={(e) => {
          e.stopPropagation();
          props.onClose?.();
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          width="12"
          height="12"
          stroke-width="2"
        >
          <path d="M18 6l-12 12"></path>
          <path d="M6 6l12 12"></path>
        </svg>
      </button>
    </label>
  );
}
