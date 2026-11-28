# ChatGPT plugin package

Draft submission materials for drinks.fyi. The package points to the production MCP endpoint;
the server and card UI remain owned by [the MCP integration](../../docs/mcp.md).

`plugin.json` contains listing text and proposed review scenarios. `mcp.json` declares the remote
server and no authentication. `assets/icon.png` copies the site's 512px icon from
`app/assets/images/icon-512x512.png`. No skills or application source are bundled.
See OpenAI's [package format](https://developers.openai.com/plugins/build/plugins).

## Build the ZIP

From the repo root, with Bash and `zip` installed:

```sh
bash integrations/chatgpt/package.sh
unzip -l dist/drinks-fyi-chatgpt.zip
```

The archive contains only `plugin.json`, `mcp.json`, and `assets/icon.png`, at the plugin root.
Each build replaces the generated archive. Building does not deploy, upload, or submit the plugin.

## Before submission

The package is incomplete for public review. Required fields are omitted rather than pointing
to nonexistent pages. These tasks follow OpenAI's
[submission requirements](https://developers.openai.com/plugins/deploy/submission).

- [ ] Publish privacy and terms pages; add `privacyPolicyURL` and `termsOfServiceURL` to the listing.
      Describe actual data collection, recipients, retention, and user controls in the privacy policy;
      confirm hosting/CDN logging before making those statements. See
      [privacy requirements](https://developers.openai.com/plugins/plugin-guidelines#privacy-policy).
- [ ] Confirm the GitHub Issues URL is the intended public support channel.
- [ ] Complete individual publisher verification and confirm `developerName` matches that identity.
- [ ] Select an available dashboard category and add `category` to the listing.
- [ ] Confirm country availability in the dashboard before publication.
- [ ] Release the final MCP implementation to `https://drinks.fyi/mcp` through
      [the release workflow](../../RELEASING.md).
- [ ] Reconcile review scenarios with the final tools and UI. Confirm Paper Plane has preparation
      notes, coffee has multiple Published matches, and the no-match query returns none. Replace
      prompts if production data differs. Run every scenario in ChatGPT against production.
- [ ] Record the scenarios, including the follow-up conversation, at narrow and wide card widths;
      add a reviewer-accessible `review.demo_recording_url`.
- [ ] Build and upload the ZIP, complete the portal's domain-verification challenge, and connect
      the production MCP server with no authentication.
- [ ] Resolve package/tool scan findings, complete policy attestations, and submit for review.
- [ ] After approval, publish and use the directory URL for an "Add to ChatGPT" site link. See
      [directory links](https://developers.openai.com/plugins/deploy/app-review#discovery).

Review scenarios describe intended behavior; they are not evidence of passing ChatGPT tests.
Update their expected tools and results in place as the MCP contract evolves. The live endpoint
is evaluated independently of the Git branch holding this package.
