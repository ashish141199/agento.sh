- [x] I need timestamp-based migrations in Drizzle. 
- [x] great, now the B setup is done, the PostgreSQL is done, the Drizzle is done, and the authentication is also done. 
Now in the home page I need a table of agents. The user can create as many agents as they want. Each agent will have a name, a description and a model. The model, by default it will be auto, but it can be anything from the open router API. Right now, do not care about the enums or do not care about the creation. Just focus on the database table. A very simple one right now. We will add more fields to it later.

And in the home page we need a data table for agents. It should be able to:
- Search
- Sort as well
- Click on one of the things to be able to go to the agent details page (that we will do later)

So currently the agent data table and also in the base layout (maybe in a (protected) group folder), where the protected folder will always be the one that is protected with the middleware and all of that already done, anything that is not in the protected folder can be accessed without being able to log in. 
So I need an app bar on the left, the name of the product will be written, and on the right a logout button will be shown. Not a logout button directly, but an avatar menu. If you click on that avatar menu, it will drop down a logout button to be shown. If you click on the logout button, you will be logged out. 

- [x] we need to make sure that all the buttons and all the clickable components are clickable when allowed to be clickable. When it is disabled, then it is okay, cursor pointer not available is okay, but when it is clickable and not disabled, it should have cursor pointer ideally. 


- [ ] I think we should create a separate model for AI models, or let's call it LLM models. And then have them linked to the agents. I think that is the correct approach. So each model will have a name and the model ID and then that will be linked to agents. Once you do create this, create 3 to 4 models. The first one would be auto. The id would be openrouter/auto. When we display it in the main page, I want the name to display it, not the model id. And in fact, there will be a different postgresql query view id for this, right?

Then create openai/gpt4o anthropic/claude-3.5-sonnet google/gemini-3.0-flash like that. The open router style I will be using, open router for this also. Once this is done in the backend, do install Vercel AI SDK, the latest version. Use context 7 MCP to see if there are any issues or you want to clarify from the documentation directly. And then I also do want to configure open router provider for the Vercel SDK. Write no code yet for this, specifically, we will deal with this later. 

- [ ] So let us have a "Create Agent" button on top right in the same line as the "Search Agents" column, and this will redirect to the "Create Agent" page. So the UI I want is basically as such that on the left 50-70% of the screen (or maybe let's try 50% to begin with), 50% of the screen will be the configuration kind of things, the form to create the AI agent. The right 50% will be a chatbot to use the AI agent. I need reusable components as much as you can. 
On the right, create a placeholder for now for the chatbot, but on the left, I have three tabs: general, instructions, and tools. Instructions and tools we can deal with later, but for the general, I need first name, the description field, and the model field, the AI model field that we need to use. So it will be a dropdown of all LLMs possible.
And then below that, there will be a next button. Once we click on next, the actual agent will be created with the name and the description, and the URL will be changed to the respective ID of that agent, so that then everything we do is just editing the basic agent. The instructions tab will have four questions. It will basically be: what does this agent do? How should it speak? What should it never do? Anything else it should know. These four questions will be putting into a JSON field. The answers to this will be put into a JSON field called as instructions config.

On the basis of this, we should compute our actual system prompt on the basis of the name and the description plus the instructions, so the combination of these would be the system prompt. We should very nicely do it.

Finally, there will be the tools tab. After we click on the previous button from the instructions tab, we go to the general tab. With the next button, if we click, we go to the tools tab. The tools tab we will just write "coming soon" for now. 

- [ ] the chatbot I basically want as such: it should be extremely easy to use and understand chat interface. Whenever we update the name of the description on the left, on the right we should immediately update the name and the description for the chat window. 

So there will be a chat window first inside which will have the chat messages and the text field. I want you to go to context 7 mcp and understand very clearly the communication that happens between Vercel AI SDK front end (because we also need to install that in the front end) so that we can have very easy-to-use chat function from the Vercel AI SDK and the communication that happens in the back end that we need to have. 

So in the backend, what we will have is corresponding, we will have the /chat or /api/chat (I don't know, you decide that endpoint), and over there we will have our own Vercel AI SDK with OpenRouter SDK already over there. It can be created into agent.service.ts or chat.service.ts, you decide. I think it is better to have it under agent.service.ts. And in that, we will use the model that has been specified in the model of that particular agent. We will use a system prompt from that particular agent. We will then use this endpoint in the frontend with the frontend useChat function that you must have already read from context 7 MCP: This function comes from the Vercel AI SDK. And then basically we will have the chat work like that, so I need the chat to be done like that. 

Also one very important thing to remember: each message is to be saved. Whatever agent message will come, it will be under is_agent boolean field. And then we'll show a real-time stream happening in frontend in the chat thing. 