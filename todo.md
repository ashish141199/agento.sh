
- [ ] the chatbot I basically want as such: it should be extremely easy to use and understand chat interface. Whenever we update the name of the description on the left, on the right we should immediately update the name and the description for the chat window. 

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


{"state":{"user":{"id":"f03595d5-1aa8-42e4-9544-d73620f151be","email":"ashish@kulp.ai","fullName":"Ashish","imageUrl":"https://lh3.googleusercontent.com/a-/ALV-UjXfef1DLja3geE4-Bl0jr-QIWEqyNxVPGjxy62F6bXoQX_k5r7sZWjD1Y91VZFhKa76wZKEzUUcU0gHUmolv-2blBXxyycfao-QsnLDLf8Ru2IVcqob9cjyddc3iVG49dnm_wgfd7HrOZTE44tD61_X_RZYPQSBKfbUsgEF1zTLtoBC-8e-X7OLIFhMwmMkchWTzI0IPsOAwhQsCdsyqKPyq53wjP_uZERujgvFAaMbIsV4RyrfGDiK-Rs0VcaybWuU_oBe5GPFzTv5Olg4h8qbU6Qg4CJgcuS3hUbzuOEahsAULr_OgPp3mPsvS3wpJUOZ3fPOz9xtX_MLDRo26OV3E23COZnYg7QqWK-vo-ubDjjZTvJj6Iw9CEm355klU0SIwZkG32XV7KLpbRnYQKhZHTCFDLfiKsj3yPgu0sDR94b61_CqT_5vw55Ljt6vu8Eh5gja0-g_Cy_LfI3H5w8bEzozQLAtuVSh0V41HDXEeN_5XLfWcB3FOAw430v8EGJ9ETIFfUHYdvwg0xD-T7m_Tf7YBD6Evgdc4-vohUc9O3z0hDPdMEVIoEc5XdxLENeLHv7L_HSkdWhYn4CaFhfHuSsM-9E4igASecUCXClSYVGpODw1ARNsDkIuhWmLDXIRZHXiz2nhPhHLm4hNzz_DiF94vEiAFPi8ySPMTRHUa3VPbgIKl6r8aIdk-jlgohixz7S93S4I7iU-W4uQEGhsSKuD4XtZRUp8ZGQXxsTcjcBnAGcYTjXqcm9vtF0KopkHzcUwAV8bQfqBZ8Oc0w0UxIlH9r6B1LqUFMADrbq7MIKf4Ax4J6GBy-PhD1fu3rtVoYkf-op2-wM5yvmnnjQ7krF0y89xViP7Jmr1xLYulwWHJci6gsOHXNJSNET5NMiRCQBbs1mUhlrXbpLdxZfriOx1ZTR54fDyTa9DNpk-19U0NUrnJmRDMUTVOdmqyDIPlZCIaWj7HI7vyz4smQXa6Ribw0ZjRaQ6yTfHzU98SBLh0l09Vh-SGyLPYePj03bo8FQ4VF5-2Bx6g-x7bnC2RVjVYkMPlvQBV3XyCE3ytRyqqGfXMvE=s96-c"},"accessToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmMDM1OTVkNS0xYWE4LTQyZTQtOTU0NC1kNzM2MjBmMTUxYmUiLCJlbWFpbCI6ImFzaGlzaEBrdWxwLmFpIiwiaWF0IjoxNzY4NzE1NdE3LCJleHAiOjE3Njg3MTkyMTd9.vzGw1zFTe9ZVQqWu-l5xR79WrtngkRt2RD9IPM2e4hI","isAuthenticated":true},"version":0}