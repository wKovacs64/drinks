# Public MCP integration

`/mcp` serves stateless MCP Streamable HTTP using the official TypeScript SDK. No authentication
is required. `search_drinks` accepts `{ query }` and returns Published drink summaries with stable
slugs. `get_drink` accepts `{ slug }` and returns ingredient quantities, calories, absolute image
and source URLs, and full existing notes/instructions as HTML. Missing and Unpublished drinks return
the same tool error. Website Admin sessions have no effect.

`get_drink` associates its result with `ui://drinks/card-v1.html`, an MCP Apps resource that renders
the shared Drink summary in a compact layout. The card links to the corresponding details page on
the serving app's origin. Clients without MCP Apps support still receive the complete recipe.

Run `pnpm test test/mcp.test.ts` for the public HTTP boundary. Run `pnpm build:styles` and restart
the server after card changes. Change the resource URI when making breaking UI changes, since hosts
use it as a cache key. See [OpenAI's UI resource guidance](https://developers.openai.com/plugins/build/chatgpt-ui#embed-the-component-in-the-server-response).

## Validate in ChatGPT

Deploy through [the existing release workflow](../RELEASING.md). Then use regular ChatGPT Chat
mode with permission to add custom MCP servers:

1. Add a personal custom MCP server at `https://drinks-dev.fly.dev/mcp`, named `drinks.fyi Dev`,
   with no authentication. Install the resulting integration.
2. Open a new conversation, type `@`, select `drinks.fyi Dev`, and ask for Paper Plane.
3. Check title, exact ingredient quantities, photo, and the conditional calorie display against
   the dev Drink page. Ask how to make it; verify the answer uses the complete existing instructions.
4. Search by ingredient, choose a result, then ask a follow-up about the selected Drink. Check empty
   searches and missing Drinks are reported accurately.
5. At a narrow conversation width, check readable ingredients and no horizontal overflow. Tab to
   the card and activate it with Enter. Check that navigation opens the matching dev details page.
6. Refresh the custom connection after tool or UI changes; repeat affected checks in a new conversation.

Connection and refresh steps follow [OpenAI's connect-and-test guide](https://developers.openai.com/plugins/deploy/connect-chatgpt)
and [quickstart](https://developers.openai.com/plugins/build/app-quickstart#connect-your-mcp-server-in-chatgpt).
Public directory submission and publication are separate work.
