- [ ] I need timestamp-based migrations in Drizzle. 
- [ ] great, now the B setup is done, the PostgreSQL is done, the Drizzle is done, and the authentication is also done. 
Now in the home page I need a table of agents. The user can create as many agents as they want. Each agent will have a name, a description and a model. The model, by default it will be auto, but it can be anything from the open router API. Right now, do not care about the enums or do not care about the creation. Just focus on the database table. A very simple one right now. We will add more fields to it later.

And in the home page we need a data table for agents. It should be able to:
- Search
- Sort as well
- Click on one of the things to be able to go to the agent details page (that we will do later)

So currently the agent data table and also in the base layout (maybe in a (protected) group folder), where the protected folder will always be the one that is protected with the middleware and all of that already done, anything that is not in the protected folder can be accessed without being able to log in. 
So I need an app bar on the left, the name of the product will be written, and on the right a logout button will be shown. Not a logout button directly, but an avatar menu. If you click on that avatar menu, it will drop down a logout button to be shown. If you click on the logout button, you will be logged out. 

- [ ] we need to make sure that all the buttons and all the clickable components are clickable when allowed to be clickable. When it is disabled, then it is okay, cursor pointer not available is okay, but when it is clickable and not disabled, it should have cursor pointer ideally. 