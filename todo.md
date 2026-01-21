- [ ] Now we need to work on the knowledge bit where we train the AI on certain knowledge. I want you to create separate models for storing knowledge, or we can call it data source or knowledge source. 

Basically, these can be any kind of knowledge. It can be a website, either it can be a website or it can be a PDF document. It can be an excel sheet; it can be a link for the website; or it can also be an integration to probably notion or google drive which can be retrained on demand from these particular data sources.

This model needs to have provision for this and We need a way to add these data sources directly from the agent form which we have. 

- [ ] Under the agent form, we have a tab of instructions. In instructions, under the four questions, we have knowledge which is shown as optional. There, we need to add knowledge, and after adding knowledge, we will mention:

- We can also have a way to drag and drop multiple files.
- We can also add a link.
- We can also add going forward later (not right now), later we will also be able to add a Google Drive integration or a Notion integration to pull something directly from there.

There must also be a way to upload from Google Drive with the Google Drive picker, and all of that, but this will be done later, not right now. You need to also think about this and keep the code extensible that way. 

- [ ] Now, ideally what is supposed to happen is: when any document is uploaded from the website or a website link is uploaded, we must chunk it into meaningful pieces and then store them properly in a data source chunk.

Whatever you do, whatever you decide as a database name is, and we will also embed them. We will create embeddings for them using RAG, using OpenAI's embedding models. I will provide the exact models to use, but we will basically embed it and then store it using PG vector. We will store the embeddings. These will be 1024-size embeddings

- [ ] And then that allows the option to have a way to retrieve knowledge for the user's agent. So a user agent can basically just simply search for these knowledge. There will be two types of searches:

1. One would be having a separate tool to search the knowledge (which will ideally be the default one). A tool to search knowledge.

2. Then the other mode would be to directly feed knowledge at the time of input. Whatever the input, whatever the user message is to the chat, it will be automatically, the user message will also be embedded and then queried to find the top X relevant chunks or something like that.

There will be two modes, of course: one is cost-effective, one is cost-efficient, and the other one is a bit costlier approach. The sending it every time is a bit costlier approach, what I feel. 

- [ ] There will also be an option to retrain or train again, and that will basically rag it up again, embed everything again. We will store these data sources, we will store these documents as well and data sources as well.

Retrain properly going forward. There will also be configurable ways to change a bit about chunking and all of that, but I don't want to get into it right now. Use whatever is industry standard as of now. 

- [ ] I also want you to set up S3 storage so there will be an S3 service you can refer to ~/dev/platoona-fastify for a file named s3.service.ts. You can also take the credentials from the same directory's.env file for AWS S3.

You can store this here and I need an implementation to what we have over there because it becomes easy for us to store all these documents in S3 whenever required. I hope we'll be able to have proper organization in terms of folders, something like each agent will have its own folder under which it will be saved, something like that. 

For the AWS S3 settings, you may use the same region and everything, but instead of the name Platoona for S3, you'll have to use autive as the slug/name


- [ ] In the knowledge we should also need a delete confirmation dialog when we click on the delete icon. We already have that component without. 
- [ ] Also Along with the ready or processing or fail status and the number of chunks, should we also show the number of pages or the file size as well in the items very minimally? 
- [ ] Also, add more sources in the dialogue where we have the option We need to add more sources, drop files or click to upload, or we can add the website. That should not be visible. 

We should first have an "Add new" button or "Add more sources" button at the bottom and only if i click on that then that must be opened.