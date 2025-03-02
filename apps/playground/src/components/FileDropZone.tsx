import { createSignal, onCleanup, onMount, Show } from 'solid-js';

interface Props {
  onDrop: (files: { name: string; content: string }[]) => void;
}

export default function FileDropZone(props: Props) {
  const [isDragging, setIsDragging] = createSignal(false);

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent) {
    if (event.relatedTarget === null) setIsDragging(false);
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer?.files.length) {
      Promise.all(
        Array.from(event.dataTransfer.files, async (file) => {
          const content = await file.text();
          return { name: file.name, content };
        }),
      )
        .then(props.onDrop)
        .catch(console.error);
    }
  }

  onMount(() => {
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);
  });

  onCleanup(() => {
    document.removeEventListener('dragover', handleDragOver);
    document.removeEventListener('dragleave', handleDragLeave);
    document.removeEventListener('drop', handleDrop);
  });

  return (
    <div
      class={`fixed inset-0 flex items-center justify-center transition-all pointer-events-none ${
        isDragging() ? 'bg-black/30' : 'bg-transparent'
      }`}
    >
      <Show when={isDragging()}>
        <div class="absolute inset-0 flex items-center justify-center border-4 border-dashed border-primary bg-base-300/50 rounded-lg">
          <p class="text-2xl text-primary font-semibold">Drop Files Here</p>
        </div>
      </Show>
    </div>
  );
}
