import { Index } from 'solid-js';

interface Props {
  path: string;
}

export default function Breadcrumbs(props: Props) {
  const parts = () => props.path.replace(/^\.?\//, '').split('/');

  return (
    <div class="text-xs breadcrumbs shrink-0 pl-4 bg-base-100">
      <ul>
        <li>/</li>
        <Index each={parts()}>{(part) => <li>{part()}</li>}</Index>
      </ul>
    </div>
  );
}
