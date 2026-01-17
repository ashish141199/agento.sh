
- [ ] the chatbot I basically want as such: it should be extremely easy to use and understand chat interface. Whenever we update the name of the description on the left, on the right we should immediately update the name and the description for the chat window. 

So there will be a chat window first inside which will have the chat messages and the text field. I want you to go to context 7 mcp and understand very clearly the communication that happens between Vercel AI SDK front end (because we also need to install that in the front end) so that we can have very easy-to-use chat function from the Vercel AI SDK and the communication that happens in the back end that we need to have. 

So in the backend, what we will have is corresponding, we will have the /chat or /api/chat (I don't know, you decide that endpoint), and over there we will have our own Vercel AI SDK with OpenRouter SDK already over there. It can be created into agent.service.ts or chat.service.ts, you decide. I think it is better to have it under agent.service.ts. And in that, we will use the model that has been specified in the model of that particular agent. We will use a system prompt from that particular agent. We will then use this endpoint in the frontend with the frontend useChat function that you must have already read from context 7 MCP: This function comes from the Vercel AI SDK. And then basically we will have the chat work like that, so I need the chat to be done like that. 

Also one very important thing to remember: each message is to be saved. Whatever agent message will come, it will be under is_agent boolean field. And then we'll show a real-time stream happening in frontend in the chat thing. 

- [x] Auto token refreshing
- [ ] Have 
