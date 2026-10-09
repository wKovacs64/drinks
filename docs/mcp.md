# Public MCP integration

`/mcp` serves stateless MCP Streamable HTTP using the official TypeScript SDK. No authentication
is required. `search_drinks` accepts `{ query }` and returns Published drink summaries with stable
slugs. `get_drink` accepts `{ slug }` and returns ingredient quantities, calories, absolute image
and source URLs, and full existing notes/instructions as HTML. Missing and Unpublished drinks return
the same tool error. Website Admin sessions have no effect.

Both tools associate their results with `ui://drinks/card-v3.html`, an MCP Apps resource that renders
the shared Drink summary in a compact layout. Search displays one card per Published drink in result
order; an empty search displays no cards. Retrieval displays the selected Drink. Each card uses its
returned photo and ingredient quantities. Below 32rem of available card width, the photo appears
above the recipe; wider cards show them side by side. The layout uses container width rather than
device detection. The card links to the corresponding details page on the serving app's origin.
Clients without MCP Apps support still receive the complete recipe.

Server instructions guide recipe explanations to use the returned ingredients and notes, preserve
quantities and steps, cite the Drink's source URL, and avoid invented details or unrelated recipes,
images, and sources. The card description identifies the photo and ingredients already displayed
while pointing to the returned notes for preparation instructions. These are model guidance;
they cannot enforce source exclusivity in ChatGPT's response. See OpenAI's
[server instructions](https://developers.openai.com/plugins/build/mcp-server#create-the-server) and
[component metadata](https://developers.openai.com/plugins/reference#component-resource-_meta-fields).

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
   the dev Drink page. Ask how to make it; verify the answer preserves the existing instructions
   and quantities, attributes the recipe to its Drink page, and adds no unrelated image or source.
   Check it does not invent recipe details such as preparation time. For a Drink without notes,
   check it reports that preparation instructions are unavailable.
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
