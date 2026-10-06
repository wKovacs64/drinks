import type { Handle } from "remix/component";
import type { DrinkEditor } from "#/app/modules/drinks/drinks.ts";
import type { SessionUser } from "#/app/modules/identity/identity.ts";
import { Document } from "#/app/actions/document.tsx";
import { AdminLayout } from "../layout.tsx";
import { DrinkForm } from "./public/drink-form.tsx";
export function DrinkEditorPage(
  handle: Handle<{
    editor: DrinkEditor;
    user: SessionUser;
    action: string;
    modulePreloads: readonly string[];
  }>,
) {
  return () => {
    const { editor, user, action, modulePreloads } = handle.props;
    return (
      <Document
        title={
          editor.mode === "create"
            ? "New Drink | drinks.fyi"
            : `Edit ${editor.initialValues.title} | drinks.fyi`
        }
        modulePreloads={modulePreloads}
        deferModulePreloads={false}
      >
        <AdminLayout user={user}>
          <div>
            <h1 className="mb-6 text-2xl font-medium text-zinc-200">
              {editor.mode === "create" ? "Add New Drink" : "Edit Drink"}
            </h1>
            <DrinkForm editor={editor} action={action} />
          </div>
        </AdminLayout>
      </Document>
    );
  };
}
