/**
 * list_tasks — Lists all tasks, optionally filtered by status
 *
 * Side effects: read-only
 * Implementation hint: Return Array<Task>, filtered by status if provided
 */
export async function list_tasksHandler(args: { status?: string }) {
  // TODO: implement the real logic. The scaffold below returns a
  // placeholder so the server boots and Claude can call it.
  return {
    content: [{ type: "text", text: `TODO: implement list_tasks — received ${JSON.stringify(args)}` }],
  };
}
