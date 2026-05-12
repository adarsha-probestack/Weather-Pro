/**
 * complete_task — Marks a task as done by ID
 *
 * Side effects: writes
 * Implementation hint: Find task by id, set status='done', return updated task or 404
 */
export async function complete_taskHandler(args: { id: string }) {
  // TODO: implement the real logic. The scaffold below returns a
  // placeholder so the server boots and Claude can call it.
  return {
    content: [{ type: "text", text: `TODO: implement complete_task — received ${JSON.stringify(args)}` }],
  };
}
