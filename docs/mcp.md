# Public MCP integration

`/mcp` serves stateless MCP Streamable HTTP using the official TypeScript SDK. No authentication
is required. `search_drinks` accepts `{ query }` and discovers Drink references without displaying UI.
`show_drinks` accepts `{ slugs, view }` and displays the final selection once. Its `view` is
`summary` for searches/selections or `recipe` for preparation requests.
Model-visible `structuredContent` contains only Drink slugs for follow-up selection. Full Published
recipes go directly to the widget in tool result `_meta`, hidden from the model. Missing and
Unpublished drinks return the same tool error. Website Admin sessions have no effect.
See [OpenAI's tool result visibility contract](https://developers.openai.com/plugins/reference#tool-results).

Only `show_drinks` associates its result with `ui://drinks/card-v6.html`, an MCP Apps resource that
renders the shared Drink summary in a compact layout. It displays one card per selected Published
drink in slug order. The recipe view includes all existing notes/instructions as HTML; the summary
view omits preparation notes. If any selected Drink is missing or Unpublished, the entire display
request fails without returning recipes.

An exact-title search returns only that Drink; other searches retain broad matching. Search never
displays cards. The model is instructed to call `show_drinks` once with the final selected slugs
and view, avoiding a preliminary summary card before a recipe card. Broad searches display all
returned slugs in result order unless the user requests a subset. Empty searches need no display call. See
[OpenAI's decoupled data/render pattern](https://developers.openai.com/plugins/build/chatgpt-ui#decoupled-pattern).

Each card uses its returned photo and ingredient quantities. Below 32rem of available card width,
the photo appears above the recipe; wider cards show them side by side. The layout uses container
width rather than device detection. The summary links to the corresponding details page on the
serving app's origin; links in notes also open through the host. Clients without MCP Apps support
receive Drink references and status text as model-visible content; full recipes remain in `_meta`.

Server instructions and component metadata identify the cards as the complete response, including
preparation requests. They ask the model to stop after displaying cards, without narration, extra
images, recipe previews or follow-up questions. Keeping recipes out of the model transcript reduces
the opportunity for duplicate previews, but cannot enforce source exclusivity in ChatGPT's response.
See OpenAI's [server instructions](https://developers.openai.com/plugins/build/mcp-server#create-the-server)
and [component metadata](https://developers.openai.com/plugins/reference#component-resource-_meta-fields).

Run `pnpm test test/mcp.test.ts test/e2e/mcp-card.test.e2e.ts` for the public HTTP boundary and
private recipe rendering/link navigation. Run `pnpm build:styles` and restart
the server after card changes. Change the resource URI when making breaking UI changes, since hosts
use it as a cache key. See [OpenAI's UI resource guidance](https://developers.openai.com/plugins/build/chatgpt-ui#embed-the-component-in-the-server-response).

## Validate in ChatGPT

Deploy through [the existing release workflow](../RELEASING.md). Then use regular ChatGPT Chat
mode with permission to add custom MCP servers:

1. Add a personal custom MCP server at `https://drinks-dev.fly.dev/mcp`, named `drinks.fyi Dev`,
   with no authentication. Install the resulting integration.
2. Open a new conversation, type `@`, select `drinks.fyi Dev`, and ask for Paper Plane.
3. Check title, exact ingredient quantities, photo, and the conditional calorie display against
   the dev Drink page. Ask how to make it; verify the card displays all existing instructions
   and variations without a separate explanation, unrelated image or source. For a Drink without
   notes, check the card adds no invented instructions. Check there is one recipe card, without a
   separate summary card above it.
4. Search by ingredient (for example, "got any coffee drinks?") and check that the matching Drinks
   appear as cards using their own photos and ingredients. Check multiple matches keep result order
   and empty searches display no cards. Choose a result, then ask a follow-up about the selected
   Drink. Check missing Drinks are reported accurately.
5. At a phone conversation width, check that the photo appears above the recipe with readable
   ingredients and no horizontal overflow. At a wider card width, check the side-by-side layout.
   Tab to the card and activate it with Enter. Check that navigation opens the matching dev details page.
6. Refresh the custom connection after tool or UI changes; repeat affected checks in a new conversation.

Connection and refresh steps follow [OpenAI's connect-and-test guide](https://developers.openai.com/plugins/deploy/connect-chatgpt)
and [quickstart](https://developers.openai.com/plugins/build/app-quickstart#connect-your-mcp-server-in-chatgpt).
Public directory submission and publication are separate work.
