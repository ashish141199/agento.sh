- [ ] Now we need to work on the knowledge bit where we train the AI on certain knowledge. I want you to create separate models for storing knowledge, or we can call it data source or knowledge source. 

Basically, these can be any kind of knowledge. It can be a website, either it can be a website or it can be a PDF document. It can be an excel sheet; it can be a link for the website; or it can also be an integration to probably notion or google drive which can be retrained on demand from these particular data sources.

This model needs to have provision for this and We need a way to add these data sources directly from the agent form which we have. 

- [ ] Under the agent form, we have a tab of instructions. In instructions, under the four questions, we have knowledge which is shown as optional. There, we need to add knowledge, and after adding knowledge, we will mention:

- We can also have a way to drag and drop multiple files.
- We can also add a link.
- We can also add going forward later (not right now), later we will also be able to add a Google Drive integration or a Notion integration to pull something directly from there.

There must also be a way to upload from Google Drive with the Google Drive picker, and all of that, but this will be done later, not right now. You need to also think about this and keep the code extensible that way. 