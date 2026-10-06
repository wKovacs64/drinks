import type { Handle } from "remix/component";
import { routes } from "#/app/routes.ts";
import { Document } from "#/app/actions/document.tsx";
import type { AdminDrinkListItem } from "#/app/modules/drinks/drinks.ts";
import type { SessionUser } from "#/app/modules/identity/identity.ts";
import type { ToastMessage } from "#/app/core/toast.ts";
import { AdminLayout } from "../layout.tsx";
import { AdminDrinksList } from "./public/admin-drinks-list.tsx";
import { Image } from "#/app/ui/images/public/image.tsx";

export function AdminDrinksPage(
  handle: Handle<{
    drinkSummaries: AdminDrinkListItem[];
    user: SessionUser;
    toast?: ToastMessage;
    modulePreloads: readonly string[];
  }>,
) {
  return () => {
    const { drinkSummaries, user, toast, modulePreloads } = handle.props;
    const drinks = drinkSummaries.map((drink) => ({
      ...drink,
      createdAt: drink.createdAt.toISOString(),
      updatedAt: drink.updatedAt.toISOString(),
      presentation: {
        thumbnail: (
          <Image
            src={drink.imageUrl}
            width={32}
            height={32}
            alt=""
            className="rounded object-cover"
          />
        ),
        detailHref: routes.drinks.show.href({ slug: drink.slug }),
        editHref: routes.admin.drinks.edit.index.href({ slug: drink.slug }),
        deleteAction: routes.admin.drinks.deleteDrink.href({ slug: drink.slug }),
      },
    }));

    return (
      <Document
        title="All Drinks | drinks.fyi"
        modulePreloads={modulePreloads}
        deferModulePreloads={false}
      >
        <AdminLayout user={user} toast={toast}>
          <AdminDrinksList drinks={drinks} />
        </AdminLayout>
      </Document>
    );
  };
}
