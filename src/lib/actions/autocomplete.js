/**
 * Svelte action: inline autocomplete for a text input.
 *
 * Usage:
 *   <input use:autocomplete={{ names: knownNames, onCommit: commitName, onCancel: cancelEdit }} />
 *
 * Behaviour:
 *  - Printable keystrokes: finds the first name in `names` that starts with
 *    what was typed and appends the remainder as a text selection, so the next
 *    keystroke overwrites it.
 *  - Backspace / Delete: clears the suggestion, never autocompletes.
 *  - Enter: calls onCommit().
 *  - Escape: calls onCancel().
 *
 * @param {HTMLInputElement} node
 * @param {{ names: string[], onCommit: () => void, onCancel: () => void }} params
 */
export function autocomplete(node, params) {
  let { names, onCommit, onCancel } = params;

  /** The raw portion the user actually typed (no completion appended). */
  let typedPortion = "";

  /** @param {KeyboardEvent} e */
  function handleKeydown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
    
      // Commit the autocomplete selection
      node.setSelectionRange(node.value.length, node.value.length);
      node.dispatchEvent(new Event("input", { bubbles: true }));
    
      onCommit();
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
      return;
    }

    if (e.key.length === 1 || e.key === "Backspace" || e.key === "Delete") {
      const isErasing = e.key === "Backspace" || e.key === "Delete";

      // Let the browser update the input value first, then run autocomplete.
      requestAnimationFrame(() => {
        if (isErasing) {
          typedPortion = node.value;
          node.setSelectionRange(node.value.length, node.value.length);
          return;
        }

        const cursorPos = node.selectionStart ?? node.value.length;
        const typed = node.value.slice(0, cursorPos);
        typedPortion = typed;

        if (!typed) return;

        const match = names.find((n) =>
          n.toLowerCase().startsWith(typed.toLowerCase()),
        );

        if (match && match.toLowerCase() !== typed.toLowerCase()) {
          // Preserve the user's original casing for the typed part.
          const completion = typed + match.slice(typed.length);
          node.value = completion;
          node.setSelectionRange(typed.length, completion.length);
        } else {
          node.value = typed;
        }
      });
    }
  }

  node.addEventListener("keydown", handleKeydown);

  return {
    /** Called by Svelte when the bound parameters change reactively. */
    update(newParams) {
      names = newParams.names;
      onCommit = newParams.onCommit;
      onCancel = newParams.onCancel;
    },
    destroy() {
      node.removeEventListener("keydown", handleKeydown);
    },
  };
}
