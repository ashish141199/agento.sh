
- [x] the chatbot I basically want as such: it should be extremely easy to use and understand chat interface. Whenever we update the name of the description on the left, on the right we should immediately update the name and the description for the chat window. 

So there will be a chat window first inside which will have the chat messages and the text field. I want you to go to context 7 mcp and understand very clearly the communication that happens between Vercel AI SDK front end (because we also need to install that in the front end) so that we can have very easy-to-use chat function from the Vercel AI SDK and the communication that happens in the back end that we need to have. 

So in the backend, what we will have is corresponding, we will have the /chat or /api/chat (I don't know, you decide that endpoint), and over there we will have our own Vercel AI SDK with OpenRouter SDK already over there. It can be created into agent.service.ts or chat.service.ts, you decide. I think it is better to have it under agent.service.ts. And in that, we will use the model that has been specified in the model of that particular agent. We will use a system prompt from that particular agent. We will then use this endpoint in the frontend with the frontend useChat function that you must have already read from context 7 MCP: This function comes from the Vercel AI SDK. And then basically we will have the chat work like that, so I need the chat to be done like that. 

Also one very important thing to remember: each message is to be saved. Whatever agent message will come, it will be under is_agent boolean field. And then we'll show a real-time stream happening in frontend in the chat thing. 

- [x] Auto token refreshing
- [x] Tools
    - [x] Delete tool is not working
    - [x] Edit tool is not working - dialog is opening but I don't see any of the values of that particular tool come inside the form. 
    - [x] The tools that we are creating is not really going to the agent. So when I create a tool and when I save it, and when I speak with the chat agent on the right, when I ask you to call that particular tool, it says that it is not able to find that tool, basically meaning that that tool is not accessible. You'll have to check agent.service.ts file. 
    - [x] I don't think request body is something that needs to be in advanced options. I think it can be outside of advanced options, just below the URL and method fields, but probably it can be only enabled for all other methods which are not GET. Maybe. 
    - [x] The width of the method drop-down can be increased because there seems a bit of significant gap between the method drop-down and the URL text field. 
    - [ ]   I want to understand how interpolation is working in terms of the request body placeholder which you have mentioned. How is the interpolation working exactly and have we implemented that? 


Misc
- [ ] Dropdown background needs to be white / consistent with text fields


- [ ] all right, great. So the last part which I want for after everything is done, or you can just add a publish button or something on the top right in the same line as the title in the description for the agents page for the create or update agents page, whereupon clicking that button you can publish it. 

- [ ] So the URL is not actually opening even locally, so that must be accessible and the same chat component that we have should also be over there as the full screen kind of thing. Also, that will be a publicly accessible URL but it can only be able to chat only when the user is logged in. That is one thing.

Also, we need some redirect URL logic as well for that. Once the user comes there and then sends a message immediately, it's checked if the user is not authenticated, he's redirected to the login page. At that time, we need the redirect URL logic in the get parameter or something like that. 

- [ ] also, I think for the position, the default position must be 'fit to parent' or something like that. Maybe some better words, maybe 'expanded' or something like that. 

That will basically mean that in whichever container or parent you put it to, it will just do 100% width and 100% height. 