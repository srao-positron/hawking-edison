  Architecture & Infrastructure Questions:

  1. Authentication Strategy: You mentioned MCP OAuth issues. Should we:
    - Use Supabase Auth exclusively (eliminating AWS Cognito)?
Yes. No need to use Cognito
    - Support multiple auth providers (Google, GitHub, etc.)?
Yes. I have signed up for Supabase Pro. If you think we should be using another infrastructure provider that is easier for you to use, let me know and we will use this provider.
    - How important is preserving existing user accounts during migration?
Zero. No need to migrate.
  2. Data Migration:
    - Do you need to migrate existing data from DynamoDB/S3?
No.
    - Can we start fresh or is historical data preservation critical?
You can start fresh.
    - What's the timeline for sunset of the old system?
Immediately.
  3. Deployment Model:
    - Single Supabase project for all users (multi-tenant)?
Yes. I have setup the project. The information is stored in the file named "keys"
    - Separate projects per enterprise customer?
No.
    - Self-hosted vs. Supabase cloud?
Use Supabase cloud, unless it is easier to self host it.

  Feature Prioritization Questions:

  4. Core Use Cases: You mentioned several use cases. Please rank these by priority:
    - Decision support panels (1)
    - Message testing/improvement (political, marketing) (4)
    - Code review panels (2)
    - Research/ideation panels (3)
    - Survey functionality (5)
But remember, users are going to keep on coming up with use cases. So we're going to need to come up with some sort of flexible approach here. Almost like we come up with the tools to support their use case, and then they use a LLM on the fly to put the tools together to achieve their use case. The UX is smart enough to adapt to this flexibility.

  5. Tool System:
    - Should we support Python tools in addition to JavaScript/TypeScript?
Yes
    - Do you want visual tool creation (no-code)?
No. I think we just start with code. And have a prompt mechanism which will emit the code if the tool doesn't exist. And this means the system prompt in this feature has enough documentation that it teaches the LLM how to generate the right code.
    - Should tools be shareable between users/organizations?
Yes. 
  6. Agent Personalities:
    - Keep the social media import functionality?
Yes. But think of it like we have a "database" per each user. They dump the social media profile (all the text on the page) into this database. Then when they're specifying the agent, they say "I want a panel with five agents, with personalities like Sid Rao, Sally Smith, Doug Turnball, and Bill Miller." While constructing the system prompts for all of these agents, it queries the database (stored as embeddings) looking for Sid Rao, Sally Smith, etc. It would then find the social media profile of Sid Rao, any documents authored by Sid Rao, and any other information the user stored in the database about Sid Rao and then it uses a LLM to summarize a personality statement that can be fed into the system prompt. Make sense?
    - Focus more on attribute-based personalities?
We need to support it - but the use case I describe above is more important.
    - Should agents learn/evolve from interactions?
Absolutely. Each agent should have it's own database as well (an option). Them ore it interacts, the more panels, simulations it is involved in, the more it understands what it has been exposed to in the past.

  Technical Implementation Questions:

  7. Model Strategy:
    - Standardize on Claude Opus 4 as default?
Claude Opus 4 as the default. But users should be able to sub in for an agent OpenAI, Bedrock, and other agents.

We will need a key keeper/dictionary that enables the users to store various API keys. Ideally we support web based mechanisms of pulling these keys in so users are not copy and pasting keys all around.

    - Still support OpenAI models as fallback?

Yes, or if the user asks for them.

    - What about open-source models (Llama, Mistral)?

Through AWS Bedrock.

  8. Real-time Requirements:
    - Is streaming responses critical for all features?
Yes!

    - Acceptable latency for panel discussions?
As long as it shows that agents are thinking or are trying to do something, it is OK if they take as long as they need to. It can take hours, days if necessary. BTW, none of these long-lived processes shoudl be run out of the browser. And we should use a subscription/websocket based mechanism to update status and state.

    - Need for real-time collaboration (multiple users viewing same panel)?
Yes.

  9. Scale Expectations:
    - Expected number of concurrent users?
Initially? <10. After a month? <100. After a year? <1,000

    - Typical panel size (number of agents)?
<20

    - Message volume for simulations?
Between 200-1,000 agents at a time.

  User Experience Questions:

  10. Slack-style Interface:
    - Web-only or also native apps?
Web only to start with. We'll do native apps through web view. But we need to be respponsive and handle tablets and web apps.

There should be an unauthenticated marketing website and documentation site that you will maintain.

    - Mobile support required?
Mobile browser (tablet, phone).

    - Integration with actual Slack/Teams?
Not initially.

  11. API Design:
    - REST only or also GraphQL?
REST only for now. We're really looking to be able to support webhooks into existing process flows. So if people want to use panels for Code reviews grom GitHub, they should be able to do this. Or easily call a webhook from Slack - same concept.

    - Webhook support for integrations?
Just said webhook. So yes.

    - Rate limiting requirements?
Something simple so we don't get overloaded.

  12. Extension Strategy:
    - Keep browser extension for profile importing?
We need a browser extension, but now we want to be able to import anything on the web page into this user's "database." We then index it. So then when a user wants to use it to construct an agent, it is avaialble. But guess what, this is also knowledge that can be made available to agents as a tool. This allows Hawking Edison to start to build up a knowledge pool that can be used to inform agent personalities as well as be used by agents when trying to provide decision support. What we do in the extension is basically suck all the text out of the DOM (literally the entire HTML page) and send it in for indexing. It then gets converted into an embedded form, and then a LLM can use it as a document to create a system prompt for a personality.

    - Simplify to just use web APIs?
Yes

    - Other browser integrations needed?
Not for now. But keep in mind that we'll want to have one extension - if we choose to add more capabilities to the browser.


  Security & Compliance Questions:

  13. Data Privacy:
    - Any compliance requirements (GDPR, SOC2)?
Not for now, but in the future.

    - Data retention policies?
Not for now. But in the future.

    - Need for data isolation between organizations?
Not for now.

  14. API Security:
    - OAuth2 for API access?
Yes

    - API key management requirements?
Yes

    - IP whitelisting needs?
No

  Development Process Questions:

  15. Testing Requirements:
    - Unit tests only or also E2E?
End to end is the priority - feature. I don't need a lot of small unit tests. I really need to be able to test every major feature or function in the app.

    - Performance benchmarks needed?
No

    - Load testing requirements?
None for now

  16. Code Organization:
    - Monorepo or separate repos?
Monorepo

    - Separate packages for shared code?
Not necessary

    - Open source any components?
If we open source it, we'll open source the whole darn thing. If we want to pull something out, we'll pull it out in the future.

