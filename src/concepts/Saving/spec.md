## concept **Saving** [User, Item]

**purpose**  
let a user mark/unmark any item to revisit later

**principle**  
if **Saved(user, item)** exists, then that item should appear in the user’s saved list; removing it deletes the single source of truth for that saved state.

**state**  
a set of **Saved** with  
- a user **User**  
- an item **ItemId**  
- a createdAt **DateTime**

**actions**  
**saveItem**(user: User, item: ItemId) : Empty | { error: String }  
- requires user exists and **Saved(user, item)** not present  
- effects create **Saved(user, item, createdAt := now)**

**unsaveItem**(user: User, item: ItemId) : Empty | { error: String }  
- requires **Saved(user, item)** exists  
- effects delete that **Saved**

**queries**  
**ListSaved**(user: User, limit?: Number) : (item: ItemId)  
- requires user exists  
- effects return up to `limit` items saved by `user`, ordered by `createdAt` descending
