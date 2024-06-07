import { basename } from 'path';

interface Props {
  path: string;
  active?: boolean;
  onClick?: () => void;
  onClose?: () => void;
}

export default function Tab(props: Props) {
  return (
    <a
      class="tab flex-nowrap min-w-[120px] whitespace-nowrap"
      classList={{ 'tab-active': props.active, 'bg-base-200': !props.active }}
      title={props.path}
      onClick={props.onClick}
    >
      <span class="max-w-[200px] truncate">{basename(props.path)}</span>
      <button
        class="btn btn-xs btn-ghost btn-circle ml-auto !translate-x-2"
        title="Close tab"
        onClick={(e) => {
          e.stopPropagation();
          props.onClose?.();
        }}
      >
        ✕
      </button>
    </a>
  );
}
